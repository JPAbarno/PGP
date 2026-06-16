import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getManagedAccessDecision, isSamePartnerName } from "@/lib/access-control";
import type { ManagedAccessAllowedDecision } from "@/lib/access-control";

type HubspotDeal = {
  id: string;
  properties?: Record<string, string | null | undefined>;
};

type HubspotSearchResponse = {
  results?: HubspotDeal[];
  paging?: {
    next?: {
      after?: string;
    };
  };
};

type PowerBiExecuteResponse = {
  results?: Array<{
    tables?: Array<{
      rows?: Array<Record<string, string | number | null>>;
    }>;
  }>;
};

type BillingRow = {
  dealId?: string | number;
  faturamento?: string | number;
  comissao?: string | number;
  dataEmissao?: string | number;
};

type ContractDealMeta = {
  dealId: string;
  parceiro: string;
  dealName: string;
};

type ContractMetric = {
  dealId: string;
  dealName: string;
  parceiro: string;
  closeDate: string | null;
  createDate: string | null;
  status: string;
};

type BillingEntry = {
  dealId: string;
  faturamento: number;
  comissaoPaga: number;
  activityDate: string;
};

type MeetingProperty = {
  name?: string;
  label?: string;
  type?: string;
  options?: Array<{ label?: string; value?: string }>;
};

type MeetingObject = {
  id?: string;
  properties?: Record<string, string | null | undefined>;
};

type PartnerDeal = {
  dealId: string;
  dealName: string;
  stage: "Reunião realizada" | "Proposta enviada" | "Contrato fechado";
  currentStageLabel?: string;
  activityDate: string;
  reunioesRealizadas: number;
  reunioesPosR1: number;
  propostasEnviadas: number;
  contratosFechados: number;
  tcvPonderado: number;
  tcvPonderadoProposta?: number;
  faturamentoGalapos: number;
  comissaoPaga: number;
};

type PartnerMetric = {
  parceiro: string;
  tier: "Tier 1" | "Tier 2";
  etapaJornada: string;
  estadoMatriz: string;
  proprietarioParceiro: string;
  contratosFechados: number;
  propostasEnviadas: number;
  reunioesRealizadas: number;
  tcvPonderado: number;
  faturamentoGalapos: number;
  comissaoPaga: number;
  deals: PartnerDeal[];
};

type ServiceJourneyEvent = {
  dealId: string;
  dealName: string;
  parceiro: string;
  responsavel?: string;
  grupoServico: string;
  metric: "r1" | "postR1" | "proposta" | "contrato";
  activityDate: string;
  currentStageLabel?: string;
};

type MeetingTypeInfo = {
  propertyName: string | null;
  acceptedValues: string[];
};

type PartnerMetricsPayload = {
  partnerMetrics: PartnerMetric[];
  serviceJourneyEvents: ServiceJourneyEvent[];
  contractMetrics: ContractMetric[];
  meta: Record<string, string | number>;
};

type PartnerJourney = {
  tier: "Tier 1" | "Tier 2";
  etapaJornada: string;
  estadoMatriz: string;
  proprietarioParceiro: string;
};

type SnapshotEnvelope = {
  version: number;
  generatedAt: string;
  generatedBy: string;
  durationMs: number;
  payload: PartnerMetricsPayload;
};

const PIPELINE_ID = "117191480";
const CONTRACTS_PIPELINE_ID = "116318129";
const TIER_PIPELINE_ID = "117312133";
const R1_MEETING_TYPE_LABEL = "1ª Reunião - Investigação";
const B2B_CANAL_VALUE = "b2b";
const RESPONSE_CACHE_TTL_MS = 10 * 60 * 1000;
const MEETING_ASSOCIATION_CONCURRENCY = 8;
const CACHE_VERSION = 12;
const SNAPSHOT_PATH = path.join(process.cwd(), "data", "partner-metrics-snapshot.json");

let metricsCache:
  | {
      version: number;
      expiresAt: number;
      payload: PartnerMetricsPayload;
    }
  | null = null;
let refreshPromise: Promise<PartnerMetricsPayload> | null = null;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function splitServiceGroups(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isB2BCanal(value: string | null | undefined): boolean {
  return normalizeText(String(value ?? "")) === B2B_CANAL_VALUE;
}

function parseNumber(value: string | number | null | undefined): number {
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

function shortDealName(value: string): string {
  const name = String(value ?? "").trim();
  if (!name) return "";
  return name.split("|")[0]?.trim() || name;
}

function classifyStage(label: string): PartnerDeal["stage"] | null {
  const normalized = normalizeText(label);
  if (normalized === "reuniao realizada" || normalized === "analises e apresentacoes") {
    return "Reunião realizada";
  }
  if (normalized === "contrato fechado") {
    return "Contrato fechado";
  }
  return null;
}

function tierForPartner(value?: string | null): "Tier 1" | "Tier 2" {
  const normalized = normalizeText(String(value ?? ""));
  return normalized === "tier 1" || normalized === "tier1" ? "Tier 1" : "Tier 2";
}

function pickActivityDate(properties: Record<string, string | null | undefined>, stage: PartnerDeal["stage"], latestR1At: string): string {
  if (stage === "Contrato fechado" && properties.closedate) return String(properties.closedate);
  if (stage === "Proposta enviada" && properties.data_do_envio_da_proposta) {
    return String(properties.data_do_envio_da_proposta);
  }
  if (latestR1At) return latestR1At;
  return String(
    properties.data_da_1a_reuniao ??
      properties.data_do_envio_da_proposta ??
      properties.closedate ??
      properties.createdate ??
      ""
  );
}

function computeWeightedTcv(stage: PartnerDeal["stage"], properties: Record<string, string | null | undefined>): number {
  if (stage === "Contrato fechado") {
    return parseNumber(properties.tcv_ponderado);
  }
  if (stage === "Proposta enviada") {
    return parseNumber(properties.tcv_ponderado_proposta);
  }
  return 0;
}

async function hubspotFetch<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const resp = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (resp.ok) {
      return (await resp.json()) as T;
    }

    const text = await resp.text();
    if ((resp.status === 429 || resp.status === 502 || resp.status === 503 || resp.status === 504) && attempt < 3) {
      const retryAfterSeconds = Number(resp.headers.get("retry-after") ?? "0");
      const backoffMs =
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds * 1000
          : resp.status === 429
            ? 800 * (attempt + 1)
            : 1500 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      continue;
    }

    throw new Error(`Falha no HubSpot (${resp.status}): ${text.slice(0, 280)}`);
  }

  throw new Error("Falha no HubSpot: retries esgotados.");
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
      // tenta com archived=true e depois cai no fallback
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

async function getHubspotSearchPage(
  token: string,
  pipelineId: string,
  properties: string[],
  extraFilters: Array<{ propertyName: string; operator: string; value: string }> = [],
  after?: string
): Promise<HubspotSearchResponse> {
  return hubspotFetch<HubspotSearchResponse>(token, "https://api.hubapi.com/crm/v3/objects/deals/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [{ propertyName: "pipeline", operator: "EQ", value: pipelineId }, ...extraFilters],
        },
      ],
      properties,
      limit: 100,
      after,
      sorts: ["-hs_lastmodifieddate"],
    }),
  });
}

async function fetchAllDealsByPipeline(
  token: string,
  pipelineId: string,
  properties: string[],
  extraFilters: Array<{ propertyName: string; operator: string; value: string }> = []
): Promise<HubspotDeal[]> {
  const first = await getHubspotSearchPage(token, pipelineId, properties, extraFilters);
  const deals: HubspotDeal[] = [...(first.results ?? [])];
  let after = first.paging?.next?.after;
  const seenAfter = new Set<string>();

  for (let page = 0; page < 200 && after; page += 1) {
    if (seenAfter.has(after)) break;
    seenAfter.add(after);
    const next = await getHubspotSearchPage(token, pipelineId, properties, extraFilters, after);
    deals.push(...(next.results ?? []));
    after = next.paging?.next?.after;
  }

  return deals;
}

async function getStageMap(token: string, pipelineId: string): Promise<Record<string, string>> {
  const payload = await hubspotFetch<{ stages?: Array<{ id?: string; label?: string }> }>(
    token,
    `https://api.hubapi.com/crm/v3/pipelines/deals/${pipelineId}`
  );
  return Object.fromEntries(
    (payload.stages ?? []).map((stage) => [String(stage.id ?? "").trim(), String(stage.label ?? "").trim()])
  );
}

async function getMeetingTypeInfo(token: string): Promise<MeetingTypeInfo> {
  const payload = await hubspotFetch<{ results?: MeetingProperty[] }>(
    token,
    "https://api.hubapi.com/crm/v3/properties/meetings"
  );

  const candidates = [
    "hs_activity_type",
    "tipo_de_reuniao",
    "tipo_reuniao",
    "meeting_type",
    "tipo da reuniao",
    "tipo de reuniao",
  ];

  const props = payload.results ?? [];
  for (const candidate of candidates) {
    const found = props.find(
      (prop) =>
        normalizeText(String(prop.name ?? "")) === normalizeText(candidate) ||
        normalizeText(String(prop.label ?? "")) === normalizeText(candidate)
    );
    if (!found) continue;

    const acceptedValues = new Set<string>([normalizeText(R1_MEETING_TYPE_LABEL)]);
    for (const option of found.options ?? []) {
      if (normalizeText(String(option.label ?? "")) === normalizeText(R1_MEETING_TYPE_LABEL)) {
        acceptedValues.add(normalizeText(String(option.label ?? "")));
        acceptedValues.add(normalizeText(String(option.value ?? "")));
      }
    }

    return {
      propertyName: found.name ? String(found.name) : null,
      acceptedValues: [...acceptedValues].filter(Boolean),
    };
  }

  return {
    propertyName: null,
    acceptedValues: [normalizeText(R1_MEETING_TYPE_LABEL)],
  };
}

async function fetchMeetingIdsByDeal(token: string, dealIds: string[]): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};

  for (let i = 0; i < dealIds.length; i += MEETING_ASSOCIATION_CONCURRENCY) {
    const chunk = dealIds.slice(i, i + MEETING_ASSOCIATION_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async (dealId) => {
        const payload = await hubspotFetch<{ results?: Array<{ toObjectId?: number | string }> }>(
          token,
          `https://api.hubapi.com/crm/v4/objects/deals/${encodeURIComponent(dealId)}/associations/meetings`
        );

        return {
          dealId,
          meetingIds: (payload.results ?? [])
            .map((item) => String(item.toObjectId ?? "").trim())
            .filter(Boolean),
        };
      })
    );

    for (const item of chunkResults) {
      result[item.dealId] = item.meetingIds;
    }
  }

  return result;
}

async function fetchMeetingsByIds(
  token: string,
  meetingIds: string[],
  meetingTypePropertyName: string | null
): Promise<Record<string, MeetingObject>> {
  if (meetingIds.length === 0) return {};

  const properties = ["hs_timestamp", "hs_meeting_start_time", "hs_createdate"];
  if (meetingTypePropertyName) properties.push(meetingTypePropertyName);

  const map: Record<string, MeetingObject> = {};
  for (let i = 0; i < meetingIds.length; i += 100) {
    const chunk = meetingIds.slice(i, i + 100);
    const payload = await hubspotFetch<{ results?: MeetingObject[] }>(
      token,
      "https://api.hubapi.com/crm/v3/objects/meetings/batch/read",
      {
        method: "POST",
        body: JSON.stringify({
          properties,
          inputs: chunk.map((id) => ({ id })),
        }),
      }
    );

    for (const meeting of payload.results ?? []) {
      const id = String(meeting.id ?? "").trim();
      if (id) map[id] = meeting;
    }
  }

  return map;
}

function meetingTimestamp(properties?: Record<string, string | null | undefined>): string {
  return String(properties?.hs_meeting_start_time ?? properties?.hs_timestamp ?? properties?.hs_createdate ?? "").trim();
}

function isInvestigationMeeting(meeting: MeetingObject | undefined, meetingTypeInfo: MeetingTypeInfo): boolean {
  if (!meeting) return false;

  const properties = meeting.properties ?? {};

  if (meetingTypeInfo.propertyName) {
    const raw = normalizeText(String(properties[meetingTypeInfo.propertyName] ?? "").trim());
    if (meetingTypeInfo.acceptedValues.includes(raw)) return true;
  }

  return Object.values(properties).some((value) =>
    meetingTypeInfo.acceptedValues.includes(normalizeText(String(value ?? "")))
  );
}

async function fetchR1SummaryByDeal(
  token: string,
  dealIds: string[]
): Promise<Record<string, { count: number; latestAt: string; postR1MeetingsAt: string[] }>> {
  if (dealIds.length === 0) return {};

  const meetingTypeInfo = await getMeetingTypeInfo(token);
  const meetingIdsByDeal = await fetchMeetingIdsByDeal(token, dealIds);
  const uniqueMeetingIds = [...new Set(Object.values(meetingIdsByDeal).flat())];
  const meetingsById = await fetchMeetingsByIds(token, uniqueMeetingIds, meetingTypeInfo.propertyName);
  const summary: Record<string, { count: number; latestAt: string; postR1MeetingsAt: string[] }> = {};

  for (const dealId of dealIds) {
    const meetings = (meetingIdsByDeal[dealId] ?? [])
      .map((meetingId) => meetingsById[meetingId])
      .filter((meeting): meeting is MeetingObject => Boolean(meeting))
      .filter((meeting) => isInvestigationMeeting(meeting, meetingTypeInfo));

    let latestAt = "";
    let latestMs = 0;
    let firstR1Ms = Number.POSITIVE_INFINITY;
    for (const meeting of meetings) {
      const timestamp = meetingTimestamp(meeting.properties);
      const ms = new Date(timestamp).getTime();
      if (Number.isFinite(ms) && ms < firstR1Ms) {
        firstR1Ms = ms;
      }
      if (Number.isFinite(ms) && ms > latestMs) {
        latestMs = ms;
        latestAt = timestamp;
      }
    }

    const postR1MeetingsAt = (meetingIdsByDeal[dealId] ?? [])
      .map((meetingId) => meetingsById[meetingId])
      .filter((meeting): meeting is MeetingObject => Boolean(meeting))
      .map((meeting) => meetingTimestamp(meeting.properties))
      .filter((timestamp) => {
        const ms = new Date(timestamp).getTime();
        return Number.isFinite(ms) && Number.isFinite(firstR1Ms) && ms > firstR1Ms;
      })
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    summary[dealId] = { count: meetings.length, latestAt, postR1MeetingsAt };
  }

  return summary;
}

async function fetchTierByPartner(token: string, stageMap: Record<string, string>): Promise<Record<string, PartnerJourney>> {
  const deals = await fetchAllDealsByPipeline(token, TIER_PIPELINE_ID, [
    "parceiro",
    "tier_parceiro",
    "dealstage",
    "estado__matriz_",
    "hubspot_owner_id",
    "canal",
  ]);
  const ownerMap = await fetchOwnerMap(
    token,
    deals.map((deal) => String(deal.properties?.hubspot_owner_id ?? "").trim())
  );
  const map: Record<string, PartnerJourney> = {};

  for (const deal of deals) {
    if (!isB2BCanal(deal.properties?.canal)) continue;
    const parceiro = String(deal.properties?.parceiro ?? "").trim();
    const tier = tierForPartner(deal.properties?.tier_parceiro);
    const stageId = String(deal.properties?.dealstage ?? "").trim();
    const etapaJornada = (stageMap[stageId] ?? stageId) || "-";
    const estadoMatriz = String(deal.properties?.estado__matriz_ ?? "").trim() || "-";
    const proprietarioParceiro =
      (ownerMap[String(deal.properties?.hubspot_owner_id ?? "").trim()] ??
        String(deal.properties?.hubspot_owner_id ?? "").trim()) || "-";
    if (!parceiro) continue;
    if (!map[parceiro] || tier === "Tier 1") {
      map[parceiro] = { tier, etapaJornada, estadoMatriz, proprietarioParceiro };
    }
  }

  return map;
}

async function getPowerBiToken(): Promise<string> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Variáveis AZURE_TENANT_ID, AZURE_CLIENT_ID e AZURE_CLIENT_SECRET são obrigatórias.");
  }

  const tokenResp = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://analysis.windows.net/powerbi/api/.default",
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!tokenResp.ok) {
    const text = await tokenResp.text();
    throw new Error(`Falha ao autenticar no Azure AD (${tokenResp.status}): ${text.slice(0, 200)}`);
  }

  const payload = (await tokenResp.json()) as { access_token?: string };
  if (!payload.access_token) throw new Error("Azure AD não retornou access_token.");
  return payload.access_token;
}

function extractColumnName(rawKey: string): string {
  const quotedMatch = rawKey.match(/\[(.*)\]/);
  if (quotedMatch?.[1]) return quotedMatch[1];
  return rawKey;
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function pickColumn(columns: string[], aliases: string[]): string | undefined {
  const normalizedColumns = columns.map((c) => ({ raw: c, key: normalizeKey(c) }));

  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const exact = normalizedColumns.find((c) => c.key === target);
    if (exact) return exact.raw;
  }

  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const partial = normalizedColumns.find((c) => c.key.includes(target) || target.includes(c.key));
    if (partial) return partial.raw;
  }

  return undefined;
}

async function executePowerBiQuery(accessToken: string, datasetId: string, query: string): Promise<PowerBiExecuteResponse> {
  const resp = await fetch(`https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}/executeQueries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queries: [{ query }],
      serializerSettings: { includeNulls: true },
    }),
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Falha no Power BI (${resp.status}): ${text.slice(0, 300)}`);
  }

  return (await resp.json()) as PowerBiExecuteResponse;
}

async function fetchBillingEntriesByDealId(dealIds: string[]): Promise<BillingEntry[]> {
  const datasetId = process.env.POWERBI_DATASET_ID;
  if (!datasetId || dealIds.length === 0) return [];

  const accessToken = await getPowerBiToken();
  const probe = await executePowerBiQuery(accessToken, datasetId, "EVALUATE TOPN(1, 'Fato_CR_Pagos')");
  const probeRow = probe.results?.[0]?.tables?.[0]?.rows?.[0] ?? {};
  const columns = Object.keys(probeRow).map(extractColumnName);
  const valorColumn =
    pickColumn(columns, [
      "Valor recebido da parcela líquido de impostos (R$)",
      "Valor recebido da parcela liquido de impostos (R$)",
      "Valor recebido da parcela (R$)",
      "Valor recebido da parcela",
      "Receita Líquida",
      "Valor cheio recebido da parcela (R$)",
    ]) ?? "Receita Líquida";
  const dataEmissaoColumn =
    pickColumn(columns, [
      "Data de emissão",
      "Data de emissao",
    ]) ?? "Data de emissão";

  const chunks: string[][] = [];
  for (let i = 0; i < dealIds.length; i += 100) chunks.push(dealIds.slice(i, i + 100));
  const entries: BillingEntry[] = [];

  for (const chunk of chunks) {
    const daxDealIds = chunk.map((id) => `"${String(id).replace(/"/g, '""')}"`).join(", ");
    const query = [
      "EVALUATE",
      "SELECTCOLUMNS(",
      "  SUMMARIZECOLUMNS(",
      "    'Fato_CR_Pagos'[ID do Registro],",
      `    'Fato_CR_Pagos'[${dataEmissaoColumn.replace(/"/g, '""')}],`,
      "    FILTER(",
      "      'Fato_CR_Pagos',",
      `      FORMAT('Fato_CR_Pagos'[ID do Registro], \"\") IN { ${daxDealIds} }`,
      "    ),",
      `    \"faturamento\", SUM('Fato_CR_Pagos'[${valorColumn.replace(/"/g, '""')}]),`,
      "    \"comissao\", [Comissão Parceiro]",
      "  ),",
      `  \"dealId\", FORMAT('Fato_CR_Pagos'[ID do Registro], \"\"),`,
      `  \"dataEmissao\", 'Fato_CR_Pagos'[${dataEmissaoColumn.replace(/"/g, '""')}],`,
      `  \"faturamento\", [faturamento],`,
      `  \"comissao\", [comissao]`,
      ")",
    ].join("\n");

    const payload = await executePowerBiQuery(accessToken, datasetId, query);
    const rows: BillingRow[] =
      payload.results?.[0]?.tables?.[0]?.rows?.map((row) => ({
        dealId: row.dealId ?? row["[dealId]"] ?? undefined,
        dataEmissao: row.dataEmissao ?? row["[dataEmissao]"] ?? undefined,
        faturamento: row.faturamento ?? row["[faturamento]"] ?? undefined,
        comissao: row.comissao ?? row["[comissao]"] ?? undefined,
      })) ?? [];

    for (const row of rows) {
      const dealId = String(row.dealId ?? "").trim();
      if (!dealId) continue;
      const activityDate = String(row.dataEmissao ?? "").trim();
      entries.push({
        dealId,
        faturamento: parseNumber(row.faturamento),
        comissaoPaga: parseNumber(row.comissao),
        activityDate,
      });
    }
  }

  return entries.filter((entry) => (entry.faturamento > 0 || entry.comissaoPaga > 0) && entry.activityDate);
}

function aggregatePartner(partner: string, deals: PartnerDeal[], journeyByPartner: Record<string, PartnerJourney>): PartnerMetric {
  return {
    parceiro: partner,
    tier: journeyByPartner[partner]?.tier ?? "Tier 2",
    etapaJornada: journeyByPartner[partner]?.etapaJornada ?? "-",
    estadoMatriz: journeyByPartner[partner]?.estadoMatriz ?? "-",
    proprietarioParceiro: journeyByPartner[partner]?.proprietarioParceiro ?? "-",
    deals,
    contratosFechados: deals.reduce((sum, deal) => sum + deal.contratosFechados, 0),
    propostasEnviadas: deals.reduce((sum, deal) => sum + deal.propostasEnviadas, 0),
    reunioesRealizadas: deals.reduce((sum, deal) => sum + deal.reunioesRealizadas, 0),
    tcvPonderado: deals.reduce((sum, deal) => sum + deal.tcvPonderado, 0),
    faturamentoGalapos: deals.reduce((sum, deal) => sum + deal.faturamentoGalapos, 0),
    comissaoPaga: deals.reduce((sum, deal) => sum + deal.comissaoPaga, 0),
  };
}

export async function buildMetricsPayload() {
    const hubspotToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    if (!hubspotToken) {
      throw new Error("Token do HubSpot não encontrado. Verifique o .env.local");
    }

    const [stageMap, journeyStageMap, contractStageMap, deals] = await Promise.all([
      getStageMap(hubspotToken, PIPELINE_ID),
      getStageMap(hubspotToken, TIER_PIPELINE_ID),
      getStageMap(hubspotToken, CONTRACTS_PIPELINE_ID),
      fetchAllDealsByPipeline(
        hubspotToken,
        PIPELINE_ID,
        [
          "dealname",
          "dealstage",
          "parceiro",
          "canal",
          "createdate",
          "closedate",
          "data_da_1a_reuniao",
          "data_do_envio_da_proposta",
          "tcv_ponderado_proposta",
          "tcv_ponderado",
          "hubspot_owner_id",
          "grupo_de_servicos__qualificado",
          "grupo_de_servicos__proposta",
          "grupo_de_servicos__contrato",
        ]
      )
    ]);

    const journeyByPartner = await fetchTierByPartner(hubspotToken, journeyStageMap);

    const contractDealsRaw = await fetchAllDealsByPipeline(
      hubspotToken,
      CONTRACTS_PIPELINE_ID,
      ["dealname", "parceiro", "canal", "closedate", "createdate", "dealstage"]
    );

    const contractDeals: ContractDealMeta[] = contractDealsRaw
      .filter((deal) => isB2BCanal(deal.properties?.canal))
      .map((deal) => ({
        dealId: String(deal.id),
        parceiro: String(deal.properties?.parceiro ?? "").trim(),
        dealName: shortDealName(String(deal.properties?.dealname ?? "").trim() || String(deal.id)),
      }))
      .filter((deal) => deal.parceiro);

    const contractMetrics: ContractMetric[] = contractDealsRaw
      .filter((deal) => isB2BCanal(deal.properties?.canal))
      .map((deal) => {
        const stageId = String(deal.properties?.dealstage ?? "").trim();
        const rawCloseDate = String(deal.properties?.closedate ?? "").trim();
        const rawCreateDate = String(deal.properties?.createdate ?? "").trim();
        return {
          dealId: String(deal.id),
          dealName: shortDealName(String(deal.properties?.dealname ?? "").trim() || String(deal.id)),
          parceiro: String(deal.properties?.parceiro ?? "").trim(),
          closeDate: rawCloseDate || null,
          createDate: rawCreateDate || null,
          status: contractStageMap[stageId] ?? "",
        };
      })
      .filter((metric) => metric.parceiro);

    const filteredDeals = deals
      .map((deal) => {
        const properties = deal.properties ?? {};
        if (!isB2BCanal(properties.canal)) return null;
        const partner = String(properties.parceiro ?? "").trim();
        const stageId = String(properties.dealstage ?? "").trim();
        const stageLabel = stageMap[stageId] ?? stageId;
        const currentStage = classifyStage(stageLabel);
        if (!partner) return null;
        return { id: String(deal.id), properties, currentStage, currentStageLabel: stageLabel };
      })
      .filter(
        (
          deal
        ): deal is {
          id: string;
          properties: Record<string, string | null | undefined>;
          currentStage: PartnerDeal["stage"] | null;
          currentStageLabel: string;
        } => Boolean(deal)
      );

    const allPipelineDeals = deals
      .map((deal) => {
        const properties = deal.properties ?? {};
        const stageId = String(properties.dealstage ?? "").trim();
        const stageLabel = stageMap[stageId] ?? stageId;
        const currentStage = classifyStage(stageLabel);
        return { id: String(deal.id), properties, currentStage, currentStageLabel: stageLabel };
      })
      .filter(
        (
          deal
        ): deal is {
          id: string;
          properties: Record<string, string | null | undefined>;
          currentStage: PartnerDeal["stage"] | null;
          currentStageLabel: string;
        } => Boolean(deal)
      );

    const r1CandidateDeals = allPipelineDeals.filter(
      (deal) =>
        deal.currentStage === "Reunião realizada" ||
        Boolean(String(deal.properties.data_da_1a_reuniao ?? "").trim())
    );

    const [billingEntries, r1ByDeal] = await Promise.all([
      fetchBillingEntriesByDealId(contractDeals.map((deal) => deal.dealId)),
      fetchR1SummaryByDeal(
        hubspotToken,
        [...new Set(r1CandidateDeals.map((deal) => deal.id))]
      ),
    ]);

    const ownerMap = await fetchOwnerMap(
      hubspotToken,
      allPipelineDeals.map((deal) => String(deal.properties.hubspot_owner_id ?? "").trim())
    );

    const byPartner = new Map<string, PartnerDeal[]>();
    const contractDealsById = new Map(contractDeals.map((deal) => [deal.dealId, deal] as const));

    for (const deal of filteredDeals) {
      const partner = String(deal.properties.parceiro ?? "").trim();
      const dealName = shortDealName(String(deal.properties.dealname ?? "").trim() || deal.id);
      const r1 = r1ByDeal[deal.id] ?? { count: 0, latestAt: "", postR1MeetingsAt: [] };
      const partnerDeals = byPartner.get(partner) ?? [];

      if (r1.count > 0) {
        partnerDeals.push({
          dealId: deal.id,
          dealName,
          stage: "Reunião realizada",
          currentStageLabel: deal.currentStageLabel,
          activityDate: pickActivityDate(deal.properties, "Reunião realizada", r1.latestAt),
          reunioesRealizadas: r1.count,
          reunioesPosR1: 0,
          propostasEnviadas: 0,
          contratosFechados: 0,
          tcvPonderado: 0,
          tcvPonderadoProposta: 0,
          faturamentoGalapos: 0,
          comissaoPaga: 0,
        });
      }

      for (const meetingAt of r1.postR1MeetingsAt) {
        partnerDeals.push({
          dealId: deal.id,
          dealName,
          stage: "Reunião realizada",
          currentStageLabel: deal.currentStageLabel,
          activityDate: meetingAt,
          reunioesRealizadas: 0,
          reunioesPosR1: 1,
          propostasEnviadas: 0,
          contratosFechados: 0,
          tcvPonderado: 0,
          tcvPonderadoProposta: 0,
          faturamentoGalapos: 0,
          comissaoPaga: 0,
        });
      }

      if (String(deal.properties.data_do_envio_da_proposta ?? "").trim()) {
        partnerDeals.push({
          dealId: deal.id,
          dealName,
          stage: "Proposta enviada",
          currentStageLabel: deal.currentStageLabel,
          activityDate: pickActivityDate(deal.properties, "Proposta enviada", r1.latestAt),
          reunioesRealizadas: 0,
          reunioesPosR1: 0,
          propostasEnviadas: 1,
          contratosFechados: 0,
          tcvPonderado: 0,
          tcvPonderadoProposta: computeWeightedTcv("Proposta enviada", deal.properties),
          faturamentoGalapos: 0,
          comissaoPaga: 0,
        });
      }

      if (deal.currentStage === "Contrato fechado") {
        partnerDeals.push({
          dealId: deal.id,
          dealName,
          stage: "Contrato fechado",
          currentStageLabel: deal.currentStageLabel,
          activityDate: pickActivityDate(deal.properties, "Contrato fechado", r1.latestAt),
          reunioesRealizadas: 0,
          reunioesPosR1: 0,
          propostasEnviadas: 0,
          contratosFechados: 1,
          tcvPonderado: computeWeightedTcv("Contrato fechado", deal.properties),
          tcvPonderadoProposta: 0,
          faturamentoGalapos: 0,
          comissaoPaga: 0,
        });
      }

      byPartner.set(partner, partnerDeals);
    }

    for (const entry of billingEntries) {
      const contractDeal = contractDealsById.get(entry.dealId);
      if (!contractDeal) continue;
      const partnerDeals = byPartner.get(contractDeal.parceiro) ?? [];
      partnerDeals.push({
        dealId: entry.dealId,
        dealName: contractDeal.dealName,
        stage: "Contrato fechado",
        currentStageLabel: "Contrato fechado",
        activityDate: entry.activityDate,
        reunioesRealizadas: 0,
        reunioesPosR1: 0,
        propostasEnviadas: 0,
        contratosFechados: 0,
        tcvPonderado: 0,
        tcvPonderadoProposta: 0,
        faturamentoGalapos: entry.faturamento,
        comissaoPaga: entry.comissaoPaga,
      });
      byPartner.set(contractDeal.parceiro, partnerDeals);
    }

    const partnerMetrics: PartnerMetric[] = Array.from(byPartner.entries())
      .map(([partner, partnerDeals]) => aggregatePartner(partner, partnerDeals, journeyByPartner))
      .sort((a, b) => b.faturamentoGalapos - a.faturamentoGalapos);

    const serviceJourneyEvents: ServiceJourneyEvent[] = [];

    for (const deal of allPipelineDeals) {
      const r1 = r1ByDeal[deal.id] ?? { count: 0, latestAt: "", postR1MeetingsAt: [] };
      const gruposQualificados = splitServiceGroups(deal.properties.grupo_de_servicos__qualificado);
      const gruposProposta = splitServiceGroups(deal.properties.grupo_de_servicos__proposta);
      const gruposContrato = splitServiceGroups(deal.properties.grupo_de_servicos__contrato);
      const propostaDate = String(deal.properties.data_do_envio_da_proposta ?? "").trim();
      const closeDate = String(deal.properties.closedate ?? "").trim();

      if (r1.count > 0 && r1.latestAt) {
        for (const grupoServico of gruposQualificados) {
          serviceJourneyEvents.push({
            dealId: deal.id,
            dealName: shortDealName(String(deal.properties.dealname ?? "").trim() || deal.id),
            parceiro: String(deal.properties.parceiro ?? "").trim(),
            responsavel:
              ownerMap[String(deal.properties.hubspot_owner_id ?? "").trim()] ??
              String(deal.properties.hubspot_owner_id ?? "").trim(),
            grupoServico,
            metric: "r1",
            activityDate: r1.latestAt,
            currentStageLabel: deal.currentStageLabel,
          });
        }
      }

      if (gruposQualificados.length > 0) {
        for (const meetingAt of r1.postR1MeetingsAt) {
          if (!String(meetingAt ?? "").trim()) continue;
          for (const grupoServico of gruposQualificados) {
            serviceJourneyEvents.push({
              dealId: deal.id,
              dealName: shortDealName(String(deal.properties.dealname ?? "").trim() || deal.id),
              parceiro: String(deal.properties.parceiro ?? "").trim(),
              responsavel:
                ownerMap[String(deal.properties.hubspot_owner_id ?? "").trim()] ??
                String(deal.properties.hubspot_owner_id ?? "").trim(),
              grupoServico,
              metric: "postR1",
              activityDate: meetingAt,
              currentStageLabel: deal.currentStageLabel,
            });
          }
        }
      }

      if (propostaDate) {
        for (const grupoServico of gruposProposta) {
          serviceJourneyEvents.push({
            dealId: deal.id,
            dealName: shortDealName(String(deal.properties.dealname ?? "").trim() || deal.id),
            parceiro: String(deal.properties.parceiro ?? "").trim(),
            responsavel:
              ownerMap[String(deal.properties.hubspot_owner_id ?? "").trim()] ??
              String(deal.properties.hubspot_owner_id ?? "").trim(),
            grupoServico,
            metric: "proposta",
            activityDate: propostaDate,
            currentStageLabel: deal.currentStageLabel,
          });
        }
      }

      if (deal.currentStage === "Contrato fechado" && closeDate) {
        for (const grupoServico of gruposContrato) {
          serviceJourneyEvents.push({
            dealId: deal.id,
            dealName: shortDealName(String(deal.properties.dealname ?? "").trim() || deal.id),
            parceiro: String(deal.properties.parceiro ?? "").trim(),
            responsavel:
              ownerMap[String(deal.properties.hubspot_owner_id ?? "").trim()] ??
              String(deal.properties.hubspot_owner_id ?? "").trim(),
            grupoServico,
            metric: "contrato",
            activityDate: closeDate,
            currentStageLabel: deal.currentStageLabel,
          });
        }
      }
    }

    return {
      partnerMetrics,
      serviceJourneyEvents,
      contractMetrics,
      meta: {
        source: "hubspot+powerbi",
        pipelineId: PIPELINE_ID,
        contractsPipelineId: CONTRACTS_PIPELINE_ID,
        tierPipelineId: TIER_PIPELINE_ID,
        partnerCount: partnerMetrics.length,
        dealCount: filteredDeals.length,
        serviceJourneyDealCount: allPipelineDeals.length,
        billingEntryCount: billingEntries.length,
        contractCount: contractMetrics.length,
      },
    };
}

function withSnapshotMeta(payload: PartnerMetricsPayload, generatedAt = ""): PartnerMetricsPayload {
  return {
    ...payload,
    meta: {
      ...payload.meta,
      generatedAt,
    },
  };
}

function uniqueDealIdCount(dealIds: string[]) {
  return new Set(dealIds.map((dealId) => dealId.trim()).filter(Boolean)).size;
}

function applyManagedAccessScope(
  payload: PartnerMetricsPayload,
  decision: ManagedAccessAllowedDecision
): PartnerMetricsPayload {
  if (decision.role !== "partner" || !decision.partnerName) {
    return payload;
  }

  const partnerMetrics = payload.partnerMetrics.filter((metric) =>
    isSamePartnerName(metric.parceiro, decision.partnerName ?? "")
  );
  const serviceJourneyEvents = payload.serviceJourneyEvents.filter((event) =>
    isSamePartnerName(event.parceiro, decision.partnerName ?? "")
  );
  const partnerDeals = partnerMetrics.flatMap((metric) => metric.deals);
  const billingEntryCount = partnerDeals.filter((deal) => deal.faturamentoGalapos > 0 || deal.comissaoPaga > 0).length;

  return {
    ...payload,
    partnerMetrics,
    serviceJourneyEvents,
    meta: {
      ...payload.meta,
      partnerCount: partnerMetrics.length,
      dealCount: uniqueDealIdCount(partnerDeals.map((deal) => deal.dealId)),
      serviceJourneyDealCount: uniqueDealIdCount(serviceJourneyEvents.map((event) => event.dealId)),
      billingEntryCount,
      accessScope: "partner",
      partnerName: decision.partnerName,
    },
  };
}

function normalizeSnapshotPayload(payload: Partial<PartnerMetricsPayload> | null | undefined): PartnerMetricsPayload | null {
  if (!payload || !Array.isArray(payload.partnerMetrics)) return null;
  return {
    partnerMetrics: payload.partnerMetrics,
    serviceJourneyEvents: Array.isArray(payload.serviceJourneyEvents) ? payload.serviceJourneyEvents : [],
    contractMetrics: Array.isArray(payload.contractMetrics) ? payload.contractMetrics : [],
    meta: typeof payload.meta === "object" && payload.meta ? payload.meta : {},
  };
}

async function readSnapshot(): Promise<SnapshotEnvelope | null> {
  try {
    const raw = await readFile(SNAPSHOT_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<SnapshotEnvelope>;
    const payload = normalizeSnapshotPayload(parsed?.payload);
    if (!parsed || !payload) return null;
    return {
      version: Number(parsed.version ?? 0),
      generatedAt: String(parsed.generatedAt ?? ""),
      generatedBy: String(parsed.generatedBy ?? "unknown"),
      durationMs: Number(parsed.durationMs ?? 0),
      payload,
    };
  } catch {
    return null;
  }
}

async function writeSnapshot(payload: PartnerMetricsPayload) {
  await mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
  const snapshot: SnapshotEnvelope = {
    version: CACHE_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy: "unknown",
    durationMs: 0,
    payload,
  };
  await writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot), "utf8");
  return snapshot;
}

export async function refreshMetricsCache(source = "manual") {
  const startedAt = Date.now();
  const payload = await buildMetricsPayload();
  const snapshot = await writeSnapshot({
    ...payload,
    meta: {
      ...payload.meta,
    },
  });
  snapshot.generatedBy = source;
  snapshot.durationMs = Date.now() - startedAt;
  await writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot), "utf8");
  metricsCache = {
    version: CACHE_VERSION,
    expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS,
    payload: {
      ...withSnapshotMeta(payload, snapshot.generatedAt),
      meta: {
        ...payload.meta,
        generatedAt: snapshot.generatedAt,
        generatedBy: snapshot.generatedBy,
        durationMs: snapshot.durationMs,
      },
    },
  };
  return metricsCache.payload;
}

export async function getPartnerMetricsPayload(options?: { refresh?: boolean }) {
  const forceRefresh = options?.refresh ?? false;

  if (metricsCache && metricsCache.version !== CACHE_VERSION) {
    metricsCache = null;
  }

  if (!forceRefresh && metricsCache && metricsCache.expiresAt > Date.now()) {
    return metricsCache.payload;
  }

  if (!forceRefresh && !metricsCache) {
    const snapshot = await readSnapshot();
    if (snapshot) {
      const isCurrentVersion = snapshot.version === CACHE_VERSION;
      metricsCache = {
        version: CACHE_VERSION,
        expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS,
        payload: {
          ...withSnapshotMeta(snapshot.payload, snapshot.generatedAt),
          meta: {
            ...snapshot.payload.meta,
            generatedAt: snapshot.generatedAt,
            generatedBy: snapshot.generatedBy,
            durationMs: snapshot.durationMs,
            stale: isCurrentVersion ? 0 : 1,
            snapshotVersion: snapshot.version,
            expectedSnapshotVersion: CACHE_VERSION,
          },
        },
      };
      if (!isCurrentVersion && !refreshPromise) {
        refreshPromise = refreshMetricsCache("background").finally(() => {
          refreshPromise = null;
        });
      }
      return metricsCache.payload;
    }
  }

  if (!forceRefresh && metricsCache && !refreshPromise) {
    refreshPromise = refreshMetricsCache("background").finally(() => {
      refreshPromise = null;
    });
    return {
      ...metricsCache.payload,
      meta: {
        ...metricsCache.payload.meta,
        stale: 1,
      },
    };
  }

  if (!forceRefresh && refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = refreshMetricsCache(forceRefresh ? "manual" : "cold-start").finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function toPublicPayload(payload: PartnerMetricsPayload): Omit<PartnerMetricsPayload, "contractMetrics"> {
  const publicMeta = { ...payload.meta };
  delete publicMeta.contractCount;

  return {
    partnerMetrics: payload.partnerMetrics,
    serviceJourneyEvents: payload.serviceJourneyEvents,
    meta: publicMeta,
  };
}

export async function GET(request: Request) {
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
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "1";

    if (forceRefresh && decision.role === "partner") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const payload = await getPartnerMetricsPayload({ refresh: forceRefresh });
    return NextResponse.json(toPublicPayload(applyManagedAccessScope(payload, decision)));
  } catch {
    const snapshot = await readSnapshot();
    if (snapshot) {
      const scopedPayload = applyManagedAccessScope(
        withSnapshotMeta(snapshot.payload, snapshot.generatedAt),
        decision
      );
      const publicScopedPayload = toPublicPayload(scopedPayload);
      return NextResponse.json({
        ...publicScopedPayload,
        meta: {
          ...scopedPayload.meta,
          generatedAt: snapshot.generatedAt,
          generatedBy: snapshot.generatedBy,
          durationMs: snapshot.durationMs,
          stale: 1,
          fallbackFromError: 1,
        },
      });
    }
    return NextResponse.json({ error: "Erro ao consolidar dados reais" }, { status: 500 });
  }
}





