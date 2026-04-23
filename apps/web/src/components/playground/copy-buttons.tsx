'use client';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { buildCurl, buildJs, buildResponseCopy } from '@/lib/snippet-builders';
import { env } from '@/lib/env';
import type { PublicCheckRequest, PublicCheckResponse } from '@/types/api';

export interface CopyButtonsProps {
  apiKey: string;
  request: PublicCheckRequest;
  response: PublicCheckResponse | null;
}

export function CopyButtons({ apiKey, request, response }: CopyButtonsProps) {
  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => copy(buildCurl(env.apiBase, apiKey, request), 'cURL')}>
        Copy as cURL
      </Button>
      <Button variant="outline" size="sm" onClick={() => copy(buildJs(env.apiBase, apiKey, request), 'JS')}>
        Copy as JS
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!response}
        onClick={() => response && copy(buildResponseCopy(response), 'Response')}
      >
        Copy response
      </Button>
    </div>
  );
}
