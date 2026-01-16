import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DesktopClient from "@/components/desktop/DesktopClient";
import { authOptions } from "@/lib/auth";
import { getSetupRedirect } from "@/lib/setupRoutes";
import { getSetupStatus } from "@/lib/setupStatus";

export default async function HomePage() {
  const status = await getSetupStatus();
  const setupRedirect = getSetupRedirect(status);
  if (setupRedirect) {
    redirect(setupRedirect);
  }
  if (status === "dbUnavailable") {
    return (
      <main>
        <h1>Database unavailable</h1>
        <p>Start Postgres and refresh the page.</p>
      </main>
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return <DesktopClient userEmail={session.user.email ?? null} />;
}
