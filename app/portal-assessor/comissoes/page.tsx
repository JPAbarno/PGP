import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  getManagedAccessDecision,
  isAdminOrGalaposAccess,
  isPartnerAccess,
} from "@/lib/access-control";
import { headers } from "next/headers";
import { PortalPageHeader } from "../_components/portal-page-header";
import { PortalErrorState } from "../_components/portal-error-state";
import { PortalNoPartnerState } from "../_components/portal-empty-state";

type Invoice = {
  dealId: string;
  dealName: string;
  parceiro: string;
  dataEmissao: string | null;
  faturamento: number;
  comissao: number;
};

type InvoicesApiResponse = {
  invoices: Invoice[];
  summary: { totalFaturamento: number; totalComissao: number };
  meta: { partnerName: string; invoiceCount: number };
};

class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`api_error_${status}`);
  }
}

async function fetchInvoices(
  cookieHeader: string,
  host: string,
  partnerName?: string
): Promise<InvoicesApiResponse> {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const base = `${protocol}://${host}/api/portal-assessor/invoices`;
  const url = partnerName
    ? `${base}?parceiro=${encodeURIComponent(partnerName)}`
    : base;

  const res = await fetch(url, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) throw new ApiError(res.status);

  return res.json() as Promise<InvoicesApiResponse>;
}

type PageState =
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "no_partner_selected" }
  | { kind: "api_error"; httpStatus: number }
  | { kind: "error" }
  | {
      kind: "loaded";
      invoices: Invoice[];
      summary: { totalFaturamento: number; totalComissao: number };
      partnerName: string;
      invoiceCount: number;
      isAdminView: boolean;
    };

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

      const data = await fetchInvoices(cookieHeader, host, trimmedPartner);
      return {
        kind: "loaded",
        invoices: data.invoices,
        summary: data.summary,
        partnerName: data.meta.partnerName,
        invoiceCount: data.meta.invoiceCount,
        isAdminView: true,
      };
    }

    if (isPartnerAccess(decision)) {
      const data = await fetchInvoices(cookieHeader, host);
      return {
        kind: "loaded",
        invoices: data.invoices,
        summary: data.summary,
        partnerName: data.meta.partnerName,
        invoiceCount: data.meta.invoiceCount,
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

function SummaryCards({
  totalFaturamento,
  totalComissao,
  invoiceCount,
}: {
  totalFaturamento: number;
  totalComissao: number;
  invoiceCount: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        marginBottom: 28,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: "20px 24px",
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
          Faturamento total
        </p>
        <p style={{ color: "#e5e7eb", fontSize: 22, fontWeight: 700 }}>
          {formatCurrency(totalFaturamento)}
        </p>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: "20px 24px",
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
          Comissão total
        </p>
        <p style={{ color: "#FFC130", fontSize: 22, fontWeight: 700 }}>
          {formatCurrency(totalComissao)}
        </p>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: "20px 24px",
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
          Registros
        </p>
        <p style={{ color: "#e5e7eb", fontSize: 22, fontWeight: 700 }}>{invoiceCount}</p>
      </div>
    </div>
  );
}

const TABLE_HEADERS = ["Contrato", "Parceiro", "Data de emissão", "Faturamento", "Comissão"];

function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <section
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: 28,
        }}
      >
        <p style={{ color: "#9ca3af", fontSize: 15 }}>
          Nenhum registro de comissão encontrado para este parceiro.
        </p>
      </section>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 14, width: "100%" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.10)", textAlign: "left" }}>
            {TABLE_HEADERS.map((col) => (
              <th
                key={col}
                style={{
                  color: "#9ca3af",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  padding: "10px 12px",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice, index) => (
            <tr
              key={`${invoice.dealId}-${index}`}
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <td style={{ color: "#e5e7eb", fontWeight: 500, padding: "12px 12px" }}>
                {invoice.dealName || "—"}
              </td>
              <td style={{ color: "#9ca3af", padding: "12px 12px" }}>
                {invoice.parceiro || "—"}
              </td>
              <td style={{ color: "#9ca3af", padding: "12px 12px", whiteSpace: "nowrap" }}>
                {formatDate(invoice.dataEmissao)}
              </td>
              <td style={{ color: "#d1d5db", padding: "12px 12px", whiteSpace: "nowrap" }}>
                {formatCurrency(invoice.faturamento)}
              </td>
              <td style={{ color: "#FFC130", padding: "12px 12px", whiteSpace: "nowrap" }}>
                {formatCurrency(invoice.comissao)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PortalAssessorComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{ parceiro?: string | string[] }>;
}) {
  const params = await searchParams;
  const parceiroParam = typeof params.parceiro === "string" ? params.parceiro : undefined;
  const state = await resolvePageState(parceiroParam);

  const subtitle =
    state.kind === "loaded"
      ? `${state.partnerName} — ${state.invoiceCount === 1 ? "1 registro" : `${state.invoiceCount} registros`}`
      : undefined;

  return (
    <div style={{ margin: "0 auto", maxWidth: 1100, padding: "40px 32px 72px" }}>
      <PortalPageHeader title="Comissões" subtitle={subtitle} />

      {state.kind === "unauthenticated" && (
        <PortalErrorState message="Sessão necessária para acessar Comissões. Por favor, faça login." />
      )}

      {state.kind === "forbidden" && (
        <PortalErrorState message="Acesso não liberado. Entre em contato com o administrador da plataforma." />
      )}

      {state.kind === "no_partner_selected" && (
        <PortalNoPartnerState resource="as Comissões" />
      )}

      {(state.kind === "api_error" || state.kind === "error") && (
        <PortalErrorState message="Não foi possível carregar as Comissões. Tente novamente mais tarde." />
      )}

      {state.kind === "loaded" && (
        <>
          <SummaryCards
            totalFaturamento={state.summary.totalFaturamento}
            totalComissao={state.summary.totalComissao}
            invoiceCount={state.invoiceCount}
          />
          <section
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <InvoicesTable invoices={state.invoices} />
          </section>
        </>
      )}
    </div>
  );
}
