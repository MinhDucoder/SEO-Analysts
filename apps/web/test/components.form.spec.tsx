import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../src/components/ui/form';
import { Input } from '../src/components/ui/input';

function Harness() {
  const form = useForm<{ fullName: string }>({ defaultValues: { fullName: '' } });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="fullName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}

describe('Form primitives', () => {
  it('links FormLabel → child Input via htmlFor/id so getByLabelText resolves', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Full name');
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('id')).toBeTruthy();
  });

  it('each FormItem instance gets a unique id to avoid label collisions', () => {
    render(
      <>
        <Harness />
        <Harness />
      </>,
    );
    const inputs = screen.getAllByLabelText('Full name');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]!.getAttribute('id')).not.toBe(inputs[1]!.getAttribute('id'));
  });
});
