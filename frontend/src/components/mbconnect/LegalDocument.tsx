export type LegalBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export default function LegalDocument({
  title,
  lastUpdated,
  effectiveFrom,
  blocks,
}: {
  title: string;
  lastUpdated: string;
  effectiveFrom: string;
  blocks: LegalBlock[];
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        Last Updated: {lastUpdated} &nbsp;|&nbsp; Effective From: {effectiveFrom}
      </p>
      <div className="mt-8 space-y-4">
        {blocks.map((block, i) => {
          if (block.type === "h2") {
            return (
              <h2 key={i} className="text-lg md:text-xl font-semibold text-slate-900 pt-4">
                {block.text}
              </h2>
            );
          }
          if (block.type === "ul") {
            return (
              <ul key={i} className="list-disc pl-6 space-y-1 text-slate-700">
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="text-slate-700 leading-relaxed">
              {block.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
