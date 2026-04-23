'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlaygroundEditor } from './monaco-editor';
import type { PublicCheckInput } from '@/types/api';

export interface InputTabsProps {
  value: PublicCheckInput;
  onChange: (value: PublicCheckInput) => void;
}

export function InputTabs({ value, onChange }: InputTabsProps) {
  return (
    <Tabs
      value={value.type}
      onValueChange={(t) => {
        if (t === 'url') onChange({ type: 'url', url: value.url ?? '' });
        if (t === 'markdown') onChange({ type: 'markdown', markdown: value.markdown ?? '' });
        if (t === 'html') onChange({ type: 'html', html: value.html ?? '' });
      }}
      className="w-full"
    >
      <TabsList>
        <TabsTrigger value="url">URL</TabsTrigger>
        <TabsTrigger value="markdown">Markdown</TabsTrigger>
        <TabsTrigger value="html">HTML</TabsTrigger>
      </TabsList>

      <TabsContent value="url">
        <Input
          type="url"
          placeholder="https://example.com/blog-post"
          value={value.url ?? ''}
          onChange={(e) => onChange({ type: 'url', url: e.target.value })}
        />
      </TabsContent>
      <TabsContent value="markdown">
        <PlaygroundEditor
          language="markdown"
          value={value.markdown ?? ''}
          onChange={(v) => onChange({ type: 'markdown', markdown: v })}
          placeholder="# Your markdown"
        />
      </TabsContent>
      <TabsContent value="html">
        <PlaygroundEditor
          language="html"
          value={value.html ?? ''}
          onChange={(v) => onChange({ type: 'html', html: v })}
          placeholder="<html>...</html>"
        />
      </TabsContent>
    </Tabs>
  );
}
