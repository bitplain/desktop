export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSetupStatus } from "@/lib/setupStatus";
import SetupWizard from "./SetupWizard";

export default async function SetupPage() {
  const status = await getSetupStatus({ allowAutoSslFix: true });
  if (status === "ready") {
    redirect("/");
  }
  return <SetupWizard initialStatus={status} />;
}
