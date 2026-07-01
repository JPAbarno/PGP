import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getManagedAccessDecision, isAdminOrGalaposAccess } from "@/lib/access-control";
import { PortalShell } from "@/components/portal-shell";

export default async function ConfiguracoesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  let accessAllowed = false;
  let role: "admin" | "galapos" = "galapos";

  try {
    const decision = await getManagedAccessDecision(session.user?.email);
    accessAllowed = isAdminOrGalaposAccess(decision);
    if (accessAllowed && decision.access === "allowed" && decision.role === "admin") {
      role = "admin";
    }
  } catch {
    // Dataverse error: fail closed
  }

  if (!accessAllowed) {
    redirect("/access-denied");
  }

  return (
    <PortalShell
      active="configuracoes"
      role={role}
      userEmail={session.user?.email ?? ""}
      title="Configurações"
      subtitle="Configurações e gestão da plataforma PGP."
    >
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          maxWidth: 600,
          padding: 28,
        }}
      >
        <p
          style={{
            color: "#9ca3af",
            fontSize: 12,
            letterSpacing: "0.08em",
            marginBottom: 8,
            textTransform: "uppercase",
          }}
        >
          Gestão de Acessos
        </p>
        <p style={{ color: "#e5e7eb", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
          A tela de Gestão de Acessos será implementada em fase futura.
        </p>
      </div>
    </PortalShell>
  );
}
