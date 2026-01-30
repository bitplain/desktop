"use client";

import { EcoButton, EcoCard, EcoCardTitle, EcoNotice } from "@/components/ui/eco";

export default function DatabaseUnavailableCard() {
  return (
    <EcoCard className="stack">
      <EcoCardTitle>Database unavailable</EcoCardTitle>
      <EcoNotice>Start Postgres and refresh the page.</EcoNotice>
      <EcoButton type="button" onClick={() => window.location.reload()}>
        Refresh
      </EcoButton>
    </EcoCard>
  );
}
