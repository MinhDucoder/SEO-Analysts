'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';
import { InputTabs } from '@/components/playground/input-tabs';
import { OptionsPanel } from '@/components/playground/options-panel';
import { SamplesMenu } from '@/components/playground/samples-menu';
import { ResultViewer } from '@/components/playground/result-viewer';
import { CopyButtons } from '@/components/playground/copy-buttons';
import {
  getStoredApiKey,
  setStoredApiKey,
  getStoredInput,
  setStoredInput,
} from '@/lib/local-storage';
import { runPublicCheck } from '@/lib/api-public-check';
import { ApiError } from '@/lib/api';
import type {
  PublicCheckInput,
  PublicCheckOptions,
  PublicCheckRequest,
  PublicCheckResponse,
  Suggestion,
  PublicCheckIssue,
} from '@/types/api';

export default function PlaygroundPage() {
  const [apiKey, setApiKey] = React.useState('');
  const [input, setInput] = React.useState<PublicCheckInput>({ type: 'url', url: '' });
  const [targetKeyword, setTargetKeyword] = React.useState('');
  const [secondaryKeywords, setSecondaryKeywords] = React.useState('');
  const [options, setOptions] = React.useState<PublicCheckOptions>({
    enrichMode: 'template',
    language: 'vi',
  });
  const [response, setResponse] = React.useState<PublicCheckResponse | null>(null);

  React.useEffect(() => {
    setApiKey(getStoredApiKey() ?? '');
    const storedInput = getStoredInput();
    if (storedInput) setInput(storedInput);
  }, []);

  React.useEffect(() => {
    setStoredInput(input);
  }, [input]);

  const request: PublicCheckRequest = React.useMemo(
    () => ({
      input,
      targetKeyword: targetKeyword.trim(),
      secondaryKeywords: secondaryKeywords
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5),
      options,
    }),
    [input, targetKeyword, secondaryKeywords, options],
  );

  const mutation = useMutation({
    mutationFn: () => runPublicCheck(apiKey, request),
    onSuccess: (res) => setResponse(res),
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Request failed'),
  });

  const onApply = (issue: PublicCheckIssue) => {
    if (!issue.suggestion) return;
    const s: Suggestion = issue.suggestion;
    if (input.type === 'markdown') {
      setInput({ type: 'markdown', markdown: applyToText(input.markdown ?? '', s) });
    } else if (input.type === 'html') {
      setInput({ type: 'html', html: applyToText(input.html ?? '', s) });
    } else {
      toast.message('Apply-to-input works on Markdown / HTML only');
    }
  };

  const canApply = input.type !== 'url';

  return (
    <main className="container mx-auto space-y-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Playground</h1>
          <p className="text-sm text-muted-foreground">
            Paste a key, write or paste content, click Check.{' '}
            <Link href="/settings/api-keys" className="underline">
              Get a key →
            </Link>
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apikey">API key</Label>
            <Input
              id="apikey"
              placeholder="sk_live_… or sk_test_…"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setStoredApiKey(e.target.value || null);
              }}
            />
          </div>
          <SamplesMenu
            onPick={(s) => {
              setInput(s.request.input);
              setTargetKeyword(s.request.targetKeyword);
              setSecondaryKeywords((s.request.secondaryKeywords ?? []).join(', '));
              setOptions(s.request.options ?? {});
              toast.success(`Loaded sample: ${s.label}`);
            }}
          />
          <InputTabs value={input} onChange={setInput} />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="lg"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !apiKey || !targetKeyword}
            >
              {mutation.isPending ? 'Checking…' : 'Check'}
            </Button>
            <CopyButtons apiKey={apiKey} request={request} response={response} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Options</CardTitle>
          </CardHeader>
          <CardContent>
            <OptionsPanel
              targetKeyword={targetKeyword}
              secondaryKeywords={secondaryKeywords}
              options={options}
              onTargetKeywordChange={setTargetKeyword}
              onSecondaryKeywordsChange={setSecondaryKeywords}
              onOptionsChange={setOptions}
            />
          </CardContent>
        </Card>
      </div>

      <Separator />

      {response ? (
        <ResultViewer response={response} canApply={canApply} onApply={onApply} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No results yet. Paste an API key, fill in a target keyword, and click Check.
        </p>
      )}
    </main>
  );
}

function applyToText(source: string, suggestion: Suggestion): string {
  switch (suggestion.type) {
    case 'rewrite':
      return suggestion.text;
    case 'add':
      return `${suggestion.text}\n\n${source}`;
    case 'remove':
      return source.split(suggestion.text).join('');
    case 'reorder':
      return source;
  }
}
