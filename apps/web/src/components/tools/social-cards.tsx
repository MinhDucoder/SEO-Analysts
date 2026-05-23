"use client";

export interface SocialCardProps {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

function hostOf(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ImageArea({ image, label }: { image?: string; label: string }) {
  return (
    <div className="aspect-[1.91/1] w-full overflow-hidden bg-muted">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
          {label}
        </div>
      )}
    </div>
  );
}

export function FacebookOgCard({ title, description, image, siteName }: SocialCardProps) {
  return (
    <figure className="overflow-hidden rounded-lg border bg-white">
      <ImageArea image={image} label="og:image" />
      <figcaption className="space-y-1 bg-[#f2f3f5] px-3 py-2">
        <div className="text-[11px] uppercase tracking-wide text-[#606770]">
          {siteName || hostOf(image)}
        </div>
        <div className="line-clamp-2 font-semibold text-[#1d2129]">{title || "Untitled"}</div>
        <div className="line-clamp-1 text-sm text-[#606770]">{description}</div>
      </figcaption>
    </figure>
  );
}

export function TwitterCard({ title, description, image, siteName }: SocialCardProps) {
  return (
    <figure className="overflow-hidden rounded-2xl border bg-white">
      <ImageArea image={image} label="twitter:image" />
      <figcaption className="space-y-0.5 px-3 py-2">
        <div className="line-clamp-1 text-sm font-semibold text-[#0f1419]">
          {title || "Untitled"}
        </div>
        <div className="line-clamp-2 text-sm text-[#536471]">{description}</div>
        <div className="text-xs text-[#536471]">{siteName || hostOf(image)}</div>
      </figcaption>
    </figure>
  );
}

export function LinkedinOgCard({ title, image, siteName }: SocialCardProps) {
  return (
    <figure className="overflow-hidden rounded border bg-white">
      <ImageArea image={image} label="og:image" />
      <figcaption className="space-y-1 px-3 py-2">
        <div className="line-clamp-2 font-semibold text-[#000000e6]">{title || "Untitled"}</div>
        <div className="text-xs text-[#00000099]">{siteName || hostOf(image)}</div>
      </figcaption>
    </figure>
  );
}
