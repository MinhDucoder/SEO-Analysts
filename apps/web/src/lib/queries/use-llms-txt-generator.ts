import { useMutation } from "@tanstack/react-query";
import {
  generateLlmsTxt,
  type LlmsTxtGenerateBody,
  type LlmsTxtGenerateResponse,
} from "../api/llms-txt-generator";

export function useLlmsTxtGenerator() {
  return useMutation<LlmsTxtGenerateResponse, Error, LlmsTxtGenerateBody>({
    mutationFn: generateLlmsTxt,
  });
}
