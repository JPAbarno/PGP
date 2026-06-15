"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { PartnerAnalytics } from "@/components/partner-analytics";
import type { PartnerMetric, ServiceJourneyEvent } from "@/lib/mock-data";

type LoadStatus = "loading" | "ready" | "unauthenticated" | "forbidden" | "load_error";

type ApiResponse = {
  partnerMetrics?: PartnerMetric[];
  serviceJourneyEvents?: ServiceJourneyEvent[];
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
const AUTH_REQUIRED_MESSAGE = "Sua sessão não está ativa. Faça login novamente para continuar.";
const FORBIDDEN_MESSAGE = "Você não tem permissão para acessar esta área.";
const LOAD_ERROR_MESSAGE = "Não foi possível carregar os dados agora. Tente novamente mais tarde.";

async function readApiPayload(response: Response): Promise<ApiResponse> {
  return response.json().catch(() => ({}));
}

function loadStatusFromHttpStatus(status: number): Exclude<LoadStatus, "loading" | "ready"> {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  return "load_error";
}

function messageFromLoadStatus(status: LoadStatus) {
  if (status === "unauthenticated") return AUTH_REQUIRED_MESSAGE;
  if (status === "forbidden") return FORBIDDEN_MESSAGE;
  return LOAD_ERROR_MESSAGE;
}

function clearPartnerMetricsCache() {
  try {
    window.sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore storage availability issues.
  }
}

function StatusCard({
  eyebrow,
  message,
  action,
}: {
  eyebrow: string;
  message: string;
  action?: { href: string; label: string };
}) {
  const cardStyle: CSSProperties = {
    padding: 24,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
    color: "#d1d5db",
  };
  const actionStyle: CSSProperties = {
    borderRadius: 999,
    border: "1px solid rgba(255,193,48,0.35)",
    background: "rgba(255,193,48,0.08)",
    color: "#ffc130",
    display: "inline-flex",
    fontSize: 14,
    fontWeight: 700,
    marginTop: 16,
    padding: "10px 16px",
    textDecoration: "none",
  };

  return (
    <section style={cardStyle}>
      <div style={{ color: "#ffc130", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 10, textTransform: "uppercase" }}>
        {eyebrow}
      </div>
      <div style={{ color: "#f8fafc", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{message}</div>
      {action && (
        <a href={action.href} style={actionStyle}>
          {action.label}
        </a>
      )}
    </section>
  );
}

export function PartnerAnalyticsLoader() {
  const [data, setData] = useState<PartnerMetric[] | null>(null);
  const [, setServiceJourneyEvents] = useState<ServiceJourneyEvent[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string>("");
  const [staleData, setStaleData] = useState(false);
  const [generatedAt, setGeneratedAt] = useState("");
  const [generatedBy, setGeneratedBy] = useState("");
  const [durationMs, setDurationMs] = useState(0);
  const [partnerCount, setPartnerCount] = useState(0);
  const [dealCount, setDealCount] = useState(0);
  const [rebuilding, setRebuilding] = useState(false);

  const resetLoadedData = useCallback(() => {
    setData(null);
    setServiceJourneyEvents([]);
    setStaleData(false);
    setGeneratedAt("");
    setGeneratedBy("");
    setDurationMs(0);
    setPartnerCount(0);
    setDealCount(0);
  }, []);

  const persistAuthorizedPayload = useCallback((payload: ApiResponse) => {
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
    setLoadStatus("ready");

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
  }, []);

  const applyMetricsLoadFailure = useCallback((status: number) => {
    const nextStatus = loadStatusFromHttpStatus(status);

    if (status === 401 || status === 403) {
      clearPartnerMetricsCache();
    }

    resetLoadedData();
    setError(messageFromLoadStatus(nextStatus));
    setLoadStatus(nextStatus);
  }, [resetLoadedData]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadStatus("loading");
      setError("");
      resetLoadedData();

      try {
        const resp = await fetch("/api/partner-metrics", { cache: "no-store" });
        const payload = await readApiPayload(resp);

        if (!resp.ok) {
          if (!cancelled) applyMetricsLoadFailure(resp.status);
          return;
        }

        if (!cancelled) {
          persistAuthorizedPayload(payload);
        }
      } catch {
        if (!cancelled) {
          resetLoadedData();
          setError(LOAD_ERROR_MESSAGE);
          setLoadStatus("load_error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [applyMetricsLoadFailure, persistAuthorizedPayload, resetLoadedData]);

  async function rebuildSnapshot() {
    setRebuilding(true);
    setError("");

    try {
      const rebuildResp = await fetch("/api/partner-metrics/rebuild", {
        method: "POST",
        cache: "no-store",
      });
      await readApiPayload(rebuildResp);

      if (!rebuildResp.ok) {
        if (rebuildResp.status === 401 || rebuildResp.status === 403) {
          applyMetricsLoadFailure(rebuildResp.status);
          return;
        }

        setError(LOAD_ERROR_MESSAGE);
        return;
      }

      const resp = await fetch("/api/partner-metrics?refresh=1", { cache: "no-store" });
      const payload = await readApiPayload(resp);

      if (!resp.ok) {
        applyMetricsLoadFailure(resp.status);
        return;
      }

      persistAuthorizedPayload(payload);
    } catch {
      setError(LOAD_ERROR_MESSAGE);
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

  if (loadStatus === "loading") {
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

  if (loadStatus === "unauthenticated") {
    return (
      <StatusCard
        eyebrow="Sessão necessária"
        message={error || AUTH_REQUIRED_MESSAGE}
        action={{ href: "/api/auth/signin", label: "Fazer login" }}
      />
    );
  }

  if (loadStatus === "forbidden") {
    return <StatusCard eyebrow="Acesso não liberado" message={error || FORBIDDEN_MESSAGE} />;
  }

  if (loadStatus === "load_error" || !data) {
    return (
      <StatusCard
        eyebrow="Erro ao carregar"
        message={error || LOAD_ERROR_MESSAGE}
        action={{ href: "/dashboard", label: "Tentar novamente" }}
      />
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
          Não foi possível concluir a atualização agora.
          <div style={{ marginTop: 6, color: "#fca5a5", fontSize: 13 }}>{error || LOAD_ERROR_MESSAGE}</div>
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
      <PartnerAnalytics data={data} />
    </div>
  );
}
