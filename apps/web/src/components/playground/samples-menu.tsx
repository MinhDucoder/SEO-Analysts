'use client';

import { Button } from '@/components/ui/button';
import { PLAYGROUND_SAMPLES, type PlaygroundSample } from '@/lib/playground-samples';

export interface SamplesMenuProps {
  onPick: (sample: PlaygroundSample) => void;
}

export function SamplesMenu({ onPick }: SamplesMenuProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs text-muted-foreground">Try a sample:</span>
      {PLAYGROUND_SAMPLES.map((s) => (
        <Button key={s.id} variant="outline" size="sm" onClick={() => onPick(s)} title={s.description}>
          {s.label}
        </Button>
      ))}
    </div>
  );
}
