import { redirect } from "next/navigation";
import { getSetupStatus } from "@/lib/setupStatus";
import SetupWizard from "./SetupWizard";

export default async function SetupPage() {
  const status = await getSetupStatus();
  if (status === "ready") {
    redirect("/");
  }
  if (status === "dbUnavailable") {
    return (
      <main>
        <h1>Database unavailable</h1>
        <p>Start Postgres and refresh the page.</p>
      </main>
    );
  }
  return <SetupWizard initialStatus={status} />;
}
