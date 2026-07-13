import { fixInternalLinkRel } from "@/utils/removeNoFollow";

interface BlogContentProps {
  html: string;
}

export function BlogContent({ html }: BlogContentProps) {
  return (
    <div
      className="prose dark:prose-invert max-w-none detail-content-headings"
      dangerouslySetInnerHTML={{
        __html: fixInternalLinkRel(html),
      }}
    />
  );
}
