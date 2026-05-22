'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { listApiKeys, createApiKey, revokeApiKey } from '@/lib/api-keys';
import { ApiError } from '@/lib/api';
import type { ApiKeyDto, ApiKeyEnvironment, CreateApiKeyResponse } from '@/types/api';

export default function ApiKeysPage() {
  const { client } = useAuth();
  const qc = useQueryClient();

  const keysQuery = useQuery<ApiKeyDto[]>({
    queryKey: ['api-keys'],
    queryFn: () => listApiKeys(client),
  });

  const [showCreate, setShowCreate] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState('');
  const [newKeyEnv, setNewKeyEnv] = React.useState<ApiKeyEnvironment>('test');
  const [plaintext, setPlaintext] = React.useState<string | null>(null);

  const createMut = useMutation<
    CreateApiKeyResponse,
    Error,
    { name: string; environment: ApiKeyEnvironment }
  >({
    mutationFn: (input) => createApiKey(client, input),
    onSuccess: (res) => {
      setPlaintext(res.plaintext);
      setNewKeyName('');
      setShowCreate(false);
      void qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Create failed'),
  });

  const revokeMut = useMutation<void, Error, string>({
    mutationFn: (id) => revokeApiKey(client, id),
    onSuccess: () => {
      toast.success('Key revoked');
      void qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Revoke failed'),
  });

  const rows = keysQuery.data ?? [];

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">API keys</h1>
          <p className="text-sm text-muted-foreground">
            Secret keys để gọi /api/v1/public/*. Plaintext chỉ hiển thị một lần khi tạo.
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>+ Create key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Đặt tên để phân biệt (ví dụ: &quot;Production CI&quot;). Plaintext sẽ hiển thị một lần ở bước tiếp theo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="My CI integration"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env">Environment</Label>
                <Select
                  id="env"
                  value={newKeyEnv}
                  onChange={(e) => setNewKeyEnv(e.target.value as ApiKeyEnvironment)}
                >
                  <option value="test">test</option>
                  <option value="live">live</option>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!newKeyName.trim() || createMut.isPending}
                onClick={() =>
                  createMut.mutate({ name: newKeyName.trim(), environment: newKeyEnv })
                }
              >
                {createMut.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={plaintext !== null}
        onOpenChange={(open) => {
          if (!open) setPlaintext(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your new API key</DialogTitle>
            <DialogDescription>
              Bạn sẽ <strong>không thể xem lại</strong> plaintext này. Hãy copy ngay bây giờ.
            </DialogDescription>
          </DialogHeader>
          <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{plaintext}</pre>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (plaintext) {
                  void navigator.clipboard.writeText(plaintext).then(() => toast.success('Copied'));
                }
              }}
            >
              Copy to clipboard
            </Button>
            <DialogClose asChild>
              <Button>I saved it</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your keys</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {keysQuery.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No keys yet — create one above.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Prefix</th>
                  <th className="px-4 py-2">Env</th>
                  <th className="px-4 py-2">Last used</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((k) => {
                  const revoked = k.revokedAt !== null;
                  return (
                    <tr key={k.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2">{k.name}</td>
                      <td className="px-4 py-2 font-mono text-xs">{k.prefix}…</td>
                      <td className="px-4 py-2">
                        <Badge variant={k.environment === 'live' ? 'info' : 'muted'}>
                          {k.environment}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'never'}
                      </td>
                      <td className="px-4 py-2">
                        {revoked ? (
                          <Badge variant="muted">revoked</Badge>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={revokeMut.isPending}
                            onClick={() => {
                              if (window.confirm(`Revoke "${k.name}"? This cannot be undone.`)) {
                                revokeMut.mutate(k.id);
                              }
                            }}
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
