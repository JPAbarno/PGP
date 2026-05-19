"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, Dispatch, MouseEvent, SetStateAction } from "react";
import { PartnerDeal, PartnerMetric, ServiceJourneyEvent } from "@/lib/mock-data";
import {
  applyFilters,
  buildPareto,
  defaultFilters,
  FilterState,
  fmtInt,
  fmtMoneyMil,
  fmtNumberMil,
  lowestTierOneByLastR1,
  topDealsByMetric,
  totalize,
} from "@/lib/analytics";

type Mode = "dashboard" | "scorecard";
type ParetoPoint = ReturnType<typeof buildPareto>[number];
type DetailMetric = "r1" | "propostas" | "contratos" | "tcv" | "faturamento" | "comissao";
type HoveredParetoDetails = {
  chartTitle: string;
  parceiro: string;
  deals: PartnerDeal[];
  side: "left" | "right";
  metric: DetailMetric;
  summaryLabel: string;
} | null;
type DetailMetaMap = Record<string, { service: string; responsavel: string }>;

const metricOptions: Array<{ value: FilterState["sortBy"]; label: string }> = [
  { value: "reunioesRealizadas", label: "Reuniões realizadas" },
  { value: "propostasEnviadas", label: "Propostas enviadas" },
  { value: "contratosFechados", label: "Contratos fechados" },
  { value: "tcvPonderado", label: "TCV Ponderado" },
  { value: "faturamentoGalapos", label: "Faturamento Galapos" },
  { value: "comissaoPaga", label: "Comissões Pagas" },
];

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildRelativeRange(days: number) {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - Math.max(days - 1, 0));
  return {
    dateFrom: toDateInputValue(start),
    dateTo: toDateInputValue(end),
  };
}

function buildQuarterRange(year: number, quarter: 1 | 2 | 3 | 4) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));
  return {
    dateFrom: toDateInputValue(start),
    dateTo: toDateInputValue(end),
  };
}

function buildYearRange(year: number) {
  return {
    dateFrom: `${year}-01-01`,
    dateTo: `${year}-12-31`,
  };
}

function csvEscape(value: string | number) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportMoneyInteger(value: number) {
  return String(Math.round(Number(value) || 0));
}

function cardStyle(): CSSProperties {
  return {
    background: "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
  };
}

function badgeStyle(active = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,193,48,0.2)",
    background: active ? "rgba(255,193,48,0.1)" : "rgba(255,193,48,0.06)",
    color: "#cfb57a",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    width: "fit-content",
    justifySelf: "start",
  };
}

function detailSide(event: MouseEvent<HTMLElement>): "left" | "right" {
  const rect = event.currentTarget.getBoundingClientRect();
  return rect.left < window.innerWidth / 2 ? "left" : "right";
}

function consolidateDealsById(deals: PartnerDeal[]): PartnerDeal[] {
  return Array.from(
    deals.reduce((map, deal) => {
      const current = map.get(deal.dealId);
      if (!current) {
        map.set(deal.dealId, { ...deal });
        return map;
      }

      const currentTime = new Date(current.activityDate).getTime();
      const nextTime = new Date(deal.activityDate).getTime();

      map.set(deal.dealId, {
        ...current,
        activityDate:
          Number.isFinite(nextTime) && (!Number.isFinite(currentTime) || nextTime > currentTime)
            ? deal.activityDate
            : current.activityDate,
        faturamentoGalapos: current.faturamentoGalapos + deal.faturamentoGalapos,
        comissaoPaga: current.comissaoPaga + deal.comissaoPaga,
      });
      return map;
    }, new Map<string, PartnerDeal>())
  ).map(([, deal]) => deal);
}

function detailDeals(deals: PartnerDeal[], metric: DetailMetric): PartnerDeal[] {
  if (metric === "r1") return deals.filter((deal) => deal.reunioesRealizadas > 0);
  if (metric === "propostas") return deals.filter((deal) => deal.propostasEnviadas > 0);
  if (metric === "contratos") return deals.filter((deal) => deal.contratosFechados > 0);
  if (metric === "tcv") return deals.filter((deal) => deal.stage === "Contrato fechado" && deal.tcvPonderado > 0);
  if (metric === "faturamento") return consolidateDealsById(deals.filter((deal) => deal.faturamentoGalapos > 0));
  return consolidateDealsById(deals.filter((deal) => deal.comissaoPaga > 0));
}

function detailSummary(metric: DetailMetric, deals: PartnerDeal[]) {
  if (metric === "r1") return `${fmtInt(deals.reduce((sum, deal) => sum + deal.reunioesRealizadas, 0))} R1`;
  if (metric === "propostas") return `${fmtInt(deals.length)} propostas`;
  if (metric === "contratos") return `${fmtInt(deals.length)} contratos`;
  if (metric === "tcv") return fmtMoneyMil(deals.reduce((sum, deal) => sum + deal.tcvPonderado, 0));
  if (metric === "faturamento") return fmtMoneyMil(deals.reduce((sum, deal) => sum + deal.faturamentoGalapos, 0));
  return fmtMoneyMil(deals.reduce((sum, deal) => sum + deal.comissaoPaga, 0));
}

function formatDateBR(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

function daysSince(value: string) {
  if (!value) return "-";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "-";
  const today = new Date();
  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? `${fmtInt(diffDays)} dias` : "-";
}

function filteredPeriodLabel(filters: FilterState) {
  const from = formatDateBR(filters.dateFrom);
  const to = formatDateBR(filters.dateTo);

  if (filters.dateFrom && filters.dateTo) return `${from} até ${to}`;
  if (filters.dateFrom) return `desde ${from}`;
  if (filters.dateTo) return `até ${to}`;
  return "todo o período disponível";
}

function chartUnitLabel(metric: DetailMetric) {
  if (metric === "r1") return "Unidade: número de R1 realizadas";
  if (metric === "propostas") return "Unidade: número de propostas enviadas";
  if (metric === "contratos") return "Unidade: número de contratos fechados";
  if (metric === "tcv") return "Unidade: R$ mil de TCV ponderado";
  if (metric === "faturamento") return "Unidade: R$ mil de faturamento Galapos";
  return "Unidade: R$ mil de comissões pagas";
}

function sameDetails(a: HoveredParetoDetails, b: HoveredParetoDetails) {
  if (!a || !b) return false;
  return (
    a.chartTitle === b.chartTitle &&
    a.parceiro === b.parceiro &&
    a.metric === b.metric &&
    a.deals.map((deal) => deal.dealId).join(",") === b.deals.map((deal) => deal.dealId).join(",")
  );
}

function detailLine(metric: DetailMetric, deal: PartnerDeal, detailMap?: DetailMetaMap) {
  const loadedService = detailMap?.[deal.dealId]?.service?.trim();
  const responsavel = detailMap?.[deal.dealId]?.responsavel?.trim() || "-";
  if (metric === "r1") {
    return {
      service: loadedService || "-",
      lines: [
        `Responsável: ${responsavel}`,
        `R1 em: ${formatDateBR(deal.activityDate)}`,
        `Dias desde R1: ${daysSince(deal.activityDate)}`,
      ],
    };
  }
  if (metric === "propostas") {
    const stageLabel = String(deal.currentStageLabel ?? "").trim();
    const isActiveProposal = stageLabel.localeCompare("Proposta enviada", "pt-BR", { sensitivity: "base" }) === 0;
    return {
      service: loadedService || "-",
      lines: [
        `Responsável: ${responsavel}`,
        `Enviada em: ${formatDateBR(deal.activityDate)}`,
        isActiveProposal ? `Dias desde envio: ${daysSince(deal.activityDate)}` : `Etapa do negócio: ${stageLabel || "-"}`,
        `TCVp proposta: ${fmtMoneyMil(deal.tcvPonderadoProposta ?? 0)}`,
      ],
    };
  }
  if (metric === "contratos") {
    return {
      service: loadedService || "-",
      lines: [
        `Responsável: ${responsavel}`,
        `Fechado em: ${formatDateBR(deal.activityDate)}`,
        `Dias desde fechamento: ${daysSince(deal.activityDate)}`,
        `TCVp contrato: ${fmtMoneyMil(deal.tcvPonderado)}`,
      ],
    };
  }
  if (metric === "tcv") {
    return {
      service: loadedService || "-",
      lines: [
        `Responsável: ${responsavel}`,
        `Fechado em: ${formatDateBR(deal.activityDate)}`,
        `Dias desde fechamento: ${daysSince(deal.activityDate)}`,
        `TCVp contrato: ${fmtMoneyMil(deal.tcvPonderado)}`,
      ],
    };
  }
  if (metric === "comissao") {
    return {
      service: loadedService || "-",
      lines: [
        `Emitida em: ${formatDateBR(deal.activityDate)}`,
        `Dias desde emissão: ${daysSince(deal.activityDate)}`,
        `Comissão Paga: ${fmtMoneyMil(deal.comissaoPaga)}`,
      ],
    };
  }
  return {
    service: loadedService || "-",
    lines: [
      `Emitida em: ${formatDateBR(deal.activityDate)}`,
      `Faturamento Galapos: ${fmtMoneyMil(deal.faturamentoGalapos)}`,
    ],
  };
}
function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <article style={cardStyle()}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: 12 }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.04em", color: accent ? "#FFC130" : "#F5F5F5" }}>{value}</div>
    </article>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ color: "#6b7280", fontSize: 13 }}>{subtitle}</div>}
    </div>
  );
}

function last12MonthsContractsRank(data: PartnerMetric[]) {
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  since.setHours(0, 0, 0, 0);

  const ranked = data
    .map((partner) => ({
      parceiro: partner.parceiro,
      count: partner.deals.filter((deal) => {
        if (deal.stage !== "Contrato fechado" || deal.contratosFechados <= 0) return false;
        const time = new Date(deal.activityDate).getTime();
        return Number.isFinite(time) && time >= since.getTime();
      }).length,
    }))
    .sort((a, b) => b.count - a.count || a.parceiro.localeCompare(b.parceiro, "pt-BR"));

  return Object.fromEntries(ranked.map((item, index) => [item.parceiro, index + 1]));
}

function contractOnlyMetrics(data: PartnerMetric[]): PartnerMetric[] {
  return data.map((row) => {
    const deals = row.deals.filter((deal) => deal.stage === "Contrato fechado");
    return {
      ...row,
      deals,
      contratosFechados: deals.reduce((sum, deal) => sum + deal.contratosFechados, 0),
      propostasEnviadas: deals.reduce((sum, deal) => sum + deal.propostasEnviadas, 0),
      reunioesRealizadas: deals.reduce((sum, deal) => sum + deal.reunioesRealizadas, 0),
      tcvPonderado: deals.reduce((sum, deal) => sum + deal.tcvPonderado, 0),
      faturamentoGalapos: deals.reduce((sum, deal) => sum + deal.faturamentoGalapos, 0),
      comissaoPaga: deals.reduce((sum, deal) => sum + deal.comissaoPaga, 0),
    };
  });
}

function PartnerBadge({ tier, rank }: { tier: "Tier 1" | "Tier 2"; rank?: number }) {
  return (
    <span style={badgeStyle()}>
      <span>{tier}</span>
      {rank ? <span style={{ color: "#d1d5db" }}>#{rank}</span> : null}
    </span>
  );
}

function LegendBadge() {
  return <span style={badgeStyle()}>Tier + Ranking UDM</span>;
}

function FilterBar({
  filters,
  setFilters,
  mode,
  availableYears,
  availableTiers,
  availableOwners,
  availableJourneyStages,
  presetYear,
  setPresetYear,
  activeDatePreset,
  setActiveDatePreset,
}: {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  mode: Mode;
  availableYears: number[];
  availableTiers: string[];
  availableOwners: string[];
  availableJourneyStages: string[];
  presetYear: number;
  setPresetYear: Dispatch<SetStateAction<number>>;
  activeDatePreset: string;
  setActiveDatePreset: Dispatch<SetStateAction<string>>;
}) {
  const [showDashboardDateFilters, setShowDashboardDateFilters] = useState(false);
  const itemStyle: CSSProperties = { display: "grid", gap: 8, minWidth: 0 };
  const inputStyle: CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "12px 14px",
    color: "#F5F5F5",
    outline: "none",
    colorScheme: "dark",
  };
  const optionStyle: CSSProperties = {
    background: "#111827",
    color: "#F5F5F5",
  };
  const chipStyle = (active?: boolean): CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 999,
    border: active ? "1px solid rgba(255,193,48,0.38)" : "1px solid rgba(255,255,255,0.08)",
    background: active ? "rgba(255,193,48,0.12)" : "rgba(255,255,255,0.03)",
    color: active ? "#FFC130" : "#d1d5db",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  });

  return (
    <section style={{ ...cardStyle(), marginBottom: 22 }}>
      <SectionTitle title="Filtros" subtitle={mode === "dashboard" ? "Recorte inicial para ranking e gráficos, incluindo período." : "Recorte inicial para ranking, paretos e scorecards."} />
      {mode === "dashboard" && (
        <div style={{ display: "grid", gap: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setShowDashboardDateFilters((current) => !current)}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "#F5F5F5",
                padding: "10px 14px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {showDashboardDateFilters ? "Ocultar filtro de data" : "Mostrar filtro de data"}
            </button>
          </div>
          {showDashboardDateFilters && (
            <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", minWidth: 88 }}>Período</span>
            {[30, 60, 90, 180, 365].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  setActiveDatePreset(`${days}d`);
                  setFilters((c) => ({ ...c, ...buildRelativeRange(days) }));
                }}
                style={chipStyle(activeDatePreset === `${days}d`)}
              >
                {days} dias
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", minWidth: 88 }}>Ano-base</span>
            {availableYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => {
                  setPresetYear(year);
                  setActiveDatePreset(`year-${year}`);
                  setFilters((c) => ({ ...c, ...buildYearRange(year) }));
                }}
                style={chipStyle(activeDatePreset === `year-${year}`)}
              >
                {year}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", minWidth: 88 }}>Trimestre</span>
            {[1, 2, 3, 4].map((quarter) => (
              <button
                key={quarter}
                type="button"
                onClick={() => {
                  setActiveDatePreset(`q${quarter}-${presetYear}`);
                  setFilters((c) => ({ ...c, ...buildQuarterRange(presetYear, quarter as 1 | 2 | 3 | 4) }));
                }}
                style={chipStyle(activeDatePreset === `q${quarter}-${presetYear}`)}
              >
                Q{quarter}
              </button>
            ))}
            <span style={{ fontSize: 12, color: "#9ca3af" }}>ano {presetYear}</span>
          </div>
            </>
          )}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: mode === "dashboard" ? "1.3fr 1.1fr 1.1fr 1.1fr 1fr 1.2fr 1.2fr 1fr 1fr 1fr" : "2fr 1.3fr", gap: 12 }}>
        <div style={itemStyle}>
          <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Parceiro</label>
          <input value={filters.search} onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))} placeholder="Buscar parceiro..." style={inputStyle} />
        </div>
        {mode === "dashboard" && (
          <>
            {showDashboardDateFilters ? (
              <>
                <div style={itemStyle}>
                  <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Data inicial</label>
                  <input type="date" value={filters.dateFrom} onChange={(e) => {
                    setActiveDatePreset("custom");
                    setFilters((c) => ({ ...c, dateFrom: e.target.value }));
                  }} style={inputStyle} />
                </div>
                <div style={itemStyle}>
                  <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Data final</label>
                  <input type="date" value={filters.dateTo} onChange={(e) => {
                    setActiveDatePreset("custom");
                    setFilters((c) => ({ ...c, dateTo: e.target.value }));
                  }} style={inputStyle} />
                </div>
              </>
            ) : (
              <>
                <div />
                <div />
              </>
            )}
            <div style={itemStyle}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Proprietário</label>
              <select value={filters.proprietarioParceiro} onChange={(e) => setFilters((c) => ({ ...c, proprietarioParceiro: e.target.value }))} style={inputStyle}>
                <option value="" style={optionStyle}>Todos</option>
                {availableOwners.map((owner) => (
                  <option key={owner} value={owner} style={optionStyle}>{owner}</option>
                ))}
              </select>
            </div>
            <div style={itemStyle}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Tier</label>
              <select value={filters.tier} onChange={(e) => setFilters((c) => ({ ...c, tier: e.target.value }))} style={inputStyle}>
                <option value="" style={optionStyle}>Todos</option>
                {availableTiers.map((tier) => (
                  <option key={tier} value={tier} style={optionStyle}>{tier}</option>
                ))}
              </select>
            </div>
            <div style={itemStyle}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Etapa da Jornada</label>
              <select value={filters.etapaJornada} onChange={(e) => setFilters((c) => ({ ...c, etapaJornada: e.target.value }))} style={inputStyle}>
                <option value="" style={optionStyle}>Todas</option>
                {availableJourneyStages.map((stage) => (
                  <option key={stage} value={stage} style={optionStyle}>{stage}</option>
                ))}
              </select>
            </div>
            <div style={itemStyle}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Mín. propostas</label>
              <input
                type="number"
                min="0"
                value={filters.minPropostasEnviadas}
                onChange={(e) => setFilters((c) => ({ ...c, minPropostasEnviadas: e.target.value }))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div style={itemStyle}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Mín. contratos</label>
              <input
                type="number"
                min="0"
                value={filters.minContratosFechados}
                onChange={(e) => setFilters((c) => ({ ...c, minContratosFechados: e.target.value }))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div style={itemStyle}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Mín. R1s</label>
              <input
                type="number"
                min="0"
                value={filters.minR1s}
                onChange={(e) => setFilters((c) => ({ ...c, minR1s: e.target.value }))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
          </>
        )}
        <div style={itemStyle}>
          <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>Ordenar por</label>
          <select value={filters.sortBy} onChange={(e) => setFilters((c) => ({ ...c, sortBy: e.target.value as FilterState["sortBy"] }))} style={inputStyle}>
            {metricOptions.map((option) => (
              <option key={option.value} value={option.value} style={optionStyle}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

function HoverMetricCell({
  value,
  partner,
  deals,
  metric,
  title,
  setHoveredDetails,
  setPinnedDetails,
}: {
  value: string;
  partner: string;
  deals: PartnerDeal[];
  metric: DetailMetric;
  title: string;
  setHoveredDetails: Dispatch<SetStateAction<HoveredParetoDetails>>;
  setPinnedDetails: Dispatch<SetStateAction<HoveredParetoDetails>>;
}) {
  const relevantDeals = detailDeals(deals, metric);

  return (
    <button
      type="button"
      onMouseEnter={(event) => {
        if (relevantDeals.length === 0) return;
        setHoveredDetails({
          chartTitle: title,
          parceiro: partner,
          deals: relevantDeals,
          side: detailSide(event),
          metric,
          summaryLabel: detailSummary(metric, relevantDeals),
        });
      }}
      onMouseLeave={() => setHoveredDetails((current) => (current?.parceiro === partner && current.chartTitle === title ? null : current))}
      onClick={(event) => {
        if (relevantDeals.length === 0) return;
        const nextDetails = {
          chartTitle: title,
          parceiro: partner,
          deals: relevantDeals,
          side: detailSide(event),
          metric,
          summaryLabel: detailSummary(metric, relevantDeals),
        } satisfies NonNullable<HoveredParetoDetails>;

        setPinnedDetails((current) => {
          if (sameDetails(current, nextDetails)) {
            setHoveredDetails(null);
            return null;
          }
          setHoveredDetails(nextDetails);
          return nextDetails;
        });
      }}
      style={{ background: "transparent", border: "none", color: "inherit", padding: 0, cursor: relevantDeals.length ? "pointer" : "default", font: "inherit" }}
    >
      {value}
    </button>
  );
}
function RankingTable({
  data,
  setHoveredDetails,
  setPinnedDetails,
  rankMap,
  rowLimit,
  setRowLimit,
}: {
  data: PartnerMetric[];
  setHoveredDetails: Dispatch<SetStateAction<HoveredParetoDetails>>;
  setPinnedDetails: Dispatch<SetStateAction<HoveredParetoDetails>>;
  rankMap: Record<string, number>;
  rowLimit: number;
  setRowLimit: Dispatch<SetStateAction<number>>;
}) {
  const headers = ["#", "Parceiro", "Proprietário", "Estado matriz", "Etapa da Jornada", "Contratos fechados", "Propostas enviadas", "Reuniões realizadas", "TCV Ponderado", "Faturamento Galapos"];
  const topRows = data.slice(0, rowLimit);
  const contractTcv = (row: PartnerMetric) =>
    row.deals
      .filter((deal) => deal.stage === "Contrato fechado")
      .reduce((sum, deal) => sum + deal.tcvPonderado, 0);

  function exportRanking() {
    const exportHeaders = [
      "#",
      "Parceiro",
      "Proprietário",
      "Tier",
      "Ranking UDM",
      "Estado matriz",
      "Etapa da Jornada",
      "Contratos fechados",
      "Propostas enviadas",
      "Reuniões realizadas",
      "TCV Ponderado",
      "Faturamento Galapos",
    ];

    const exportRows = topRows.map((row, index) => [
      index + 1,
      row.parceiro,
      row.proprietarioParceiro || "-",
      row.tier,
      rankMap[row.parceiro] ?? "",
      row.estadoMatriz || "-",
      row.etapaJornada || "-",
      row.contratosFechados,
      row.propostasEnviadas,
      row.reunioesRealizadas,
      exportMoneyInteger(contractTcv(row)),
      exportMoneyInteger(row.faturamentoGalapos),
    ]);

    const csv = [exportHeaders, ...exportRows]
      .map((line) => line.map((value) => csvEscape(value)).join(";"))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ranking-parceiros-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section style={{ ...cardStyle(), overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
        <SectionTitle title="Tabela Ranking parceiros" subtitle={`Visão consolidada com as principais variáveis por parceiro. Top ${rowLimit} do recorte.`} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={exportRanking}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,193,48,0.22)",
              background: "rgba(255,193,48,0.08)",
              color: "#F5F5F5",
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Exportar Excel
          </button>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>
              Mostrar
            </span>
            <select
              value={rowLimit}
              onChange={(event) => setRowLimit(Number(event.target.value))}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "10px 12px",
                color: "#F5F5F5",
                outline: "none",
                minWidth: 96,
              }}
            >
              {[10, 20, 30, 50, 100].map((value) => (
                <option key={value} value={value} style={{ background: "#111827", color: "#F5F5F5" }}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <LegendBadge />
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1240 }}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} style={{ textAlign: "left", padding: "14px 16px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topRows.map((row, index) => (
              <tr key={row.parceiro} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: "14px 16px", color: "#FFC130", fontWeight: 700 }}>{index + 1}</td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "grid", gap: 5 }}>
                    <span style={{ fontWeight: 600 }}>{row.parceiro}</span>
                    <PartnerBadge tier={row.tier} rank={rankMap[row.parceiro]} />
                  </div>
                </td>
                <td style={{ padding: "14px 16px", color: "#d1d5db" }}>{row.proprietarioParceiro || "-"}</td>
                <td style={{ padding: "14px 16px", color: "#d1d5db" }}>{row.estadoMatriz || "-"}</td>
                <td style={{ padding: "14px 16px", color: "#d1d5db" }}>{row.etapaJornada || "-"}</td>
                <td style={{ padding: "14px 16px" }}><HoverMetricCell value={fmtInt(row.contratosFechados)} partner={row.parceiro} deals={row.deals} metric="contratos" title="Contratos fechados" setHoveredDetails={setHoveredDetails} setPinnedDetails={setPinnedDetails} /></td>
                <td style={{ padding: "14px 16px" }}><HoverMetricCell value={fmtInt(row.propostasEnviadas)} partner={row.parceiro} deals={row.deals} metric="propostas" title="Propostas enviadas" setHoveredDetails={setHoveredDetails} setPinnedDetails={setPinnedDetails} /></td>
                <td style={{ padding: "14px 16px" }}><HoverMetricCell value={fmtInt(row.reunioesRealizadas)} partner={row.parceiro} deals={row.deals} metric="r1" title="R1 realizadas" setHoveredDetails={setHoveredDetails} setPinnedDetails={setPinnedDetails} /></td>
                <td style={{ padding: "14px 16px" }}><HoverMetricCell value={fmtMoneyMil(contractTcv(row))} partner={row.parceiro} deals={row.deals.filter((deal) => deal.stage === "Contrato fechado")} metric="tcv" title="TCV contratado" setHoveredDetails={setHoveredDetails} setPinnedDetails={setPinnedDetails} /></td>
                <td style={{ padding: "14px 16px" }}><HoverMetricCell value={fmtMoneyMil(row.faturamentoGalapos)} partner={row.parceiro} deals={row.deals} metric="faturamento" title="Faturamento Galapos" setHoveredDetails={setHoveredDetails} setPinnedDetails={setPinnedDetails} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ParetoChart({
  title,
  data,
  metric,
  periodLabel,
  maxVisibleItems,
  setHoveredDetails,
  setPinnedDetails,
}: {
  title: string;
  data: ParetoPoint[];
  metric: DetailMetric;
  periodLabel: string;
  maxVisibleItems?: number;
  setHoveredDetails: Dispatch<SetStateAction<HoveredParetoDetails>>;
  setPinnedDetails: Dispatch<SetStateAction<HoveredParetoDetails>>;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const chartHeight = 220;
  const plotHeight = 160;
  const isDenseChart = data.length >= 10;
  const isMoneyMetric = metric === "tcv" || metric === "faturamento" || metric === "comissao";
  const columnWidth = isDenseChart ? 64 : 92;
  const chartWidth = Math.max(data.length * columnWidth, 0);
  const shouldScroll = data.length > (maxVisibleItems ?? 10);

  return (
    <section style={{ ...cardStyle(), overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{chartUnitLabel(metric)}</div>
          <div style={{ fontSize: 12, color: "#7b88a8" }}>Período filtrado: {periodLabel}</div>
        </div>
      </div>

      <div
        style={{
          overflowX: shouldScroll ? "auto" : "hidden",
          overflowY: "hidden",
          paddingBottom: 10,
          marginBottom: 8,
          scrollbarWidth: shouldScroll ? "thin" : "none",
          scrollbarColor: shouldScroll ? "rgba(255,193,48,0.25) rgba(255,255,255,0.03)" : undefined,
        }}
      >
        <div style={{ minWidth: shouldScroll ? chartWidth : 0, paddingTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`, gap: 8, alignItems: "end", minHeight: 288, position: "relative" }}>
            {data.map((item) => {
              const deals = detailDeals(item.deals, metric);
              const barHeightPct = Math.max((item.value / max) * 100, 10);
              const barHeightPx = (barHeightPct / 100) * plotHeight;
              const valueOffset = 20;
              const valueY = Math.max(chartHeight - barHeightPx - valueOffset, 8);
              return (
                <button
                  key={item.parceiro}
                  type="button"
                  onMouseEnter={(event) => {
                    if (deals.length === 0) return;
                    setHoveredDetails({
                      chartTitle: title,
                      parceiro: item.parceiro,
                      deals,
                      side: detailSide(event),
                      metric,
                      summaryLabel: detailSummary(metric, deals),
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredDetails((current) => (current?.parceiro === item.parceiro && current.chartTitle === title ? null : current));
                  }}
                  onClick={(event) => {
                    if (deals.length === 0) return;
                    const nextDetails = {
                      chartTitle: title,
                      parceiro: item.parceiro,
                      deals,
                      side: detailSide(event),
                      metric,
                      summaryLabel: detailSummary(metric, deals),
                    } satisfies NonNullable<HoveredParetoDetails>;

                    setPinnedDetails((current) => {
                      if (sameDetails(current, nextDetails)) {
                        setHoveredDetails(null);
                        return null;
                      }
                      setHoveredDetails(nextDetails);
                      return nextDetails;
                    });
                  }}
                  style={{ background: "transparent", border: "none", color: "inherit", cursor: "default", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 0, minWidth: 0, position: "relative", zIndex: 4 }}
                >
                  <div style={{ height: chartHeight, width: "100%", position: "relative", zIndex: 4 }}>
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: valueY,
                        transform: "translateX(-50%)",
                        fontSize: isMoneyMetric ? 11 : 13,
                        fontWeight: 800,
                        color: "#FFC130",
                        textAlign: "center",
                        whiteSpace: isMoneyMetric ? "normal" : "nowrap",
                        lineHeight: isMoneyMetric ? 1.05 : 1.15,
                        minHeight: 22,
                        width: "100%",
                        paddingInline: 4,
                        zIndex: 5,
                        pointerEvents: "none",
                      }}
                    >
                      {isMoneyMetric ? fmtNumberMil(item.value) : fmtInt(item.value)}
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: barHeightPx,
                        background: "linear-gradient(180deg, #ffd25a 0%, #FFC130 55%, #d89d00 100%)",
                        borderRadius: "12px 12px 4px 4px",
                        border: "1px solid rgba(255,193,48,0.35)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                      }}
                    />
                  </div>
                  <div style={{ display: "grid", justifyItems: "center", alignContent: "start", gap: 8, minHeight: 82 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#d1d5db", textAlign: "center", lineHeight: 1.2, display: "flex", alignItems: "flex-start", justifyContent: "center", wordBreak: "break-word", minHeight: 34 }}>{item.parceiro}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#F5F5F5",
                          whiteSpace: "nowrap",
                          background: "rgba(20,20,20,0.92)",
                          border: "1px solid rgba(255,255,255,0.14)",
                          borderRadius: 999,
                          padding: "0 8px",
                          height: 22,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >
                        {item.cumulativePct.toFixed(0)}%
                      </div>
                      {item === data[data.length - 1] ? (
                        <span style={{ fontSize: 10, color: "#6b7280", whiteSpace: "nowrap" }}>% acumulado</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function HighlightsLowlights({ data }: { data: PartnerMetric[] }) {
  const topPropostas = topDealsByMetric(data, "Proposta enviada", "tcvPonderadoProposta", 5);
  const topContratos = topDealsByMetric(data, "Contrato fechado", "tcvPonderado", 5);
  const topFaturamento = Array.from(
    data
      .flatMap((partner) => partner.deals.map((deal) => ({ parceiro: partner.parceiro, ...deal })))
      .filter((deal) => deal.stage === "Contrato fechado" && deal.faturamentoGalapos > 0)
      .reduce((map, deal) => {
        const current = map.get(deal.dealId);
        if (!current) {
          map.set(deal.dealId, { ...deal });
          return map;
        }

        map.set(deal.dealId, {
          ...current,
          faturamentoGalapos: current.faturamentoGalapos + deal.faturamentoGalapos,
          activityDate:
            new Date(deal.activityDate).getTime() > new Date(current.activityDate).getTime()
              ? deal.activityDate
              : current.activityDate,
        });
        return map;
      }, new Map<string, (PartnerDeal & { parceiro: string })>())
      .values()
  )
    .sort((a, b) => b.faturamentoGalapos - a.faturamentoGalapos)
    .slice(0, 5);
  const lowTierOne = lowestTierOneByLastR1(data, 5);

  return (
    <section style={{ ...cardStyle(), marginTop: 22 }}>
      <SectionTitle title="Highlights e lowlights" subtitle="Leituras rápidas para ajudar na priorização comercial." />
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1.2fr 1fr", gap: 16 }}>
        <article style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", padding: 16 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#FFC130", marginBottom: 12 }}>Highlights</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Propostas enviadas com maior TCVp</div>
          <div style={{ display: "grid", gap: 10 }}>
            {topPropostas.map((deal) => (
              <div key={`${deal.dealId}-${deal.activityDate}`} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{deal.dealName}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{deal.parceiro}</div>
                <div style={{ fontSize: 12, color: "#F5F5F5" }}>{fmtMoneyMil(deal.tcvPonderadoProposta ?? 0)}</div>
              </div>
            ))}
          </div>
        </article>

        <article style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", padding: 16 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#FFC130", marginBottom: 12 }}>Highlights</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Contratos fechados com maior TCVp</div>
          <div style={{ display: "grid", gap: 10 }}>
            {topContratos.map((deal) => (
              <div key={`${deal.dealId}-${deal.activityDate}`} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{deal.dealName}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{deal.parceiro}</div>
                <div style={{ fontSize: 12, color: "#F5F5F5" }}>{fmtMoneyMil(deal.tcvPonderado)}</div>
              </div>
            ))}
          </div>
        </article>

        <article style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", padding: 16 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#FFC130", marginBottom: 12 }}>Highlights</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Contratos com maior faturamento</div>
          <div style={{ display: "grid", gap: 10 }}>
            {topFaturamento.map((deal) => (
              <div key={`${deal.dealId}-${deal.activityDate}`} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{deal.dealName}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{deal.parceiro}</div>
                <div style={{ fontSize: 12, color: "#F5F5F5" }}>{fmtMoneyMil(deal.faturamentoGalapos)}</div>
              </div>
            ))}
          </div>
        </article>

        <article style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", padding: 16 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#fca5a5", marginBottom: 12 }}>Lowlights</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Tier 1 com maior tempo desde a última R1</div>
          <div style={{ display: "grid", gap: 10 }}>
            {lowTierOne.map((partner) => (
              <div key={partner.parceiro} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{partner.parceiro}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{partner.tier}</div>
                <div style={{ fontSize: 12, color: "#F5F5F5" }}>
                  {Number.isFinite(partner.daysSinceLastR1)
                    ? `${fmtInt(partner.daysSinceLastR1)} dias desde a última R1`
                    : "Sem R1 no período"}
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function ExecutiveBoard({ data }: { data: PartnerMetric[] }) {
  return (
    <section style={{ ...cardStyle() }}>
      <SectionTitle title="Scorecard executivo" subtitle="Leitura rápida dos parceiros com melhor geração de valor na base atual." />
      <div style={{ display: "grid", gap: 12 }}>
        {data.slice(0, 6).map((row, index) => (
          <div key={row.parceiro} style={{ padding: "16px 18px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{index + 1}. {row.parceiro}</div>
              <div style={{ color: "#FFC130", fontSize: 12, fontWeight: 700 }}>{fmtMoneyMil(row.faturamentoGalapos)}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, color: "#9ca3af", fontSize: 12 }}>
              <span>R1: {fmtInt(row.reunioesRealizadas)}</span>
              <span>Propostas: {fmtInt(row.propostasEnviadas)}</span>
              <span>Contratos: {fmtInt(row.contratosFechados)}</span>
              <span>TCVp: {fmtMoneyMil(row.tcvPonderado)}</span>
              <span>Tier: {row.tier}</span>
              <span>Deals: {fmtInt(row.deals.length)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function isEventInRange(event: ServiceJourneyEvent, filters: FilterState) {
  const activityTime = new Date(event.activityDate).getTime();
  const fromTime = filters.dateFrom ? new Date(filters.dateFrom).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = filters.dateTo ? new Date(filters.dateTo).getTime() : Number.POSITIVE_INFINITY;
  return activityTime >= fromTime && activityTime <= toTime;
}

function splitServiceGroups(value: string) {
  return String(value ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function MeetingJourneyTable({
  events,
  filters,
  data,
}: {
  events: ServiceJourneyEvent[];
  filters: FilterState;
  data: PartnerMetric[];
}) {
  const [tableDateFrom, setTableDateFrom] = useState(filters.dateFrom);
  const [tableDateTo, setTableDateTo] = useState(filters.dateTo);
  const [showTableDateFilters, setShowTableDateFilters] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    grupoServico: string;
    metric: ServiceJourneyEvent["metric"];
  } | null>(null);
  const [ownerDetails, setOwnerDetails] = useState<Record<string, string>>({});

  const tableFilters = useMemo(
    () => ({
      ...filters,
      dateFrom: tableDateFrom,
      dateTo: tableDateTo,
    }),
    [filters, tableDateFrom, tableDateTo]
  );

  const rows = Array.from(
    events
      .filter((event) => event.grupoServico && isEventInRange(event, tableFilters))
      .reduce((map, event) => {
        for (const grupoServico of splitServiceGroups(event.grupoServico)) {
          const current =
            map.get(grupoServico) ??
            {
              grupoServico,
              r1Deals: new Set<string>(),
              postR1Deals: new Set<string>(),
              propostaDeals: new Set<string>(),
              contratoDeals: new Set<string>(),
            };

          if (event.metric === "r1") current.r1Deals.add(event.dealId);
          if (event.metric === "postR1") current.postR1Deals.add(event.dealId);
          if (event.metric === "proposta") current.propostaDeals.add(event.dealId);
          if (event.metric === "contrato") current.contratoDeals.add(event.dealId);

          map.set(grupoServico, current);
        }
        return map;
      }, new Map<string, { grupoServico: string; r1Deals: Set<string>; postR1Deals: Set<string>; propostaDeals: Set<string>; contratoDeals: Set<string> }>())
      .values()
  )
    .map((row) => ({
      grupoServico: row.grupoServico,
      r1Deals: row.r1Deals.size,
      postR1Deals: row.postR1Deals.size,
      propostaDeals: row.propostaDeals.size,
      contratoDeals: row.contratoDeals.size,
    }))
    .filter((row) => row.r1Deals > 0 || row.postR1Deals > 0 || row.propostaDeals > 0 || row.contratoDeals > 0)
    .sort(
      (a, b) =>
        b.r1Deals - a.r1Deals ||
        b.postR1Deals - a.postR1Deals ||
        b.propostaDeals - a.propostaDeals ||
        b.contratoDeals - a.contratoDeals ||
        a.grupoServico.localeCompare(b.grupoServico, "pt-BR")
    );

  const detailRows = useMemo(() => {
    if (!selectedCell) return [];

    const selectedDealIds = new Set(
      events
        .filter(
          (event) =>
            event.metric === selectedCell.metric &&
            splitServiceGroups(event.grupoServico).includes(selectedCell.grupoServico) &&
            isEventInRange(event, tableFilters)
        )
        .map((event) => event.dealId)
    );

    if (selectedDealIds.size === 0) return [];

    const fallbackDealMap = new Map(
      data.flatMap((partner) =>
        partner.deals.map((deal) => [
          deal.dealId,
          {
            dealName: deal.dealName,
            parceiro: partner.parceiro,
            currentStageLabel: deal.currentStageLabel ?? "",
          },
        ] as const)
      )
    );

    const rowsMap = new Map<
      string,
      {
        dealId: string;
        dealName: string;
        parceiro: string;
        responsavel: string;
        r1Date: string;
        postR1Date: string;
        propostaDate: string;
        contratoDate: string;
        currentStageLabel: string;
      }
    >();

    for (const event of events) {
      if (!selectedDealIds.has(event.dealId)) continue;
      if (!splitServiceGroups(event.grupoServico).includes(selectedCell.grupoServico)) continue;
      if (!isEventInRange(event, tableFilters)) continue;

      const current = rowsMap.get(event.dealId);
      const base =
        current ??
        {
          dealId: event.dealId,
          dealName: event.dealName || fallbackDealMap.get(event.dealId)?.dealName || "-",
          parceiro: event.parceiro || fallbackDealMap.get(event.dealId)?.parceiro || "-",
          responsavel: String(event.responsavel ?? "").trim() || "-",
          r1Date: "",
          postR1Date: "",
          propostaDate: "",
          contratoDate: "",
          currentStageLabel:
            String(event.currentStageLabel ?? "").trim() ||
            fallbackDealMap.get(event.dealId)?.currentStageLabel ||
            "-",
        };

      if (!base.dealName && event.dealName) base.dealName = event.dealName;
      if (!base.parceiro && event.parceiro) base.parceiro = event.parceiro;
      if ((!base.responsavel || base.responsavel === "-") && event.responsavel) base.responsavel = event.responsavel;
      if ((!base.currentStageLabel || base.currentStageLabel === "-") && event.currentStageLabel) {
        base.currentStageLabel = event.currentStageLabel;
      }

      if (event.metric === "r1" && (!base.r1Date || new Date(event.activityDate).getTime() > new Date(base.r1Date).getTime())) {
        base.r1Date = event.activityDate;
      }
      if (event.metric === "postR1" && (!base.postR1Date || new Date(event.activityDate).getTime() > new Date(base.postR1Date).getTime())) {
        base.postR1Date = event.activityDate;
      }
      if (event.metric === "proposta" && (!base.propostaDate || new Date(event.activityDate).getTime() > new Date(base.propostaDate).getTime())) {
        base.propostaDate = event.activityDate;
      }
      if (event.metric === "contrato" && (!base.contratoDate || new Date(event.activityDate).getTime() > new Date(base.contratoDate).getTime())) {
        base.contratoDate = event.activityDate;
      }

      rowsMap.set(event.dealId, base);
    }

    return Array.from(rowsMap.values()).sort((a, b) => {
      const pivotA = a.r1Date || a.postR1Date || a.propostaDate || a.contratoDate;
      const pivotB = b.r1Date || b.postR1Date || b.propostaDate || b.contratoDate;
      const timeA = new Date(pivotA).getTime();
      const timeB = new Date(pivotB).getTime();
      return timeB - timeA || a.dealName.localeCompare(b.dealName, "pt-BR");
    });
  }, [data, events, selectedCell, tableFilters]);

  useEffect(() => {
    if (!selectedCell || detailRows.length === 0) return;
    const activeCell = selectedCell;

    const missingOwnerIds = detailRows
      .filter((row) => !row.responsavel || row.responsavel === "-")
      .map((row) => row.dealId)
      .filter((dealId) => !ownerDetails[dealId]);

    if (missingOwnerIds.length === 0) return;

    let cancelled = false;

    const metricMap: Record<ServiceJourneyEvent["metric"], "r1" | "propostas" | "contratos"> = {
      r1: "r1",
      postR1: "r1",
      proposta: "propostas",
      contrato: "contratos",
    };

    async function loadOwners() {
      try {
        const resp = await fetch("/api/partner-metric-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metric: metricMap[activeCell.metric],
            dealIds: missingOwnerIds,
          }),
        });
        const payload = (await resp.json()) as { details?: Array<{ dealId: string; responsavel: string }> };
        if (!resp.ok || cancelled) return;

        const next = Object.fromEntries(
          (payload.details ?? [])
            .map((item) => [item.dealId, String(item.responsavel ?? "").trim()])
            .filter(([, responsavel]) => Boolean(responsavel))
        );

        if (Object.keys(next).length > 0) {
          setOwnerDetails((current) => ({ ...current, ...next }));
        }
      } catch {
        // deixa fallback visual
      }
    }

    loadOwners();
    return () => {
      cancelled = true;
    };
  }, [detailRows, ownerDetails, selectedCell]);

  function metricHeader(metric: ServiceJourneyEvent["metric"]) {
    if (metric === "r1") return "Deals com R1";
    if (metric === "postR1") return "Deals com reunião após R1";
    if (metric === "proposta") return "Deals com proposta enviada";
    return "Deals com contrato fechado";
  }

  function numberCell(grupoServico: string, metric: ServiceJourneyEvent["metric"], value: number) {
    const isActive = selectedCell?.grupoServico === grupoServico && selectedCell?.metric === metric;
    return (
      <button
        type="button"
        onClick={() =>
          setSelectedCell((current) =>
            current?.grupoServico === grupoServico && current?.metric === metric
              ? null
              : { grupoServico, metric }
          )
        }
        style={{
          background: isActive ? "rgba(255,193,48,0.12)" : "transparent",
          color: "#F5F5F5",
          border: isActive ? "1px solid rgba(255,193,48,0.22)" : "1px solid transparent",
          borderRadius: 10,
          padding: "6px 10px",
          cursor: value > 0 ? "pointer" : "default",
          fontWeight: 700,
          minWidth: 56,
        }}
        disabled={value === 0}
      >
        {fmtInt(value)}
      </button>
    );
  }

  return (
    <section style={{ ...cardStyle() }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <SectionTitle
          title="Jornada dos deals"
          subtitle="Filtro próprio da tabela: R1 pela data da reunião de investigação, pós-R1 pela data da reunião seguinte, proposta por data_do_envio_da_proposta e contrato por data de fechamento."
        />
        <button
          type="button"
          onClick={() => setShowTableDateFilters((current) => !current)}
          style={{
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: "#F5F5F5",
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {showTableDateFilters ? "Ocultar filtro de data" : "Mostrar filtro de data"}
        </button>
      </div>
      {showTableDateFilters && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 220px))",
            gap: 12,
            alignItems: "end",
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, gridColumn: "1 / -1" }}>
            {[180, 365].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  const range = buildRelativeRange(days);
                  setTableDateFrom(range.dateFrom);
                  setTableDateTo(range.dateTo);
                }}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,193,48,0.22)",
                  background: "rgba(255,193,48,0.08)",
                  color: "#F5F5F5",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                Últimos {days} dias
              </button>
            ))}
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>
              Data inicial
            </span>
            <input
              type="date"
              value={tableDateFrom}
              onChange={(event) => setTableDateFrom(event.target.value)}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "#F5F5F5",
                padding: "10px 12px",
                outline: "none",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>
              Data final
            </span>
            <input
              type="date"
              value={tableDateTo}
              onChange={(event) => setTableDateTo(event.target.value)}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "#F5F5F5",
                padding: "10px 12px",
                outline: "none",
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setTableDateFrom(filters.dateFrom);
              setTableDateTo(filters.dateTo);
            }}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,193,48,0.22)",
              background: "rgba(255,193,48,0.08)",
              color: "#F5F5F5",
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 600,
              height: 42,
            }}
          >
            Usar período da página
          </button>
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
          <thead>
            <tr>
              {[
                "Grupo de serviços",
                "Deals com R1",
                "Deals com reunião após R1",
                "Deals com proposta enviada",
                "Deals com contrato fechado",
              ].map((header) => (
                <th
                  key={header}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#6b7280",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.grupoServico} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: "14px 16px", fontWeight: 600 }}>{row.grupoServico}</td>
                <td style={{ padding: "14px 16px", color: "#F5F5F5" }}>{numberCell(row.grupoServico, "r1", row.r1Deals)}</td>
                <td style={{ padding: "14px 16px", color: "#F5F5F5" }}>{numberCell(row.grupoServico, "postR1", row.postR1Deals)}</td>
                <td style={{ padding: "14px 16px", color: "#F5F5F5" }}>{numberCell(row.grupoServico, "proposta", row.propostaDeals)}</td>
                <td style={{ padding: "14px 16px", color: "#F5F5F5" }}>{numberCell(row.grupoServico, "contrato", row.contratoDeals)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedCell && (
        <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{metricHeader(selectedCell.metric)}</div>
              <div style={{ color: "#9ca3af", fontSize: 13 }}>
                Grupo de serviços: {selectedCell.grupoServico} · {fmtInt(detailRows.length)} deals considerados
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              style={{
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "#F5F5F5",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              Fechar detalhamento
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
              <thead>
                <tr>
                  {[
                    "Deal name",
                    "Parceiro",
                    "Proprietário do negócio",
                    "Data da R1",
                    "Data da reunião seguinte à R1",
                    "Data da proposta",
                    "Data contrato",
                  ].map((header) => (
                    <th
                      key={header}
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#6b7280",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row) => (
                  <tr key={`${selectedCell.metric}-${selectedCell.grupoServico}-${row.dealId}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>{row.dealName || "-"}</td>
                    <td style={{ padding: "12px 14px", color: "#d1d5db" }}>{row.parceiro || "-"}</td>
                    <td style={{ padding: "12px 14px", color: "#d1d5db" }}>{ownerDetails[row.dealId] || row.responsavel || "-"}</td>
                    <td style={{ padding: "12px 14px", color: "#F5F5F5" }}>{formatDateBR(row.r1Date)}</td>
                    <td style={{ padding: "12px 14px", color: "#F5F5F5" }}>{formatDateBR(row.postR1Date)}</td>
                    <td style={{ padding: "12px 14px", color: "#F5F5F5" }}>{formatDateBR(row.propostaDate)}</td>
                    <td style={{ padding: "12px 14px", color: "#F5F5F5" }}>{formatDateBR(row.contratoDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export function PartnerAnalytics({
  data,
  serviceJourneyEvents,
  mode,
}: {
  data: PartnerMetric[];
  serviceJourneyEvents: ServiceJourneyEvent[];
  mode: Mode;
}) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [rankingRowLimit, setRankingRowLimit] = useState(20);
  const [hoveredDetails, setHoveredDetails] = useState<HoveredParetoDetails>(null);
  const [pinnedDetails, setPinnedDetails] = useState<HoveredParetoDetails>(null);
  const [detailCache, setDetailCache] = useState<Record<string, DetailMetaMap>>({});
  const availableYears = useMemo(
    () =>
      [...new Set(data.flatMap((partner) => partner.deals.map((deal) => new Date(deal.activityDate).getUTCFullYear())))]
        .filter((year) => Number.isFinite(year))
        .sort((a, b) => a - b),
    [data]
  );
  const availableJourneyStages = useMemo(
    () =>
      [...new Set(data.map((partner) => String(partner.etapaJornada ?? "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [data]
  );
  const availableOwners = useMemo(
    () =>
      [...new Set(data.map((partner) => String(partner.proprietarioParceiro ?? "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [data]
  );
  const availableTiers = useMemo(
    () => [...new Set(data.map((partner) => String(partner.tier ?? "").trim()).filter(Boolean))].sort(),
    [data]
  );
  const [presetYear, setPresetYear] = useState<number>(availableYears.at(-1) ?? 2026);
  const [activeDatePreset, setActiveDatePreset] = useState<string>("");
  const filtered = useMemo(() => applyFilters(data, filters), [data, filters]);
  const filteredForLowlights = useMemo(
    () => applyFilters(data, filters, { retainEmpty: true }),
    [data, filters]
  );
  const filteredContractsOnly = useMemo(() => contractOnlyMetrics(filtered), [filtered]);
  const totals = useMemo(() => totalize(filtered), [filtered]);

  const paretoReunioes = useMemo(() => buildPareto(filtered, "reunioesRealizadas", 10), [filtered]);
  const paretoPropostas = useMemo(() => buildPareto(filtered, "propostasEnviadas", 10), [filtered]);
  const paretoContratos = useMemo(() => buildPareto(filtered, "contratosFechados", 10), [filtered]);
  const paretoTcv = useMemo(() => buildPareto(filteredContractsOnly, "tcvPonderado", 10), [filteredContractsOnly]);
  const paretoFaturamento = useMemo(() => buildPareto(filtered, "faturamentoGalapos", 10), [filtered]);
  const paretoComissao = useMemo(() => buildPareto(filtered, "comissaoPaga", 10), [filtered]);
  const rankMap = useMemo(() => last12MonthsContractsRank(data), [data]);
  const activeDetails = pinnedDetails ?? hoveredDetails;
  const periodLabel = useMemo(() => filteredPeriodLabel(filters), [filters]);
  const hoveredKey = activeDetails
    ? `${activeDetails.metric}|${activeDetails.parceiro}|${activeDetails.deals.map((deal) => deal.dealId).join(",")}`
    : "";

  useEffect(() => {
    if (!activeDetails || !hoveredKey || detailCache[hoveredKey]) return;
    const hovered = activeDetails;

    let cancelled = false;

    async function loadDetails() {
      try {
        const resp = await fetch("/api/partner-metric-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metric: hovered.metric,
            dealIds: hovered.deals.map((deal) => deal.dealId),
          }),
        });
        const payload = (await resp.json()) as { details?: Array<{ dealId: string; service: string; responsavel: string }> };
        if (!resp.ok || cancelled) return;

        const nextMap = Object.fromEntries(
          (payload.details ?? []).map((item) => [
            item.dealId,
            { service: item.service, responsavel: item.responsavel },
          ])
        );
        setDetailCache((current) => ({ ...current, [hoveredKey]: nextMap }));
      } catch {
        if (cancelled) return;
        setDetailCache((current) => ({ ...current, [hoveredKey]: {} }));
      }
    }

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [activeDetails, detailCache, hoveredKey]);

  return (
    <div style={{ position: "relative" }}>
      {activeDetails && (
        <aside
          style={{
            position: "fixed",
            left: activeDetails.side === "left" ? 24 : "auto",
            right: activeDetails.side === "right" ? 24 : "auto",
            top: 112,
            width: 320,
            maxHeight: "70vh",
            overflowY: "auto",
            padding: "18px 20px",
            borderRadius: 18,
            background: "rgba(20,20,20,0.96)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 22px 60px rgba(0,0,0,0.38)",
            backdropFilter: "blur(12px)",
            zIndex: 40,
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,193,48,0.25) rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>{activeDetails.chartTitle}</div>
            <button
              type="button"
              onClick={() => {
                setPinnedDetails(null);
                setHoveredDetails(null);
              }}
              style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
              aria-label="Fechar detalhamento"
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{activeDetails.parceiro}</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 14 }}>
            {activeDetails.summaryLabel}
            {pinnedDetails && <span style={{ marginLeft: 8, color: "#FFC130" }}>fixado</span>}
          </div>
          {!detailCache[hoveredKey] && (
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Carregando detalhamento...</div>
          )}
          <div style={{ display: "grid", gap: 10 }}>
            {activeDetails.deals.map((deal) => {
              const detail = detailLine(activeDetails.metric, deal, detailCache[hoveredKey]);
              return (
                <div key={`${activeDetails.chartTitle}-${activeDetails.parceiro}-${deal.dealId}-${deal.activityDate}`} style={{ display: "grid", gap: 3 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.35, color: "#F5F5F5", fontWeight: 700 }}>{deal.dealName}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{detail.service}</div>
                  {detail.lines.map((line) => (
                    <div
                      key={`${deal.dealId}-${line}`}
                      style={{
                        fontSize: 12,
                        color: line.includes("TCV") || line.includes("Faturamento") ? "#FFC130" : "#9ca3af",
                        fontWeight: line.includes("TCV") || line.includes("Faturamento") ? 700 : 500,
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </aside>
      )}

      <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
        <Card label="Parceiros no recorte" value={fmtInt(filtered.length)} />
        <Card label="Contratos fechados" value={fmtInt(totals.contratosFechados)} />
        <Card label="Propostas enviadas" value={fmtInt(totals.propostasEnviadas)} />
        <Card label="Reuniões realizadas" value={fmtInt(totals.reunioesRealizadas)} />
        <Card label="TCV Ponderado" value={fmtMoneyMil(totals.tcvPonderado)} accent />
        <Card label="Faturamento Galapos" value={fmtMoneyMil(totals.faturamentoGalapos)} accent />
        <Card label="Comissões Pagas" value={fmtMoneyMil(totals.comissaoPaga)} accent />
      </div>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        mode={mode}
        availableYears={availableYears}
        availableTiers={availableTiers}
        availableOwners={availableOwners}
        availableJourneyStages={availableJourneyStages}
        presetYear={presetYear}
        setPresetYear={setPresetYear}
        activeDatePreset={activeDatePreset}
        setActiveDatePreset={setActiveDatePreset}
      />

      <div style={{ display: "grid", gap: 22 }}>
        {mode === "dashboard" ? (
          <>
            <RankingTable
              data={filtered}
              setHoveredDetails={setHoveredDetails}
              setPinnedDetails={setPinnedDetails}
              rankMap={rankMap}
              rowLimit={rankingRowLimit}
              setRowLimit={setRankingRowLimit}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(560px, 1fr))", gap: 18 }}>
              <ParetoChart title="Contratos fechados" data={paretoContratos} metric="contratos" periodLabel={periodLabel} setHoveredDetails={setHoveredDetails} setPinnedDetails={setPinnedDetails} />
              <ParetoChart title="TCV" data={paretoTcv} metric="tcv" periodLabel={periodLabel} setHoveredDetails={setHoveredDetails} setPinnedDetails={setPinnedDetails} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(560px, 1fr))", gap: 18 }}>
              <ParetoChart title="R1" data={paretoReunioes} metric="r1" periodLabel={periodLabel} setHoveredDetails={setHoveredDetails} setPinnedDetails={setPinnedDetails} />
              <ParetoChart title="Propostas enviadas" data={paretoPropostas} metric="propostas" periodLabel={periodLabel} setHoveredDetails={setHoveredDetails} setPinnedDetails={setPinnedDetails} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(560px, 1fr))", gap: 18 }}>
              <ParetoChart title="Faturamento Galapos" data={paretoFaturamento} metric="faturamento" periodLabel={periodLabel} maxVisibleItems={10} setHoveredDetails={setHoveredDetails} setPinnedDetails={setPinnedDetails} />
              <ParetoChart title="Comissões pagas" data={paretoComissao} metric="comissao" periodLabel={periodLabel} maxVisibleItems={10} setHoveredDetails={setHoveredDetails} setPinnedDetails={setPinnedDetails} />
            </div>
            <HighlightsLowlights data={filteredForLowlights} />
          </>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(360px, 0.85fr)", gap: 18 }}>
              <RankingTable
                data={filtered}
                setHoveredDetails={setHoveredDetails}
                setPinnedDetails={setPinnedDetails}
                rankMap={rankMap}
                rowLimit={rankingRowLimit}
                setRowLimit={setRankingRowLimit}
              />
              <ExecutiveBoard data={filtered} />
            </div>
            <MeetingJourneyTable events={serviceJourneyEvents} filters={filters} data={data} />
          </>
        )}
      </div>
      </>
    </div>
  );
}


















