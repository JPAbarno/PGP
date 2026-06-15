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
  stage?: string | null;
  currentStageLabel?: string | null;
  activityDate?: string | null;
  tcvPonderado?: string | number | null;
  reunioesRealizadas?: string | number | null;
  propostasEnviadas?: string | number | null;
  contratosFechados?: string | number | null;
};

type PartnerMetricSnapshotEntry = {
  parceiro?: string | null;
  deals?: SnapshotDealEntry[] | null;
};

type ServiceJourneyEventSnapshotEntry = {
  dealId?: string | number | null;
  parceiro?: string | null;
  responsavel?: string | null;
};

type PartnerMetricsSnapshotPayload = {
  partnerMetrics: PartnerMetricSnapshotEntry[];
  serviceJourneyEvents: ServiceJourneyEventSnapshotEntry[];
};

type SnapshotEnvelope = {
  payload?: Partial<PartnerMetricsSnapshotPayload> | null;
};

type PortalAssessorDeal = {
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

const ACCESS_ERROR = "Acesso negado.";
const PARTNER_REQUIRED_ERROR = "Parceiro obrigatorio.";
const DEALS_ERROR = "Nao foi possivel carregar as oportunidades.";
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
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSnapshotPayload(
  payload: SnapshotEnvelope["payload"]
): PartnerMetricsSnapshotPayload | null {
  if (!payload || !Array.isArray(payload.partnerMetrics)) return null;

  return {
    partnerMetrics: payload.partnerMetrics,
    serviceJourneyEvents: Array.isArray(payload.serviceJourneyEvents)
      ? payload.serviceJourneyEvents
      : [],
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

function ownerMapForPartner(
  serviceJourneyEvents: ServiceJourneyEventSnapshotEntry[],
  partnerName: string
) {
  const ownersByDealId = new Map<string, string>();

  for (const event of serviceJourneyEvents) {
    if (!isSamePartnerName(event.parceiro, partnerName)) continue;

    const dealId = stringOrEmpty(event.dealId);
    const owner = stringOrEmpty(event.responsavel);

    if (dealId && owner && !ownersByDealId.has(dealId)) {
      ownersByDealId.set(dealId, owner);
    }
  }

  return ownersByDealId;
}

function mapDeal(
  deal: SnapshotDealEntry,
  partnerName: string,
  ownersByDealId: Map<string, string>
): PortalAssessorDeal {
  const dealId = stringOrEmpty(deal.dealId);
  const dealStage = stringOrEmpty(deal.stage);
  const stageLabel = stringOrEmpty(deal.currentStageLabel) || dealStage;

  return {
    dealId,
    dealName: stringOrEmpty(deal.dealName),
    dealStage,
    stageLabel,
    parceiro: partnerName,
    activityDate: stringOrNull(deal.activityDate),
    tcvPonderado: numberOrZero(deal.tcvPonderado),
    proprietario: ownersByDealId.get(dealId) ?? null,
    reunioesRealizadas: numberOrZero(deal.reunioesRealizadas),
    propostasEnviadas: numberOrZero(deal.propostasEnviadas),
    contratosFechados: numberOrZero(deal.contratosFechados),
  };
}

async function readDealsForPartner(partnerName: string) {
  const payload = await readSnapshotPayload();
  if (!payload) return [] satisfies PortalAssessorDeal[];

  const ownersByDealId = ownerMapForPartner(payload.serviceJourneyEvents, partnerName);
  const deals: PortalAssessorDeal[] = [];

  for (const partnerMetric of payload.partnerMetrics) {
    if (!isSamePartnerName(partnerMetric.parceiro, partnerName)) continue;

    const snapshotPartnerName = stringOrEmpty(partnerMetric.parceiro) || partnerName;

    for (const deal of partnerMetric.deals ?? []) {
      deals.push(mapDeal(deal, snapshotPartnerName, ownersByDealId));
    }
  }

  return deals;
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

    const deals = await readDealsForPartner(partnerScope.partnerName);

    return NextResponse.json({
      deals,
      meta: {
        partnerName: partnerScope.partnerName,
        dealCount: deals.length,
      },
    });
  } catch {
    return NextResponse.json({ error: DEALS_ERROR }, { status: 500 });
  }
}
