import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Playground</CardTitle>
          <CardDescription>Phân tích URL / markdown / HTML ngay trong trình duyệt.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/playground" className="underline">Open playground →</Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>Quản lý key để gọi API từ CI / CLI.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/api-keys" className="underline">Manage keys →</Link>
        </CardContent>
      </Card>
    </div>
  );
}
