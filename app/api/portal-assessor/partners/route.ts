import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { authOptions } from "@/auth";
import {
  getManagedAccessDecision,
  isAdminOrGalaposAccess,
  isManagedAccessAllowed,
  isPartnerAccess,
  normalizePartnerName,
} from "@/lib/access-control";

type PartnerMetricSnapshotEntry = {
  parceiro?: string | null;
};

type PartnerMetricsSnapshotPayload = {
  partnerMetrics?: PartnerMetricSnapshotEntry[] | null;
};

type SnapshotEnvelope = {
  payload?: PartnerMetricsSnapshotPayload | null;
};

const ACCESS_ERROR = "Acesso negado.";
const PARTNERS_ERROR = "Não foi possível carregar os parceiros.";
const SNAPSHOT_PATH = path.join(process.cwd(), "data", "partner-metrics-snapshot.json");

function uniqueSortedPartnerNames(partnerMetrics: PartnerMetricSnapshotEntry[]) {
  const partnersByNormalizedName = new Map<string, string>();

  for (const metric of partnerMetrics) {
    const partnerName = String(metric?.parceiro ?? "").trim();
    const normalizedPartnerName = normalizePartnerName(partnerName);

    if (!partnerName || !normalizedPartnerName) continue;
    if (!partnersByNormalizedName.has(normalizedPartnerName)) {
      partnersByNormalizedName.set(normalizedPartnerName, partnerName);
    }
  }

  return [...partnersByNormalizedName.values()].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );
}

async function readPartnerNamesFromSnapshot() {
  try {
    const raw = await readFile(SNAPSHOT_PATH, "utf8");
    const parsed = JSON.parse(raw) as SnapshotEnvelope;
    const partnerMetrics = parsed.payload?.partnerMetrics;

    if (!Array.isArray(partnerMetrics)) return [];

    return uniqueSortedPartnerNames(partnerMetrics);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const decision = await getManagedAccessDecision(session?.user?.email);

    if (decision.access === "unauthenticated") {
      return NextResponse.json({ error: ACCESS_ERROR }, { status: 401 });
    }

    if (!isManagedAccessAllowed(decision)) {
      return NextResponse.json({ error: ACCESS_ERROR }, { status: 403 });
    }

    if (isAdminOrGalaposAccess(decision)) {
      return NextResponse.json({ partners: await readPartnerNamesFromSnapshot() });
    }

    if (isPartnerAccess(decision)) {
      const partnerName = decision.partnerName.trim();

      if (!normalizePartnerName(partnerName)) {
        return NextResponse.json({ error: ACCESS_ERROR }, { status: 403 });
      }

      return NextResponse.json({ partners: [partnerName] });
    }

    return NextResponse.json({ error: ACCESS_ERROR }, { status: 403 });
  } catch {
    return NextResponse.json({ error: PARTNERS_ERROR }, { status: 500 });
  }
}
