import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DesktopClient from "@/components/desktop/DesktopClient";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return <DesktopClient userEmail={session.user.email ?? null} />;
}
