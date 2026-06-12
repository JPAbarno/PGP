import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { authOptions } from "@/auth";
import { getManagedAccessDecision } from "@/lib/access-control";
import type { ManagedAccessAllowedDecision } from "@/lib/access-control";

type DetailMetric = "r1" | "propostas" | "contratos" | "tcv" | "faturamento" | "comissao";

type HubspotDeal = {
  id?: string;
  properties?: Record<string, string | null | undefined>;
};

type DetailResponse = {
  details: Array<{
    dealId: string;
    service: string;
    responsavel: string;
  }>;
};

type ParsedDetailRequest =
  | { ok: true; metric: DetailMetric | null; dealIds: string[] }
  | { ok: false; response: NextResponse };

type PartnerMetricsSnapshotPayload = {
  partnerMetrics: Array<{
    parceiro?: string | null;
    deals?: Array<{
      dealId?: string | number | null;
    }>;
  }>;
};

type SnapshotEnvelope = {
  payload?: Partial<PartnerMetricsSnapshotPayload> | null;
};

const DETAIL_METRICS = new Set<DetailMetric>(["r1", "propostas", "contratos", "tcv", "faturamento", "comissao"]);
const SNAPSHOT_PATH = path.join(process.cwd(), "data", "partner-metrics-snapshot.json");

function badRequest() {
  return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
}

function isDetailMetric(value: unknown): value is DetailMetric {
  return typeof value === "string" && DETAIL_METRICS.has(value as DetailMetric);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizePartnerName(value: string): string {
  return normalizeText(value).replace(/\s+/g, " ");
}

function isSamePartnerName(left: string, right: string): boolean {
  return normalizePartnerName(left) === normalizePartnerName(right);
}

async function parseDetailRequest(request: NextRequest): Promise<ParsedDetailRequest> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { ok: false, response: badRequest() };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, response: badRequest() };
  }

  const payload = body as { metric?: unknown; dealIds?: unknown };

  if (payload.metric !== undefined && !isDetailMetric(payload.metric)) {
    return { ok: false, response: badRequest() };
  }

  if (payload.dealIds !== undefined && !Array.isArray(payload.dealIds)) {
    return { ok: false, response: badRequest() };
  }

  const metric = payload.metric === undefined ? null : payload.metric;
  const rawDealIds = payload.dealIds ?? [];
  const dealIds: string[] = [];

  for (const rawDealId of rawDealIds) {
    if (typeof rawDealId !== "string" && typeof rawDealId !== "number") {
      return { ok: false, response: badRequest() };
    }

    const dealId = String(rawDealId).trim();
    if (dealId) dealIds.push(dealId);
  }

  return {
    ok: true,
    metric,
    dealIds: [...new Set(dealIds)],
  };
}

function normalizeSnapshotPayload(payload: SnapshotEnvelope["payload"]): PartnerMetricsSnapshotPayload | null {
  if (!payload || !Array.isArray(payload.partnerMetrics)) return null;

  return {
    partnerMetrics: payload.partnerMetrics,
  };
}

async function getAllowedDealIdsForPartner(partnerName: string) {
  const raw = await readFile(SNAPSHOT_PATH, "utf8");
  const parsed = JSON.parse(raw) as SnapshotEnvelope;
  const payload = normalizeSnapshotPayload(parsed.payload);

  if (!payload) {
    throw new Error("Partner metrics snapshot unavailable.");
  }

  const allowedDealIds = new Set<string>();

  for (const partnerMetric of payload.partnerMetrics) {
    if (!isSamePartnerName(String(partnerMetric.parceiro ?? ""), partnerName)) continue;

    for (const deal of partnerMetric.deals ?? []) {
      const dealId = String(deal.dealId ?? "").trim();
      if (dealId) allowedDealIds.add(dealId);
    }
  }

  return allowedDealIds;
}

async function isPartnerDealScopeAllowed(partnerName: string, dealIds: string[]) {
  const allowedDealIds = await getAllowedDealIdsForPartner(partnerName);

  return dealIds.every((dealId) => allowedDealIds.has(dealId));
}

async function hubspotFetch<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Falha no HubSpot (${resp.status}): ${text.slice(0, 280)}`);
  }

  return (await resp.json()) as T;
}

function propertiesForMetric(metric: DetailMetric): string[] {
  if (metric === "r1") return ["servico_qualificado", "hubspot_owner_id"];
  if (metric === "propostas") return ["servico_em_proposta", "hubspot_owner_id"];
  return ["servico_contratado_galapos", "hubspot_owner_id"];
}

function serviceFromMetric(metric: DetailMetric, properties: Record<string, string | null | undefined>) {
  if (metric === "r1") return String(properties.servico_qualificado ?? "").trim();
  if (metric === "propostas") return String(properties.servico_em_proposta ?? "").trim();
  return String(properties.servico_contratado_galapos ?? "").trim();
}

async function fetchDealsByIds(token: string, dealIds: string[], properties: string[]) {
  const results: HubspotDeal[] = [];

  for (let i = 0; i < dealIds.length; i += 100) {
    const chunk = dealIds.slice(i, i + 100);
    const payload = await hubspotFetch<{ results?: HubspotDeal[] }>(
      token,
      "https://api.hubapi.com/crm/v3/objects/deals/batch/read",
      {
        method: "POST",
        body: JSON.stringify({
          properties,
          inputs: chunk.map((id) => ({ id })),
        }),
      }
    );
    results.push(...(payload.results ?? []));
  }

  return results;
}

async function fetchOwnerName(token: string, ownerId: string): Promise<string> {
  const cleanId = String(ownerId ?? "").trim();
  if (!cleanId) return "";

  for (const archived of [false, true]) {
    try {
      const payload = await hubspotFetch<{
        id?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
      }>(
        token,
        `https://api.hubapi.com/crm/v3/owners/${encodeURIComponent(cleanId)}?idProperty=id&archived=${archived}`
      );

      const fullName = [payload.firstName, payload.lastName].filter(Boolean).join(" ").trim();
      if (fullName) return fullName;
      if (payload.email) return payload.email;
    } catch {
      // Tenta novamente com archived=true ou cai no fallback.
    }
  }

  return cleanId;
}

async function fetchOwnerMap(token: string, ownerIds: string[]) {
  const uniqueIds = [...new Set(ownerIds.map((id) => String(id).trim()).filter(Boolean))];
  const entries = await Promise.all(
    uniqueIds.map(async (ownerId) => [ownerId, await fetchOwnerName(token, ownerId)] as const)
  );
  return Object.fromEntries(entries);
}

export async function POST(request: NextRequest) {
  let decision: ManagedAccessAllowedDecision;

  try {
    const session = await getServerSession(authOptions);
    const accessDecision = await getManagedAccessDecision(session?.user?.email);

    if (accessDecision.access === "unauthenticated") {
      return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    if (accessDecision.access === "forbidden") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    decision = accessDecision;
  } catch {
    return NextResponse.json({ error: "Erro ao validar acesso." }, { status: 500 });
  }

  try {
    const parsedRequest = await parseDetailRequest(request);
    if (!parsedRequest.ok) return parsedRequest.response;

    if (!parsedRequest.metric || parsedRequest.dealIds.length === 0) {
      return NextResponse.json({ details: [] satisfies DetailResponse["details"] });
    }

    const metric = parsedRequest.metric;
    const dealIds = parsedRequest.dealIds;

    if (decision.role === "partner") {
      const partnerName = String(decision.partnerName ?? "").trim();
      const isAllowed = partnerName ? await isPartnerDealScopeAllowed(partnerName, dealIds) : false;

      if (!isAllowed) {
        return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
      }
    }

    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Erro ao carregar detalhes do parceiro" }, { status: 500 });
    }

    const properties = propertiesForMetric(metric);
    const deals = await fetchDealsByIds(token, dealIds, properties);
    const ownerMap = await fetchOwnerMap(
      token,
      deals.map((deal) => String(deal.properties?.hubspot_owner_id ?? "").trim())
    );

    const details = deals.map((deal) => ({
      dealId: String(deal.id ?? "").trim(),
      service: serviceFromMetric(metric, deal.properties ?? {}),
      responsavel: ownerMap[String(deal.properties?.hubspot_owner_id ?? "").trim()] ?? "",
    }));

    return NextResponse.json({ details } satisfies DetailResponse);
  } catch {
    return NextResponse.json({ error: "Erro ao carregar detalhes do parceiro" }, { status: 500 });
  }
}
