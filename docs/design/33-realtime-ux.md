# 33 — Realtime UX

> **Scope:** Tương tác realtime qua WebSocket — subscribe event, hiển thị progress, handle disconnect, optimistic update.
>
> **Context:** Audit pipeline mất 8-30s (single) hoặc 5-30 phút (site). UX phải cho user thấy tiến độ + có thể rời trang rồi quay lại.

---

## 1. Vấn đề cần giải

### 1.1 User journey

```
User click "Bắt đầu audit" → POST /audits → 201 auditId (<300ms)
  │
  ▼
  Redirect /audits/:id
  │
  ▼
  Xem progress realtime
  │
  ├─ 8-30s (single): user đợi ngay tại trang → thấy bar tăng
  ├─ 5-30 phút (site): user có thể rời trang, làm việc khác → quay lại
  │
  ▼
  audit:completed → refresh UI → xem kết quả
```

### 1.2 Requirements

| Yêu cầu | Giải pháp |
|---|---|
| Hiển thị % tiến độ + stage name realtime | WebSocket subscribe `audit:progress` |
| User rời trang rồi quay lại vẫn thấy đúng trạng thái | Khi mount, fetch `/audits/:id` để lấy current status + progress |
| WebSocket disconnect (mạng chập) | Polling fallback `/audits/:id/status` mỗi 3s |
| Nhiều audit cùng chạy | Subscribe nhiều room cùng lúc |
| Notification khi audit khác hoàn thành (không ở trang chi tiết) | Toast "Audit cho example.com đã xong" |
| Giảm request thừa khi user đóng tab | `audit:unsubscribe` khi unmount |

---

## 2. Kiến trúc client

```
┌─────────────────────────────────────────────────────────┐
│                    Singleton Socket                     │
│  (lib/ws/client.ts — tạo 1 connection cho cả app)      │
│                                                         │
│  Connect khi login → Disconnect khi logout              │
│  Auto-reconnect với exponential backoff                 │
└────────────────┬───────────────────┬────────────────────┘
                 │                   │
        ┌────────▼────────┐  ┌──────▼──────────┐
        │ useAudit-       │  │ useGlobal-      │
        │ Realtime        │  │ AuditListener   │
        │ (per audit page)│  │ (root layout)   │
        └─────────────────┘  └─────────────────┘
          Subscribe 1 room    Listen all events
          → Update UI         → Toast nếu audit khác xong
```

---

## 3. `lib/ws/client.ts` — singleton socket

```typescript
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../auth/store';

let socket: Socket | null = null;
let reconnectAttempts = 0;

export function getSocket(): Socket {
  if (socket?.connected) return socket;

  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error('Cannot create socket without auth token');

  socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,          // Start 1s
    reconnectionDelayMax: 10000,       // Max 10s
    randomizationFactor: 0.3,
  });

  socket.on('connect', () => {
    reconnectAttempts = 0;
    console.log('[WS] connected');
  });

  socket.on('disconnect', (reason) => {
    console.warn('[WS] disconnected:', reason);
    // Nếu server kick (token expired), thử refresh
    if (reason === 'io server disconnect') {
      tryRefreshAndReconnect();
    }
  });

  socket.on('reconnect_attempt', (attempt) => {
    reconnectAttempts = attempt;
    console.log(`[WS] reconnect attempt ${attempt}`);
  });

  socket.on('reconnect_failed', () => {
    console.error('[WS] reconnect failed after 10 attempts');
    toast.error('Mất kết nối realtime. Đang chuyển sang chế độ polling.');
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
```

**Khi nào gọi?**
- `getSocket()` lần đầu khi user vào trang audit detail (lazy).
- `disconnectSocket()` khi logout.

**Auto-reconnect pattern:**
- Attempt 1: 1s
- Attempt 2: ~2s (với jitter)
- ...
- Attempt 10: ~10s
- Sau đó: fail → toast + switch polling.

---

## 4. Hook `useAuditRealtime`

Consume bởi `/audits/:id` page.

```typescript
// lib/ws/hooks.ts
interface ProgressEvent {
  auditId: string;
  progress: number;       // 0-100
  stage: string;
  message?: string;
}

interface CompletedEvent {
  auditId: string;
  finalScore: number;
}

interface FailedEvent {
  auditId: string;
  error: string;
}

export function useAuditRealtime(
  auditId: string,
  handlers: {
    onProgress?: (e: ProgressEvent) => void;
    onCompleted?: (e: CompletedEvent) => void;
    onFailed?: (e: FailedEvent) => void;
  }
) {
  useEffect(() => {
    const socket = getSocket();
    socket.emit('audit:subscribe', { auditId });

    const onProgress = (data: ProgressEvent) => {
      if (data.auditId === auditId) handlers.onProgress?.(data);
    };
    const onCompleted = (data: CompletedEvent) => {
      if (data.auditId === auditId) handlers.onCompleted?.(data);
    };
    const onFailed = (data: FailedEvent) => {
      if (data.auditId === auditId) handlers.onFailed?.(data);
    };

    socket.on('audit:progress', onProgress);
    socket.on('audit:completed', onCompleted);
    socket.on('audit:failed', onFailed);

    return () => {
      socket.emit('audit:unsubscribe', { auditId });
      socket.off('audit:progress', onProgress);
      socket.off('audit:completed', onCompleted);
      socket.off('audit:failed', onFailed);
    };
  }, [auditId]);
}
```

### Sử dụng

```tsx
// app/(app)/audits/[id]/page.tsx
export default function AuditDetailPage({ params }) {
  const { id } = params;
  const queryClient = useQueryClient();
  const { data: audit, refetch } = useAudit(id);
  const [progress, setProgress] = useState(audit?.progress ?? 0);
  const [stage, setStage] = useState(audit?.stage ?? '');

  useAuditRealtime(id, {
    onProgress: (e) => {
      setProgress(e.progress);
      setStage(e.stage);
    },
    onCompleted: () => {
      queryClient.invalidateQueries({ queryKey: ['audits', 'detail', id] });
      toast.success('Audit hoàn thành!');
    },
    onFailed: ({ error }) => {
      queryClient.invalidateQueries({ queryKey: ['audits', 'detail', id] });
      toast.error(`Audit thất bại: ${error}`);
    },
  });

  if (audit?.status === 'completed') return <CompletedAuditView audit={audit} />;
  if (audit?.status === 'failed') return <FailedAuditView audit={audit} />;
  return <RealtimeAuditView progress={progress} stage={stage} audit={audit} />;
}
```

---

## 5. Global audit listener (background)

Khi user ở page khác (vd `/dashboard`), vẫn muốn biết audit khác hoàn thành → toast.

```tsx
// app/(app)/layout.tsx
'use client';
export default function AppLayout({ children }) {
  useGlobalAuditListener();

  return (
    <>
      <Sidebar />
      <Header />
      <main>{children}</main>
    </>
  );
}

// lib/ws/hooks.ts
export function useGlobalAuditListener() {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const socket = getSocket();

    // Không subscribe specific room — lắng general events
    // Server cần broadcast tới user's personal room khi có audit thay đổi

    const onAnyCompleted = (e: CompletedEvent) => {
      toast.success(
        <div>
          <strong>Audit hoàn thành</strong>
          <p>Điểm: {e.finalScore}</p>
          <Button size="sm" onClick={() => router.push(`/audits/${e.auditId}`)}>
            Xem
          </Button>
        </div>,
        { duration: 8000 }
      );
      queryClient.invalidateQueries({ queryKey: ['audits'] });
    };

    socket.on('audit:completed', onAnyCompleted);
    return () => { socket.off('audit:completed', onAnyCompleted); };
  }, []);
}
```

**Lưu ý server-side:** hiện gateway emit tới room `audit:{auditId}`. Để global listener nhận được, user cần subscribe room `user:{userId}` cũng được emit cùng event. Cần thêm logic ở gateway hoặc client tự subscribe từng audit đang pending.

**Alternative đơn giản:** trên layout, fetch `GET /audits?status=pending,crawling,analyzing,reporting` → với mỗi audit, subscribe room của nó.

---

## 6. Polling fallback

Khi WS disconnect + reconnect fail, switch sang polling `/audits/:id/status` mỗi 3s.

```tsx
function AuditDetailPage({ id }) {
  const [wsConnected, setWsConnected] = useState(true);

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setWsConnected(true);
    const onDisconnect = () => setWsConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // Polling khi WS down + audit đang chạy
  const isInProgress = audit?.status && ['pending', 'crawling', 'analyzing', 'reporting'].includes(audit.status);
  useQuery({
    queryKey: ['audits', 'status', id],
    queryFn: () => api.get(`audits/${id}/status`).json<AuditStatus>(),
    refetchInterval: !wsConnected && isInProgress ? 3000 : false,
    onSuccess: (data) => {
      setProgress(data.progress);
      setStage(data.stage);
    },
  });

  return (
    <>
      {!wsConnected && <Banner>Mất kết nối realtime. Đang polling mỗi 3s.</Banner>}
      <AuditContent ... />
    </>
  );
}
```

---

## 7. UX state mapping

### 7.1 Progress bar UI

| Stage | Progress % | Label tiếng Việt |
|---|---|---|
| `pending` | 0 | Đang chờ |
| `crawling` | 20-40 | Đang tải trang |
| `analyzing` | 40-66 | Đang phân tích SEO |
| (song song) | 50-66 | Đang phân tích từ khoá |
| `reporting` | 85 | Đang tổng hợp báo cáo |
| `completed` | 100 | Hoàn thành ✓ |
| `failed` | — | Thất bại ✗ |

```tsx
function ProgressSteps({ stage }) {
  const steps = [
    { key: 'crawling', label: 'Tải trang' },
    { key: 'analyzing', label: 'Phân tích' },
    { key: 'reporting', label: 'Tổng hợp' },
    { key: 'completed', label: 'Hoàn thành' },
  ];
  const currentIndex = steps.findIndex(s => s.key === stage);

  return (
    <div className="flex items-center">
      {steps.map((step, i) => (
        <Fragment key={step.key}>
          <StepDot
            done={i < currentIndex}
            active={i === currentIndex}
            label={step.label}
          />
          {i < steps.length - 1 && <Connector done={i < currentIndex} />}
        </Fragment>
      ))}
    </div>
  );
}
```

### 7.2 Estimated time

Hiển thị ước tính còn lại dựa trên stage:

```tsx
function EstimatedTime({ stage }) {
  const remaining = {
    crawling: '10-25 giây',
    analyzing: '3-5 giây',
    reporting: '2-3 giây',
  }[stage] ?? 'đang tính';

  return (
    <p className="text-sm text-muted">
      <Icon>schedule</Icon> Còn ~{remaining}
    </p>
  );
}
```

### 7.3 Site mode progress

Với site audit, progress tăng theo số URL đã xong:

```
20% — discover sitemap
20-90% — audit N URLs (linear, 70% window)
90-100% — aggregate
```

Message: `"Đã audit 34/100 URL"`.

---

## 8. Optimistic updates

### 8.1 Tạo audit

```typescript
const { mutate: createAudit } = useMutation({
  mutationFn: api.createAudit,
  onMutate: async (input) => {
    await queryClient.cancelQueries({ queryKey: ['audits'] });
    const tempId = 'temp-' + Date.now();
    const optimistic = {
      id: tempId,
      url: input.url,
      domain: new URL(input.url).hostname,
      status: 'pending',
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    queryClient.setQueryData(['audits', 'list'], (old: any) => ({
      ...old,
      data: [optimistic, ...old.data],
    }));
    return { tempId };
  },
  onSuccess: (real, _input, ctx) => {
    // Replace temp với real
    queryClient.setQueryData(['audits', 'list'], (old: any) => ({
      ...old,
      data: old.data.map(a => a.id === ctx.tempId ? real : a),
    }));
    router.push(`/audits/${real.auditId}`);
  },
  onError: (_err, _input, ctx) => {
    // Remove temp
    queryClient.setQueryData(['audits', 'list'], (old: any) => ({
      ...old,
      data: old.data.filter(a => a.id !== ctx?.tempId),
    }));
    toast.error('Không thể tạo audit');
  },
});
```

**Hiệu ứng user:** bấm "Bắt đầu audit" → row xuất hiện ngay trong list (status=pending, greyed out) → khi backend response, update status thật. Nếu lỗi, row biến mất + toast.

### 8.2 Delete audit

```typescript
const { mutate: deleteAudit } = useMutation({
  mutationFn: api.deleteAudit,
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['audits'] });
    const previous = queryClient.getQueryData(['audits', 'list']);
    queryClient.setQueryData(['audits', 'list'], (old: any) => ({
      ...old,
      data: old.data.filter(a => a.id !== id),
    }));
    return { previous };
  },
  onError: (_err, _id, ctx) => {
    queryClient.setQueryData(['audits', 'list'], ctx?.previous);
    toast.error('Không thể xoá');
  },
});
```

### 8.3 Admin rule weight update

Update UI slider ngay khi user kéo → debounce save → server confirm → sync lại state nếu lỗi.

---

## 9. Connection state UI

Indicator ở góc phải header:

```tsx
function WsStatusIndicator() {
  const [state, setState] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');

  useEffect(() => {
    const socket = getSocket();
    socket.on('connect', () => setState('connected'));
    socket.on('disconnect', () => setState('disconnected'));
    socket.on('reconnect_attempt', () => setState('reconnecting'));
  }, []);

  return (
    <Tooltip content={getTooltip(state)}>
      <div className={cn(
        'w-2 h-2 rounded-full',
        state === 'connected' && 'bg-green-500',
        state === 'disconnected' && 'bg-red-500',
        state === 'reconnecting' && 'bg-amber-500 animate-pulse',
      )} />
    </Tooltip>
  );
}
```

---

## 10. Edge cases

### 10.1 Token expired khi socket đã connect

- Token expire sau 15 phút. Server kick socket.
- Client `disconnect` handler → gọi `tryRefresh()` → nếu thành công, `socket.auth = { token: newToken }; socket.connect()`.
- Nếu refresh fail → logout + redirect login.

### 10.2 User F5 trong khi audit đang chạy

- Page mount lại → fetch `/audits/:id` trả state hiện tại (vd `status: analyzing, progress: 55`).
- WS subscribe lại room → nhận tiếp event tiếp theo.
- Không mất trạng thái.

### 10.3 Audit đã xong trước khi client subscribe

Race condition:
- Client click submit → redirect → chưa kịp connect WS → audit đã xong.
- Page mount fetch `/audits/:id` → thấy `status: completed` → render `<CompletedAuditView>` luôn.

### 10.4 Nhiều tab mở cùng 1 audit

- Mỗi tab có 1 socket riêng (browser quy định).
- Cả 2 tab subscribe cùng room → nhận cùng event.
- Không ảnh hưởng, chỉ tốn chút bandwidth.

### 10.5 Server restart giữa audit

- Redis giữ BullMQ queue + pub/sub state → restart không mất job.
- WS disconnect → client reconnect → subscribe lại.
- Nhưng các event published trong lúc server restart bị mất (Redis pub/sub at-most-once).
- **Mitigation:** khi reconnect, client fetch lại `/audits/:id/status` để sync (có endpoint này rồi).

---

## 11. Performance

### 11.1 Tiết kiệm bandwidth

- Progress event có thể đến rất nhanh (vd site audit 500 URL → 500 progress event). Gateway nên **throttle** client side: chỉ update UI mỗi 200ms dù nhiều event hơn.

```tsx
const throttledSetProgress = useThrottledCallback(setProgress, 200);
```

### 11.2 Tiết kiệm re-render

- Progress state trong local state của component, không trong TanStack Query cache → không trigger re-render sibling.
- Dùng `useSyncExternalStore` cho shared state giữa nhiều components (vd progress banner).

### 11.3 Memory leak khi multi-subscribe

- Đảm bảo `off()` trong cleanup để event handler không accumulate.
- Dùng AbortController pattern nếu dùng native `addEventListener`.

---

## 12. Ví dụ UI hoàn chỉnh `<RealtimeAuditView>`

```tsx
function RealtimeAuditView({ audit, progress, stage }: Props) {
  const remainingTime = estimateRemaining(stage);

  return (
    <div className="space-y-6">
      <Card variant="hero" className="p-8 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="flex items-start justify-between">
          <div>
            <Badge className="mb-3">Đang audit</Badge>
            <h1 className="text-2xl font-headline font-bold mb-2">{audit.domain}</h1>
            <p className="text-slate-300 text-sm">{audit.url}</p>
          </div>
          <Button variant="ghost" onClick={() => router.back()}>
            <Icon>arrow_back</Icon> Về danh sách
          </Button>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">{vietnameseStage(stage)}...</span>
            <span className="text-sm text-slate-300">{progress}%</span>
          </div>
          <ProgressBar value={progress} animated className="h-2" />
          <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
            <ProgressSteps stage={stage} />
            <EstimatedTime remaining={remainingTime} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live log</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <LogList entries={logEntries} />
          </ScrollArea>
        </CardContent>
      </Card>

      <Alert variant="info">
        <Icon>lightbulb</Icon>
        <AlertTitle>Đang bận?</AlertTitle>
        <AlertDescription>
          Bạn có thể đóng trang và quay lại sau. Chúng tôi sẽ lưu kết quả.
        </AlertDescription>
      </Alert>
    </div>
  );
}
```

---

## 13. Testing realtime

### 13.1 Unit test

Mock `getSocket` + `useAuditRealtime`:

```typescript
test('updates progress on audit:progress event', () => {
  const mockSocket = createMockSocket();
  vi.mock('../ws/client', () => ({ getSocket: () => mockSocket }));

  const { result } = renderHook(() => useAuditRealtime('audit-123', {...}));

  act(() => {
    mockSocket.emit('audit:progress', { auditId: 'audit-123', progress: 50, stage: 'analyzing' });
  });

  expect(result.current.progress).toBe(50);
});
```

### 13.2 E2E test (Playwright)

```typescript
test('audit progress updates in realtime', async ({ page }) => {
  await page.goto('/audits/new');
  await page.fill('[name=url]', 'https://example.com');
  await page.click('text=Bắt đầu audit');

  // Wait redirect
  await page.waitForURL(/\/audits\/.+/);

  // Wait for progress to reach 50%+
  await page.waitForSelector('[data-progress-min="50"]', { timeout: 30000 });

  // Wait for completion
  await page.waitForSelector('text=Hoàn thành', { timeout: 30000 });

  // Assert score visible
  await expect(page.locator('[data-testid=score-gauge]')).toBeVisible();
});
```

---

## 14. File tham chiếu backend

| File | Purpose |
|---|---|
| [apps/gateway/src/infra/websocket/audit.gateway.ts](../../apps/gateway/src/infra/websocket/audit.gateway.ts) | WebSocket server impl |
| [apps/gateway/src/infra/websocket/progress-subscriber.service.ts](../../apps/gateway/src/infra/websocket/progress-subscriber.service.ts) | Redis → WS bridge |
| [21-api-contracts.md §6](21-api-contracts.md) | WS event contract |
| [22-job-pipeline.md §5](22-job-pipeline.md) | Khi nào event được publish |

---

## 15. Đi tiếp

- Page specs dùng realtime → [31-page-specs.md §11](31-page-specs.md) (Audit detail)
- Mockup tham khảo → [34-ui-mockup-mapping.md](34-ui-mockup-mapping.md)
