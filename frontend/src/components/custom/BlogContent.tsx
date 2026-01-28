import { fixInternalLinkRel, optimizeTiptapHTML } from "@/utils/removeNoFollow";

interface BlogContentProps {
  html: string;
}

export function BlogContent({ html }: BlogContentProps) {
  return (
    <div
      className="prose dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{
        __html: optimizeTiptapHTML(fixInternalLinkRel(html)),
      }}
    />
  );
}
