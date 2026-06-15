import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getManagedAccessDecision, isAdminOrGalaposAccess } from "@/lib/access-control";
import { PortalShell } from "@/components/portal-shell";
import { PartnerAnalyticsLoader } from "@/components/partner-analytics-loader";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  let accessAllowed = false;

  try {
    const decision = await getManagedAccessDecision(session.user?.email);
    accessAllowed = isAdminOrGalaposAccess(decision);
  } catch {
    // Dataverse error: fail closed, acesso negado genérico
  }

  if (!accessAllowed) {
    redirect("/access-denied");
  }

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
