import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { authOptions } from "@/auth";
import {
  getManagedAccessDecision,
  isManagedAccessAllowed,
  isSamePartnerName,
  resolvePortalPartnerScope,
} from "@/lib/access-control";

type SnapshotDealEntry = {
  dealId?: string | number | null;
  dealName?: string | null;
  activityDate?: string | null;
  faturamentoGalapos?: string | number | null;
  comissaoPaga?: string | number | null;
};

type PartnerMetricSnapshotEntry = {
  parceiro?: string | null;
  deals?: SnapshotDealEntry[] | null;
};

type PartnerMetricsSnapshotPayload = {
  partnerMetrics: PartnerMetricSnapshotEntry[];
};

type SnapshotEnvelope = {
  payload?: Partial<PartnerMetricsSnapshotPayload> | null;
};

type PortalAssessorInvoice = {
  dealId: string;
  dealName: string;
  parceiro: string;
  dataEmissao: string | null;
  faturamento: number;
  comissao: number;
};

const ACCESS_ERROR = "Acesso negado.";
const PARTNER_REQUIRED_ERROR = "Parceiro obrigatorio.";
const INVOICES_ERROR = "Nao foi possivel carregar as comissoes.";
const SNAPSHOT_PATH = path.join(process.cwd(), "data", "partner-metrics-snapshot.json");

function stringOrEmpty(value: unknown) {
  return String(value ?? "").trim();
}

function stringOrNull(value: unknown) {
  const normalized = stringOrEmpty(value);

  return normalized || null;
}

function numberOrZero(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const direct = Number(raw);

    return Number.isFinite(direct) ? direct : 0;
  }

  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSnapshotPayload(
  payload: SnapshotEnvelope["payload"]
): PartnerMetricsSnapshotPayload | null {
  if (!payload || !Array.isArray(payload.partnerMetrics)) return null;

  return {
    partnerMetrics: payload.partnerMetrics,
  };
}

async function readSnapshotPayload() {
  try {
    const raw = await readFile(SNAPSHOT_PATH, "utf8");
    const parsed = JSON.parse(raw) as SnapshotEnvelope;

    return normalizeSnapshotPayload(parsed.payload);
  } catch {
    return null;
  }
}

function isFinancialEntry(entry: SnapshotDealEntry) {
  return numberOrZero(entry.faturamentoGalapos) > 0 || numberOrZero(entry.comissaoPaga) > 0;
}

function mapInvoice(
  entry: SnapshotDealEntry,
  partnerMetric: PartnerMetricSnapshotEntry
): PortalAssessorInvoice {
  return {
    dealId: stringOrEmpty(entry.dealId),
    dealName: stringOrEmpty(entry.dealName),
    parceiro: stringOrEmpty(partnerMetric.parceiro),
    dataEmissao: stringOrNull(entry.activityDate),
    faturamento: numberOrZero(entry.faturamentoGalapos),
    comissao: numberOrZero(entry.comissaoPaga),
  };
}

async function readInvoicesForPartner(partnerName: string) {
  const payload = await readSnapshotPayload();
  if (!payload) return [] satisfies PortalAssessorInvoice[];

  const invoices: PortalAssessorInvoice[] = [];

  for (const partnerMetric of payload.partnerMetrics) {
    if (!partnerMetric || typeof partnerMetric !== "object") continue;
    if (!isSamePartnerName(partnerMetric.parceiro, partnerName)) continue;

    const deals = Array.isArray(partnerMetric.deals) ? partnerMetric.deals : [];

    for (const deal of deals) {
      if (!deal || typeof deal !== "object") continue;
      if (!isFinancialEntry(deal)) continue;

      invoices.push(mapInvoice(deal, partnerMetric));
    }
  }

  return invoices;
}

function summarizeInvoices(invoices: PortalAssessorInvoice[]) {
  return invoices.reduce(
    (summary, invoice) => ({
      totalFaturamento: summary.totalFaturamento + invoice.faturamento,
      totalComissao: summary.totalComissao + invoice.comissao,
    }),
    {
      totalFaturamento: 0,
      totalComissao: 0,
    }
  );
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: ACCESS_ERROR }, { status: 401 });
    }

    const decision = await getManagedAccessDecision(email);

    if (!isManagedAccessAllowed(decision)) {
      return NextResponse.json({ error: ACCESS_ERROR }, { status: 403 });
    }

    const url = new URL(request.url);
    const partnerScope = resolvePortalPartnerScope(decision, url.searchParams.get("parceiro"));

    if (!partnerScope.ok) {
      return NextResponse.json(
        { error: partnerScope.status === 400 ? PARTNER_REQUIRED_ERROR : ACCESS_ERROR },
        { status: partnerScope.status }
      );
    }

    const invoices = await readInvoicesForPartner(partnerScope.partnerName);
    const summary = summarizeInvoices(invoices);

    return NextResponse.json({
      invoices,
      summary,
      meta: {
        partnerName: partnerScope.partnerName,
        invoiceCount: invoices.length,
      },
    });
  } catch {
    return NextResponse.json({ error: INVOICES_ERROR }, { status: 500 });
  }
}
