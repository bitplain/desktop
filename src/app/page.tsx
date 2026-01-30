export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DesktopClient from "@/components/desktop/DesktopClient";
import { getAuthOptions } from "@/lib/auth";
import { getSetupRedirect } from "@/lib/setupRoutes";
import { getSetupStatus } from "@/lib/setupStatus";
import DatabaseUnavailableCard from "@/components/DatabaseUnavailableCard";

export default async function HomePage() {
  const status = await getSetupStatus({ allowAutoDbFix: true, allowAutoSslFix: true });
  const setupRedirect = getSetupRedirect(status);
  if (setupRedirect) {
    redirect(setupRedirect);
  }
  if (status === "dbUnavailable") {
    return (
      <main className="auth-shell">
        <DatabaseUnavailableCard />
      </main>
    );
  }

  const session = await getServerSession(getAuthOptions());
  if (!session?.user) {
    redirect("/login");
  }

  return <DesktopClient userEmail={session.user.email ?? null} />;
}
