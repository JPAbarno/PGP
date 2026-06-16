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

type Client = {
  dealId: string;
  dealName: string;
  parceiro: string;
  closeDate: string | null;
  createDate: string | null;
  status: string;
};

type ClientsApiResponse = {
  clients: Client[];
  meta: { partnerName: string; clientCount: number };
};

class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`api_error_${status}`);
  }
}

async function fetchClients(
  cookieHeader: string,
  host: string,
  partnerName?: string
): Promise<ClientsApiResponse> {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const base = `${protocol}://${host}/api/portal-assessor/clients`;
  const url = partnerName
    ? `${base}?parceiro=${encodeURIComponent(partnerName)}`
    : base;

  const res = await fetch(url, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) throw new ApiError(res.status);

  return res.json() as Promise<ClientsApiResponse>;
}

type PageState =
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "no_partner_selected" }
  | { kind: "api_error"; httpStatus: number }
  | { kind: "error" }
  | { kind: "loaded"; clients: Client[]; partnerName: string; isAdminView: boolean };

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

      const data = await fetchClients(cookieHeader, host, trimmedPartner);
      return {
        kind: "loaded",
        clients: data.clients,
        partnerName: data.meta.partnerName,
        isAdminView: true,
      };
    }

    if (isPartnerAccess(decision)) {
      const data = await fetchClients(cookieHeader, host);
      return {
        kind: "loaded",
        clients: data.clients,
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

const TABLE_HEADERS = [
  "Cliente / Contrato",
  "Parceiro",
  "Status",
  "Criação",
  "Fechamento",
];

function ClientsTable({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
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
          Nenhum cliente encontrado para este parceiro.
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
          {clients.map((client) => (
            <tr
              key={client.dealId}
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <td style={{ color: "#e5e7eb", fontWeight: 500, padding: "12px 12px" }}>
                {client.dealName || "—"}
              </td>
              <td style={{ color: "#9ca3af", padding: "12px 12px" }}>
                {client.parceiro || "—"}
              </td>
              <td style={{ color: "#9ca3af", padding: "12px 12px" }}>
                {client.status || "—"}
              </td>
              <td style={{ color: "#9ca3af", padding: "12px 12px", whiteSpace: "nowrap" }}>
                {formatDate(client.createDate)}
              </td>
              <td style={{ color: "#9ca3af", padding: "12px 12px", whiteSpace: "nowrap" }}>
                {formatDate(client.closeDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PortalAssessorClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ parceiro?: string | string[] }>;
}) {
  const params = await searchParams;
  const parceiroParam = typeof params.parceiro === "string" ? params.parceiro : undefined;
  const state = await resolvePageState(parceiroParam);

  const subtitle =
    state.kind === "loaded"
      ? `${state.partnerName} — ${state.clients.length === 1 ? "1 cliente" : `${state.clients.length} clientes`}`
      : undefined;

  return (
    <div style={{ margin: "0 auto", maxWidth: 1100, padding: "40px 32px 72px" }}>
      <PortalPageHeader title="Clientes" subtitle={subtitle} />

      {state.kind === "unauthenticated" && (
        <PortalErrorState message="Sessão necessária para acessar Clientes. Por favor, faça login." />
      )}

      {state.kind === "forbidden" && (
        <PortalErrorState message="Acesso não liberado. Entre em contato com o administrador da plataforma." />
      )}

      {state.kind === "no_partner_selected" && (
        <PortalNoPartnerState resource="os Clientes" />
      )}

      {(state.kind === "api_error" || state.kind === "error") && (
        <PortalErrorState message="Não foi possível carregar os Clientes. Tente novamente mais tarde." />
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
          <ClientsTable clients={state.clients} />
        </section>
      )}
    </div>
  );
}
