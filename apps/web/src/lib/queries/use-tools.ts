"use client";

import { useMutation } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";
import {
  googlePreview,
  socialPreview,
  schemaPreview,
  sitemapValidator,
  faviconChecker,
  type GooglePreviewRequest,
  type SocialPreviewRequest,
  type SchemaPreviewRequest,
  type SitemapValidatorRequest,
  type FaviconCheckerRequest,
} from "@/lib/api/tools";

export function useGooglePreview() {
  return useMutation({
    mutationKey: queryKeys.tools.google(),
    mutationFn: (req: GooglePreviewRequest) => googlePreview(req),
  });
}

export function useSocialPreview() {
  return useMutation({
    mutationKey: queryKeys.tools.social(),
    mutationFn: (req: SocialPreviewRequest) => socialPreview(req),
  });
}

export function useSchemaPreview() {
  return useMutation({
    mutationKey: queryKeys.tools.schema(),
    mutationFn: (req: SchemaPreviewRequest) => schemaPreview(req),
  });
}

export function useSitemapValidator() {
  return useMutation({
    mutationKey: queryKeys.tools.sitemap(),
    mutationFn: (req: SitemapValidatorRequest) => sitemapValidator(req),
  });
}

export function useFaviconChecker() {
  return useMutation({
    mutationKey: queryKeys.tools.favicon(),
    mutationFn: (req: FaviconCheckerRequest) => faviconChecker(req),
  });
}
