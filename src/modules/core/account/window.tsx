"use client";

import AccountApp from "@/components/desktop/apps/AccountApp";

export default function AccountWindow({
  userEmail,
}: {
  userEmail?: string | null;
}) {
  return <AccountApp email={userEmail} />;
}
