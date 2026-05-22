"use client";

import { ReactNode } from "react";

interface Props {
  title: string;
  description: string;
  children: ReactNode;
}

/**
 * Two-column tool layout: a title/description header above an input panel
 * (left) and a result panel (right). Compose with `ToolShell.Input` and
 * `ToolShell.Result`.
 */
export function ToolShell({ title, description, children }: Props) {
  return (
    <div className="container mx-auto max-w-6xl py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </header>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{children}</div>
    </div>
  );
}

ToolShell.Input = function Input({ children }: { children: ReactNode }) {
  return <section className="rounded-lg border bg-card p-6">{children}</section>;
};

ToolShell.Result = function Result({ children }: { children: ReactNode }) {
  return <section className="rounded-lg border bg-card p-6">{children}</section>;
};
