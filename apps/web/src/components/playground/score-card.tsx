'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PublicCheckResponse } from '@/types/api';

export function ScoreCard({ response }: { response: PublicCheckResponse }) {
  const entries = Object.entries(response.scoreBreakdown);
  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between">
        <CardTitle className="text-3xl">{response.score} / 100</CardTitle>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <Badge variant={response.meta.degraded ? 'warn' : 'muted'}>
            source: {response.meta.suggestionSource}
          </Badge>
          {response.meta.degraded ? <Badge variant="warn">degraded</Badge> : null}
          {response.meta.cached ? <Badge variant="muted">cached</Badge> : null}
          <span>{response.meta.processingTimeMs}ms · rule v{response.meta.ruleVersion}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map(([cat, score]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="w-32 text-xs uppercase text-muted-foreground">{cat}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.max(2, score)}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs">{score}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
