import { PortalShell } from "@/components/portal-shell";
import { PartnerAnalyticsLoader } from "@/components/partner-analytics-loader";

export default function ScorecardPage() {
  return (
    <PortalShell
      active="scorecard"
      title="Scorecard"
      subtitle="Página focada em consolidação executiva, score dos parceiros e paretos financeiros para TCV ponderado e faturamento Galapos."
    >
      <PartnerAnalyticsLoader mode="scorecard" />
    </PortalShell>
  );
}
