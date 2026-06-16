import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  getManagedAccessDecision,
  isAdminOrGalaposAccess,
  isPartnerAccess,
} from "@/lib/access-control";
import { headers } from "next/headers";
import Link from "next/link";
import { PartnerSelector } from "./_components/partner-selector";
import { PortalPageHeader } from "./_components/portal-page-header";
import { PortalErrorState } from "./_components/portal-error-state";

class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`api_error_${status}`);
  }
}

async function fetchPartnerList(cookieHeader: string, host: string): Promise<string[]> {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const res = await fetch(`${protocol}://${host}/api/portal-assessor/partners`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) throw new ApiError(res.status);

  const data = (await res.json()) as { partners?: string[] };
  return Array.isArray(data.partners) ? data.partners : [];
}

type PageState =
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "error" }
  | { kind: "admin_galapos"; partners: string[] }
  | { kind: "partner"; partnerName: string };

async function resolvePageState(): Promise<PageState> {
  try {
    const session = await getServerSession(authOptions);
    const decision = await getManagedAccessDecision(session?.user?.email);

    if (decision.access === "unauthenticated") return { kind: "unauthenticated" };
    if (decision.access === "forbidden") return { kind: "forbidden" };

    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const cookieHeader = headersList.get("cookie") ?? "";

    const partners = await fetchPartnerList(cookieHeader, host);

    if (isAdminOrGalaposAccess(decision)) {
      return { kind: "admin_galapos", partners };
    }

    if (isPartnerAccess(decision)) {
      return { kind: "partner", partnerName: decision.partnerName };
    }

    return { kind: "forbidden" };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) return { kind: "unauthenticated" };
      if (err.status === 403) return { kind: "forbidden" };
    }
    return { kind: "error" };
  }
}

export default async function PortalAssessorPage() {
  const state = await resolvePageState();

  return (
    <div style={{ margin: "0 auto", maxWidth: 1100, padding: "40px 32px 72px" }}>
      <PortalPageHeader
        title="Bem-vindo ao Portal do Assessor"
        subtitle="Visualize pipeline comercial, clientes, comissões e envie novas oportunidades."
      />

      {state.kind === "unauthenticated" && (
        <PortalErrorState message="Sessão necessária para acessar o Portal do Assessor. Por favor, faça login." />
      )}

      {state.kind === "forbidden" && (
        <PortalErrorState message="Acesso não liberado. Entre em contato com o administrador da plataforma." />
      )}

      {state.kind === "error" && (
        <PortalErrorState message="Não foi possível carregar o Portal do Assessor. Tente novamente mais tarde." />
      )}

      {state.kind === "admin_galapos" && (
        <PartnerSelector partners={state.partners} />
      )}

      {state.kind === "partner" && (
        <section
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
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
            Parceiro associado
          </p>
          <p style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>
            {state.partnerName}
          </p>
          <Link
            href="/portal-assessor/pipeline"
            style={{
              background: "#FFC130",
              borderRadius: 6,
              color: "#111",
              display: "inline-block",
              fontSize: 14,
              fontWeight: 700,
              padding: "10px 20px",
              textDecoration: "none",
            }}
          >
            Acessar Pipeline →
          </Link>
        </section>
      )}
    </div>
  );
}
