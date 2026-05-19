"use client";

import { useEffect, useState } from "react";
import { PartnerAnalytics } from "@/components/partner-analytics";
import {
  partnerMetrics as mockPartnerMetrics,
  serviceJourneyEvents as mockServiceJourneyEvents,
  type PartnerMetric,
  type ServiceJourneyEvent,
} from "@/lib/mock-data";

type Mode = "dashboard" | "scorecard";

type ApiResponse = {
  partnerMetrics?: PartnerMetric[];
  serviceJourneyEvents?: ServiceJourneyEvent[];
  error?: string;
  details?: string;
  meta?: {
    stale?: number;
    generatedAt?: string;
    generatedBy?: string;
    durationMs?: number;
    partnerCount?: number;
    dealCount?: number;
  };
};

type CacheEnvelope = {
  partnerMetrics: PartnerMetric[];
  serviceJourneyEvents: ServiceJourneyEvent[];
  generatedAt: string;
  generatedBy: string;
  durationMs: number;
  partnerCount: number;
  dealCount: number;
};

const CACHE_KEY = "analise-parceiros.partner-metrics.v11";

export function PartnerAnalyticsLoader({ mode }: { mode: Mode }) {
  const [data, setData] = useState<PartnerMetric[] | null>(null);
  const [serviceJourneyEvents, setServiceJourneyEvents] = useState<ServiceJourneyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [staleData, setStaleData] = useState(false);
  const [generatedAt, setGeneratedAt] = useState("");
  const [generatedBy, setGeneratedBy] = useState("");
  const [durationMs, setDurationMs] = useState(0);
  const [partnerCount, setPartnerCount] = useState(0);
  const [dealCount, setDealCount] = useState(0);
  const [rebuilding, setRebuilding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let hasCachedData = false;

    try {
      const cached = window.sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CacheEnvelope;
        if (Array.isArray(parsed?.partnerMetrics) && parsed.partnerMetrics.length > 0) {
          hasCachedData = true;
          setData(parsed.partnerMetrics);
          setServiceJourneyEvents(Array.isArray(parsed.serviceJourneyEvents) ? parsed.serviceJourneyEvents : []);
          setGeneratedAt(parsed.generatedAt ?? "");
          setGeneratedBy(parsed.generatedBy ?? "");
          setDurationMs(parsed.durationMs ?? 0);
          setPartnerCount(parsed.partnerCount ?? parsed.partnerMetrics.length);
          setDealCount(parsed.dealCount ?? 0);
          setLoading(false);
        }
      }
    } catch {
      // Ignore malformed session cache and continue with network fetch.
    }

    async function load() {
      if (!hasCachedData) setLoading(true);
      setError("");

      try {
        const resp = await fetch("/api/partner-metrics", { cache: "no-store" });
        const payload = (await resp.json()) as ApiResponse;

        if (!resp.ok) {
          throw new Error(payload.details || payload.error || "Falha ao carregar dados reais.");
        }

        if (!cancelled) {
          const nextData = payload.partnerMetrics ?? [];
          const nextServiceJourneyEvents = payload.serviceJourneyEvents ?? [];
          const nextGeneratedAt = String(payload.meta?.generatedAt ?? "");
          const nextGeneratedBy = String(payload.meta?.generatedBy ?? "");
          const nextDurationMs = Number(payload.meta?.durationMs ?? 0);
          const nextPartnerCount = Number(payload.meta?.partnerCount ?? nextData.length);
          const nextDealCount = Number(payload.meta?.dealCount ?? 0);
          setData(nextData);
          setServiceJourneyEvents(nextServiceJourneyEvents);
          setStaleData(Boolean(payload.meta?.stale));
          setGeneratedAt(nextGeneratedAt);
          setGeneratedBy(nextGeneratedBy);
          setDurationMs(nextDurationMs);
          setPartnerCount(nextPartnerCount);
          setDealCount(nextDealCount);
          try {
            window.sessionStorage.setItem(
              CACHE_KEY,
              JSON.stringify({
                partnerMetrics: nextData,
                serviceJourneyEvents: nextServiceJourneyEvents,
                generatedAt: nextGeneratedAt,
                generatedBy: nextGeneratedBy,
                durationMs: nextDurationMs,
                partnerCount: nextPartnerCount,
                dealCount: nextDealCount,
              } satisfies CacheEnvelope)
            );
          } catch {
            // Ignore sessionStorage quota/cache issues.
          }
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          setData((current) => current ?? mockPartnerMetrics);
          setServiceJourneyEvents((current) => current.length > 0 ? current : mockServiceJourneyEvents);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function rebuildSnapshot() {
    setRebuilding(true);
    setError("");

    try {
      const rebuildResp = await fetch("/api/partner-metrics/rebuild", {
        method: "POST",
        cache: "no-store",
      });
      const rebuildPayload = (await rebuildResp.json()) as ApiResponse;

      if (!rebuildResp.ok) {
        throw new Error(rebuildPayload.details || rebuildPayload.error || "Falha ao reconstruir snapshot.");
      }

      const resp = await fetch("/api/partner-metrics?refresh=1", { cache: "no-store" });
      const payload = (await resp.json()) as ApiResponse;

      if (!resp.ok) {
        throw new Error(payload.details || payload.error || "Falha ao recarregar snapshot.");
      }

      const nextData = payload.partnerMetrics ?? [];
      const nextServiceJourneyEvents = payload.serviceJourneyEvents ?? [];
      const nextGeneratedAt = String(payload.meta?.generatedAt ?? "");
      const nextGeneratedBy = String(payload.meta?.generatedBy ?? "");
      const nextDurationMs = Number(payload.meta?.durationMs ?? 0);
      const nextPartnerCount = Number(payload.meta?.partnerCount ?? nextData.length);
      const nextDealCount = Number(payload.meta?.dealCount ?? 0);
      setData(nextData);
      setServiceJourneyEvents(nextServiceJourneyEvents);
      setStaleData(Boolean(payload.meta?.stale));
      setGeneratedAt(nextGeneratedAt);
      setGeneratedBy(nextGeneratedBy);
      setDurationMs(nextDurationMs);
      setPartnerCount(nextPartnerCount);
      setDealCount(nextDealCount);

      try {
        window.sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            partnerMetrics: nextData,
            serviceJourneyEvents: nextServiceJourneyEvents,
            generatedAt: nextGeneratedAt,
            generatedBy: nextGeneratedBy,
            durationMs: nextDurationMs,
            partnerCount: nextPartnerCount,
            dealCount: nextDealCount,
          } satisfies CacheEnvelope)
        );
      } catch {
        // Ignore session cache write issues.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRebuilding(false);
    }
  }

  const generatedLabel = generatedAt
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(generatedAt))
    : "Snapshot ainda não gerado";
  const generatedByLabel =
    generatedBy === "cron"
      ? "cron"
      : generatedBy === "manual"
        ? "manual"
        : generatedBy === "background"
          ? "background"
          : generatedBy === "cold-start"
            ? "carga fria"
            : generatedBy || "desconhecido";

  if (loading && !data) {
    return (
      <section
        style={{
          padding: 24,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
          color: "#9ca3af",
        }}
      >
        Carregando dados reais de HubSpot + BI...
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          padding: 16,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b88a8" }}>
            Snapshot da Base
          </span>
          <strong style={{ fontSize: 16, color: "#f8fafc" }}>{generatedLabel}</strong>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            Via {generatedByLabel} · {partnerCount} parceiros · {dealCount} deals · {(durationMs / 1000).toFixed(1)}s
          </span>
        </div>
        <button
          type="button"
          onClick={rebuildSnapshot}
          disabled={rebuilding}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(255,193,48,0.35)",
            background: rebuilding ? "rgba(255,193,48,0.15)" : "rgba(255,193,48,0.08)",
            color: "#ffc130",
            padding: "10px 16px",
            fontWeight: 700,
            cursor: rebuilding ? "progress" : "pointer",
          }}
        >
          {rebuilding ? "Atualizando base..." : "Atualizar base"}
        </button>
      </section>
      {error && (
        <section
          style={{
            padding: 18,
            borderRadius: 16,
            border: "1px solid rgba(255,120,120,0.28)",
            background: "rgba(120,20,20,0.18)",
            color: "#fecaca",
          }}
        >
          Falha ao carregar dados reais. Exibindo base mockada por enquanto.
          <div style={{ marginTop: 6, color: "#fca5a5", fontSize: 13 }}>{error}</div>
        </section>
      )}
      {!error && staleData && (
        <section
          style={{
            padding: 14,
            borderRadius: 16,
            border: "1px solid rgba(255,193,48,0.22)",
            background: "rgba(255,193,48,0.08)",
            color: "#f5d78e",
            fontSize: 13,
          }}
        >
          Exibindo o último snapshot disponível enquanto a base real é reprocessada.
        </section>
      )}
      {!error && loading && data && (
        <section
          style={{
            padding: 14,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: "#9ca3af",
            fontSize: 13,
          }}
        >
          Atualizando dados reais de HubSpot + BI...
        </section>
      )}
      <PartnerAnalytics data={data ?? mockPartnerMetrics} serviceJourneyEvents={serviceJourneyEvents} mode={mode} />
    </div>
  );
}
