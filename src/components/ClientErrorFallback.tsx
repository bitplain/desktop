"use client";

import { EcoCard, EcoCardTitle, EcoNotice } from "@/components/ui/eco";

export default function ClientErrorFallback() {
  return (
    <EcoCard className="stack">
      <EcoCardTitle>Application error</EcoCardTitle>
      <EcoNotice>Check the browser console for more information.</EcoNotice>
    </EcoCard>
  );
}
