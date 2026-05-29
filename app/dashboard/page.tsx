import { PortalShell } from "@/components/portal-shell";
import { PartnerAnalyticsLoader } from "@/components/partner-analytics-loader";

export default function DashboardPage() {
  return (
    <PortalShell
      active="dashboard"
      title="Dashboard"
      subtitle="Estrutura inicial para comparar parceiros com filtros, ranking e leituras de pareto por reuniões, propostas e contratos."
    >
      <PartnerAnalyticsLoader />
    </PortalShell>
  );
}
