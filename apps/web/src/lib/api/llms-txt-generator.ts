import { api } from "@/lib/api/client";

export interface LlmsTxtGenerateBody {
  url: string;
  includeSections?: string[];
}

export interface LlmsTxtGenerateResponse {
  url: string;
  content: string;
  sizeBytes: number;
  warnings: string[];
}

export function generateLlmsTxt(
  body: LlmsTxtGenerateBody,
): Promise<LlmsTxtGenerateResponse> {
  return api
    .post("tools/llms-txt-generator", { json: body })
    .json<LlmsTxtGenerateResponse>();
}
