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

const NAV_LINKS = [
  { href: "/portal-assessor/pipeline", label: "Pipeline" },
  { href: "/portal-assessor/clientes", label: "Clientes" },
  { href: "/portal-assessor/comissoes", label: "Comissões" },
  { href: "/portal-assessor/enviar-oportunidade", label: "Enviar oportunidade" },
];

function SecondaryNav({ partnerName }: { partnerName?: string }) {
  return (
    <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {NAV_LINKS.map(({ href, label }) => {
        const dest =
          partnerName ? `${href}?parceiro=${encodeURIComponent(partnerName)}` : href;
        return (
          <Link
            key={href}
            href={dest}
            style={{
              display: "inline-block",
              padding: "8px 16px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 6,
              color: "#d1d5db",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <section
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(239,68,68,0.30)",
        borderRadius: 8,
        padding: 28,
      }}
    >
      <p style={{ color: "#f87171", fontSize: 15 }}>{message}</p>
    </section>
  );
}

export default async function PortalAssessorPage() {
  const state = await resolvePageState();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 32px 72px" }}>
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#FFC130",
            marginBottom: 8,
          }}
        >
          Portal do Assessor
        </div>
        <h1 style={{ fontSize: 36, lineHeight: 1.1, marginBottom: 10 }}>
          Bem-vindo ao Portal do Assessor
        </h1>
        <p style={{ color: "#9ca3af", fontSize: 16, lineHeight: 1.6 }}>
          Visualize pipeline comercial, clientes, comissões e envie novas oportunidades.
        </p>
      </div>

      {state.kind === "unauthenticated" && (
        <ErrorCard message="Sessão necessária para acessar o Portal do Assessor. Por favor, faça login." />
      )}

      {state.kind === "forbidden" && (
        <ErrorCard message="Acesso não liberado. Entre em contato com o administrador da plataforma." />
      )}

      {state.kind === "error" && (
        <ErrorCard message="Não foi possível carregar o Portal do Assessor. Tente novamente mais tarde." />
      )}

      {state.kind === "admin_galapos" && (
        <>
          <PartnerSelector partners={state.partners} />
          <div style={{ marginTop: 32 }}>
            <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>
              Atalhos — disponíveis após selecionar um parceiro acima.
            </p>
            <SecondaryNav />
          </div>
        </>
      )}

      {state.kind === "partner" && (
        <>
          <section
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: 28,
              marginBottom: 24,
            }}
          >
            <p
              style={{
                color: "#9ca3af",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
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
                display: "inline-block",
                padding: "10px 20px",
                background: "#FFC130",
                color: "#111",
                borderRadius: 6,
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Acessar Pipeline →
            </Link>
          </section>
          <SecondaryNav partnerName={state.partnerName} />
        </>
      )}
    </div>
  );
}
