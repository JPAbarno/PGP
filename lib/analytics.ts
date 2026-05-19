import { PartnerDeal, PartnerMetric } from "./mock-data";

export type FilterState = {
  search: string;
  dateFrom: string;
  dateTo: string;
  proprietarioParceiro: string;
  tier: string;
  etapaJornada: string;
  minPropostasEnviadas: string;
  minContratosFechados: string;
  minR1s: string;
  sortBy: keyof Omit<PartnerMetric, "tier" | "deals" | "parceiro" | "etapaJornada" | "estadoMatriz">;
};

export const defaultFilters: FilterState = {
  search: "",
  dateFrom: "",
  dateTo: "",
  proprietarioParceiro: "",
  tier: "",
  etapaJornada: "",
  minPropostasEnviadas: "",
  minContratosFechados: "",
  minR1s: "",
  sortBy: "faturamentoGalapos",
};

function isDealInRange(deal: PartnerDeal, filters: FilterState) {
  const activityTime = new Date(deal.activityDate).getTime();
  const fromTime = filters.dateFrom ? new Date(filters.dateFrom).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = filters.dateTo ? new Date(filters.dateTo).getTime() : Number.POSITIVE_INFINITY;
  return activityTime >= fromTime && activityTime <= toTime;
}

function aggregatePartner(row: PartnerMetric, deals: PartnerDeal[]): PartnerMetric {
  return {
    parceiro: row.parceiro,
    tier: row.tier,
    etapaJornada: row.etapaJornada,
    estadoMatriz: row.estadoMatriz,
    proprietarioParceiro: row.proprietarioParceiro,
    deals,
    contratosFechados: deals.reduce((acc, deal) => acc + deal.contratosFechados, 0),
    propostasEnviadas: deals.reduce((acc, deal) => acc + deal.propostasEnviadas, 0),
    reunioesRealizadas: deals.reduce((acc, deal) => acc + deal.reunioesRealizadas, 0),
    tcvPonderado: deals.reduce((acc, deal) => acc + deal.tcvPonderado, 0),
    faturamentoGalapos: deals.reduce((acc, deal) => acc + deal.faturamentoGalapos, 0),
    comissaoPaga: deals.reduce((acc, deal) => acc + deal.comissaoPaga, 0),
  };
}

function parseMinValue(value: string) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function applyFilters(
  data: PartnerMetric[],
  filters: FilterState,
  options?: { retainEmpty?: boolean }
): PartnerMetric[] {
  const retainEmpty = options?.retainEmpty ?? false;

  return data
    .map((row) => aggregatePartner(row, row.deals.filter((deal) => isDealInRange(deal, filters))))
    .filter((row) => row.parceiro.toLowerCase().includes(filters.search.toLowerCase()))
    .filter((row) => !filters.proprietarioParceiro || row.proprietarioParceiro === filters.proprietarioParceiro)
    .filter((row) => !filters.tier || row.tier === filters.tier)
    .filter((row) => !filters.etapaJornada || row.etapaJornada === filters.etapaJornada)
    .filter((row) => {
      const minPropostas = parseMinValue(filters.minPropostasEnviadas);
      return minPropostas === null || row.propostasEnviadas >= minPropostas;
    })
    .filter((row) => {
      const minContratos = parseMinValue(filters.minContratosFechados);
      return minContratos === null || row.contratosFechados >= minContratos;
    })
    .filter((row) => {
      const minR1s = parseMinValue(filters.minR1s);
      return minR1s === null || row.reunioesRealizadas >= minR1s;
    })
    .filter((row) => retainEmpty || row.deals.length > 0)
    .sort((a, b) => Number(b[filters.sortBy]) - Number(a[filters.sortBy]));
}

export function totalize(data: PartnerMetric[]) {
  return data.reduce(
    (acc, row) => {
      acc.contratosFechados += row.contratosFechados;
      acc.propostasEnviadas += row.propostasEnviadas;
      acc.reunioesRealizadas += row.reunioesRealizadas;
      acc.tcvPonderado += row.tcvPonderado;
      acc.faturamentoGalapos += row.faturamentoGalapos;
      acc.comissaoPaga += row.comissaoPaga;
      return acc;
    },
    {
      contratosFechados: 0,
      propostasEnviadas: 0,
      reunioesRealizadas: 0,
      tcvPonderado: 0,
      faturamentoGalapos: 0,
      comissaoPaga: 0,
    }
  );
}

export type ParetoMetric =
  | "reunioesRealizadas"
  | "propostasEnviadas"
  | "contratosFechados"
  | "tcvPonderado"
  | "faturamentoGalapos"
  | "comissaoPaga";

export type DealMetric = ParetoMetric | "tcvPonderadoProposta";

export function buildPareto(data: PartnerMetric[], metric: ParetoMetric, limit = 8) {
  const ordered = [...data].sort((a, b) => Number(b[metric]) - Number(a[metric]));
  const sorted = ordered.slice(0, limit);
  const total = ordered.reduce((sum, row) => sum + Number(row[metric]), 0);
  let running = 0;

  return sorted.map((row) => {
    const value = Number(row[metric]);
    running += value;
    const deals = row.deals.filter((deal) => dealMetricValue(deal, metric) > 0);
    return {
      parceiro: row.parceiro,
      tier: row.tier,
      value,
      deals,
      cumulativePct: total > 0 ? (running / total) * 100 : 0,
    };
  });
}

export function dealMetricValue(deal: PartnerDeal, metric: DealMetric) {
  return Number(deal[metric]);
}

export function topDealsByMetric(data: PartnerMetric[], stage: PartnerDeal["stage"], metric: DealMetric, limit = 5) {
  return data
    .flatMap((partner) =>
      partner.deals
        .filter((deal) => deal.stage === stage && dealMetricValue(deal, metric) > 0)
        .map((deal) => ({ parceiro: partner.parceiro, ...deal }))
    )
    .sort((a, b) => dealMetricValue(b, metric) - dealMetricValue(a, metric))
    .slice(0, limit);
}

export function lowestTierOneByLastR1(data: PartnerMetric[], limit = 5) {
  const now = Date.now();
  const enriched = data
    .filter((row) => row.tier === "Tier 1")
    .map((row) => {
      const latestR1 = row.deals
        .filter((deal) => deal.reunioesRealizadas > 0)
        .map((deal) => new Date(deal.activityDate).getTime())
        .filter((time) => Number.isFinite(time))
        .sort((a, b) => b - a)[0];

      return {
        ...row,
        lastR1At: latestR1 ? new Date(latestR1).toISOString() : "",
        daysSinceLastR1: latestR1 ? Math.floor((now - latestR1) / (1000 * 60 * 60 * 24)) : Number.POSITIVE_INFINITY,
      };
    })
    .sort((a, b) => b.daysSinceLastR1 - a.daysSinceLastR1 || a.parceiro.localeCompare(b.parceiro, "pt-BR"));

  if (enriched.length <= limit) return enriched;

  const threshold = enriched[limit - 1]?.daysSinceLastR1 ?? Number.POSITIVE_INFINITY;
  return enriched.filter((row) => row.daysSinceLastR1 >= threshold);
}

export function fmtMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function fmtMoneyMil(value: number) {
  const mil = value / 1000;
  return `R$ ${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: mil >= 100 ? 0 : 1,
    maximumFractionDigits: mil >= 100 ? 0 : 1,
  }).format(mil)} mil`;
}

export function fmtNumberMil(value: number) {
  const mil = value / 1000;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: mil >= 100 ? 0 : 1,
    maximumFractionDigits: mil >= 100 ? 0 : 1,
  }).format(mil);
}

export function fmtInt(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
