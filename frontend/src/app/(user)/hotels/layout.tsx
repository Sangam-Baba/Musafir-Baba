// Hotels section of the website (Stage 06): adds the data-loading provider these pages use (the website layout above
// stays as it is — header, footer and the rest come from it).
import { QueryProvider } from "@/providers/query-provider";

export default function HotelsLayout({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
