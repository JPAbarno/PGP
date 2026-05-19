import { NextRequest, NextResponse } from "next/server";

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

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
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
  try {
    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Token do HubSpot não encontrado. Verifique o .env.local" }, { status: 500 });
    }

    const body = (await request.json()) as { metric?: DetailMetric; dealIds?: string[] };
    const metric = body.metric;
    const dealIds = [...new Set((body.dealIds ?? []).map((id) => String(id).trim()).filter(Boolean))];

    if (!metric || dealIds.length === 0) {
      return NextResponse.json({ details: [] satisfies DetailResponse["details"] });
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
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Erro ao carregar detalhes do parceiro", details: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
