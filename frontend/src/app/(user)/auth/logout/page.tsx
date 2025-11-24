export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import LogoutClient from "./logoutClient";

export default function LogoutPage() {
  return <LogoutClient />;
}
