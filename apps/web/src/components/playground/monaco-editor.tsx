'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Textarea } from '@/components/ui/textarea';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.default),
  { ssr: false, loading: () => null },
);

export interface PlaygroundEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'html' | 'markdown' | 'plaintext';
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
}

export function PlaygroundEditor({
  value,
  onChange,
  language,
  placeholder,
  readOnly,
  minHeight = 300,
}: PlaygroundEditorProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{ minHeight }}
      />
    );
  }

  return (
    <div className="rounded-md border" style={{ minHeight }}>
      <MonacoEditor
        value={value}
        onChange={(v) => onChange(v ?? '')}
        language={language}
        height={minHeight}
        options={{
          readOnly,
          minimap: { enabled: false },
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          fontSize: 13,
        }}
      />
    </div>
  );
}
