"use client";

interface Props {
  title: string;
  description: string;
  displayUrl: string;
  faviconUrl: string;
  device: "desktop" | "mobile";
}

/**
 * Visual replica of a Google search result snippet (2025 styling): favicon +
 * display URL row, blue title, grey description. Width adapts to device.
 */
export function GoogleSerpCard({ title, description, displayUrl, faviconUrl, device }: Props) {
  const titleClass =
    device === "mobile"
      ? "text-[20px] leading-snug text-[#1a0dab]"
      : "text-xl text-[#1a0dab] hover:underline";
  return (
    <div className={device === "mobile" ? "max-w-[400px]" : "max-w-[600px]"}>
      <div className="flex items-center gap-2 text-sm">
        {faviconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={faviconUrl} alt="" className="h-4 w-4 rounded-sm" />
        )}
        <span className="text-xs text-[#202124]">{displayUrl}</span>
      </div>
      <h3 className={`mt-1 font-normal ${titleClass}`}>{title || "Untitled"}</h3>
      <p className="mt-1 text-sm leading-snug text-[#4d5156]">{description}</p>
    </div>
  );
}
