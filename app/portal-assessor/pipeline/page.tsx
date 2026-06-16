import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  getManagedAccessDecision,
  isAdminOrGalaposAccess,
  isPartnerAccess,
} from "@/lib/access-control";
import { headers } from "next/headers";
import Link from "next/link";

type Deal = {
  dealId: string;
  dealName: string;
  dealStage: string;
  stageLabel: string;
  parceiro: string;
  activityDate: string | null;
  tcvPonderado: number;
  proprietario: string | null;
  reunioesRealizadas: number;
  propostasEnviadas: number;
  contratosFechados: number;
};

type DealsApiResponse = {
  deals: Deal[];
  meta: { partnerName: string; dealCount: number };
};

class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`api_error_${status}`);
  }
}

async function fetchDeals(
  cookieHeader: string,
  host: string,
  partnerName?: string
): Promise<DealsApiResponse> {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const base = `${protocol}://${host}/api/portal-assessor/deals`;
  const url = partnerName
    ? `${base}?parceiro=${encodeURIComponent(partnerName)}`
    : base;

  const res = await fetch(url, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) throw new ApiError(res.status);

  return res.json() as Promise<DealsApiResponse>;
}

type PageState =
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "no_partner_selected" }
  | { kind: "api_error"; httpStatus: number }
  | { kind: "error" }
  | { kind: "loaded"; deals: Deal[]; partnerName: string; isAdminView: boolean };

async function resolvePageState(partnerParam: string | undefined): Promise<PageState> {
  try {
    const session = await getServerSession(authOptions);
    const decision = await getManagedAccessDecision(session?.user?.email);

    if (decision.access === "unauthenticated") return { kind: "unauthenticated" };
    if (decision.access === "forbidden") return { kind: "forbidden" };

    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const cookieHeader = headersList.get("cookie") ?? "";

    if (isAdminOrGalaposAccess(decision)) {
      const trimmedPartner = partnerParam?.trim();
      if (!trimmedPartner) return { kind: "no_partner_selected" };

      const data = await fetchDeals(cookieHeader, host, trimmedPartner);
      return {
        kind: "loaded",
        deals: data.deals,
        partnerName: data.meta.partnerName,
        isAdminView: true,
      };
    }

    if (isPartnerAccess(decision)) {
      const data = await fetchDeals(cookieHeader, host);
      return {
        kind: "loaded",
        deals: data.deals,
        partnerName: data.meta.partnerName,
        isAdminView: false,
      };
    }

    return { kind: "forbidden" };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) return { kind: "unauthenticated" };
      if (err.status === 403) return { kind: "forbidden" };
      if (err.status === 400) return { kind: "no_partner_selected" };
      return { kind: "api_error", httpStatus: err.status };
    }
    return { kind: "error" };
  }
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

function InfoCard({ children }: { children: ReactNode }) {
  return (
    <section
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: 28,
      }}
    >
      {children}
    </section>
  );
}

const SUB_NAV_LINKS = [
  { href: "/portal-assessor", label: "← Portal", preservePartner: false },
  { href: "/portal-assessor/clientes", label: "Clientes", preservePartner: true },
  { href: "/portal-assessor/comissoes", label: "Comissões", preservePartner: true },
  { href: "/portal-assessor/enviar-oportunidade", label: "Enviar oportunidade", preservePartner: true },
];

function SubNav({ partnerName }: { partnerName?: string }) {
  return (
    <nav style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {SUB_NAV_LINKS.map(({ href, label, preservePartner }) => {
        const dest =
          partnerName && preservePartner
            ? `${href}?parceiro=${encodeURIComponent(partnerName)}`
            : href;
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TABLE_HEADERS = [
  "Oportunidade",
  "Etapa",
  "Data de atividade",
  "TCV ponderado",
  "Responsável",
  "Reuniões",
  "Propostas",
  "Contratos",
];

function DealsTable({ deals }: { deals: Deal[] }) {
  if (deals.length === 0) {
    return (
      <InfoCard>
        <p style={{ color: "#9ca3af", fontSize: 15 }}>
          Nenhuma oportunidade encontrada para este parceiro.
        </p>
      </InfoCard>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.10)", textAlign: "left" }}>
            {TABLE_HEADERS.map((col) => (
              <th
                key={col}
                style={{
                  padding: "10px 12px",
                  color: "#9ca3af",
                  fontWeight: 600,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr
              key={deal.dealId}
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <td style={{ padding: "12px 12px", color: "#e5e7eb", fontWeight: 500 }}>
                {deal.dealName || "—"}
              </td>
              <td style={{ padding: "12px 12px", color: "#9ca3af" }}>
                {deal.stageLabel || deal.dealStage || "—"}
              </td>
              <td style={{ padding: "12px 12px", color: "#9ca3af", whiteSpace: "nowrap" }}>
                {formatDate(deal.activityDate)}
              </td>
              <td style={{ padding: "12px 12px", color: "#d1d5db", whiteSpace: "nowrap" }}>
                {formatCurrency(deal.tcvPonderado)}
              </td>
              <td style={{ padding: "12px 12px", color: "#9ca3af" }}>
                {deal.proprietario ?? "—"}
              </td>
              <td style={{ padding: "12px 12px", color: "#9ca3af", textAlign: "center" }}>
                {deal.reunioesRealizadas}
              </td>
              <td style={{ padding: "12px 12px", color: "#9ca3af", textAlign: "center" }}>
                {deal.propostasEnviadas}
              </td>
              <td style={{ padding: "12px 12px", color: "#9ca3af", textAlign: "center" }}>
                {deal.contratosFechados}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PortalAssessorPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ parceiro?: string | string[] }>;
}) {
  const params = await searchParams;
  const parceiroParam = typeof params.parceiro === "string" ? params.parceiro : undefined;
  const state = await resolvePageState(parceiroParam);

  const partnerNameForLinks =
    state.kind === "loaded" && state.isAdminView ? state.partnerName : undefined;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px 72px" }}>
      <div style={{ marginBottom: 24 }}>
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
        <h1 style={{ fontSize: 32, lineHeight: 1.1, marginBottom: 10 }}>Pipeline</h1>

        {state.kind === "loaded" && (
          <p style={{ color: "#9ca3af", fontSize: 15 }}>
            {state.partnerName} —{" "}
            {state.deals.length === 1
              ? "1 oportunidade"
              : `${state.deals.length} oportunidades`}
          </p>
        )}
      </div>

      <div style={{ marginBottom: 28 }}>
        <SubNav partnerName={partnerNameForLinks} />
      </div>

      {state.kind === "unauthenticated" && (
        <ErrorCard message="Sessão necessária para acessar o Pipeline. Por favor, faça login." />
      )}

      {state.kind === "forbidden" && (
        <ErrorCard message="Acesso não liberado. Entre em contato com o administrador da plataforma." />
      )}

      {state.kind === "no_partner_selected" && (
        <InfoCard>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            Selecione um parceiro
          </h2>
          <p style={{ color: "#9ca3af", fontSize: 15, marginBottom: 20, lineHeight: 1.6 }}>
            É necessário selecionar um parceiro antes de visualizar o Pipeline. Volte ao Portal
            do Assessor e escolha um parceiro para continuar.
          </p>
          <Link
            href="/portal-assessor"
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
            ← Selecionar parceiro
          </Link>
        </InfoCard>
      )}

      {(state.kind === "api_error" || state.kind === "error") && (
        <ErrorCard message="Não foi possível carregar o Pipeline. Tente novamente mais tarde." />
      )}

      {state.kind === "loaded" && (
        <section
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <DealsTable deals={state.deals} />
        </section>
      )}
    </div>
  );
}
