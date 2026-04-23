'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

const schema = z.object({
  fullName: z.string().min(1, 'Required'),
  email: z.string().email(),
  password: z.string().min(8, 'Min 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await register(values);
      toast.success('Tạo tài khoản thành công');
      router.replace('/dashboard');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Đăng ký thất bại';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Đăng ký để lấy API keys và dùng playground.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Đang tạo tài khoản…' : 'Register'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Đã có tài khoản?{' '}
              <Link href="/login" className="underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
