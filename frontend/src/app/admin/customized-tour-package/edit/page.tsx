export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";

export default function AboutUsEditPage() {
  redirect("/admin/customized-tour-package");
  return null;
}
