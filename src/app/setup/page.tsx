export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSetupStatus } from "@/lib/setupStatus";
import { getSetupRedirect } from "@/lib/setupRoutes";

export default async function SetupPage() {
  const status = await getSetupStatus({ allowAutoDbFix: true, allowAutoSslFix: true });
  if (status === "ready") {
    redirect("/");
  }
  const target = getSetupRedirect(status) ?? "/setup/step-1";
  redirect(target);
}
