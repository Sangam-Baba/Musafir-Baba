import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

export interface AuthorSocialLink {
  platform?: string;
  link?: string;
}

const ICONS: Record<string, { Icon: typeof Facebook; label: string }> = {
  facebook: { Icon: Facebook, label: "Facebook" },
  linkedin: { Icon: Linkedin, label: "LinkedIn" },
  instagram: { Icon: Instagram, label: "Instagram" },
  twitter: { Icon: Twitter, label: "Twitter" },
};

// Author's social profile icons. Renders nothing unless at least one link has
// a known platform and a non-empty URL (same platforms/URL handling as the
// blog author box).
export default function AuthorSocialLinks({
  links,
  authorName,
}: {
  links?: AuthorSocialLink[] | null;
  authorName?: string;
}) {
  if (!Array.isArray(links)) return null;
  const valid = links
    .map((s) => {
      const meta = ICONS[String(s?.platform ?? "").toLowerCase()];
      const raw = typeof s?.link === "string" ? s.link.trim() : "";
      if (!meta || !raw) return null;
      return { ...meta, href: raw.startsWith("http") ? raw : `https://${raw}` };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
  if (valid.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-semibold text-gray-800">Follow:</span>
      {valid.map(({ Icon, label, href }, idx) => (
        <a
          key={`${label}-${idx}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={authorName ? `${authorName} on ${label}` : label}
          title={label}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-100 bg-white text-gray-500 shadow-sm transition-colors hover:border-[#FE5300] hover:bg-[#FE5300] hover:text-white"
        >
          <Icon size={14} strokeWidth={2.25} />
        </a>
      ))}
    </div>
  );
}
