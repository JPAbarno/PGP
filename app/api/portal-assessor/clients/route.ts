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

type ContractMetricSnapshotEntry = {
  dealId?: string | null;
  dealName?: string | null;
  parceiro?: string | null;
  closeDate?: string | null;
  createDate?: string | null;
  status?: string | null;
};

type SnapshotPayload = {
  contractMetrics?: ContractMetricSnapshotEntry[] | null;
};

type SnapshotEnvelope = {
  payload?: SnapshotPayload | null;
};

type PortalAssessorClient = {
  dealId: string;
  dealName: string;
  parceiro: string;
  closeDate: string | null;
  createDate: string | null;
  status: string;
};

const ACCESS_ERROR = "Acesso negado.";
const PARTNER_REQUIRED_ERROR = "Parceiro obrigatorio.";
const CLIENTS_ERROR = "Nao foi possivel carregar os clientes.";
const SNAPSHOT_PATH = path.join(process.cwd(), "data", "partner-metrics-snapshot.json");

function stringOrEmpty(value: unknown): string {
  return String(value ?? "").trim();
}

function stringOrNull(value: unknown): string | null {
  const normalized = stringOrEmpty(value);
  return normalized || null;
}

async function readContractMetrics(): Promise<ContractMetricSnapshotEntry[] | null> {
  try {
    const raw = await readFile(SNAPSHOT_PATH, "utf8");
    const parsed = JSON.parse(raw) as SnapshotEnvelope;
    const contractMetrics = parsed?.payload?.contractMetrics;
    if (!Array.isArray(contractMetrics)) return null;
    return contractMetrics;
  } catch {
    return null;
  }
}

function mapClient(entry: ContractMetricSnapshotEntry): PortalAssessorClient {
  return {
    dealId: stringOrEmpty(entry.dealId),
    dealName: stringOrEmpty(entry.dealName),
    parceiro: stringOrEmpty(entry.parceiro),
    closeDate: stringOrNull(entry.closeDate),
    createDate: stringOrNull(entry.createDate),
    status: stringOrEmpty(entry.status),
  };
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

    const { partnerName } = partnerScope;
    const contractMetrics = await readContractMetrics();

    if (contractMetrics === null) {
      return NextResponse.json({
        clients: [],
        meta: { partnerName, clientCount: 0 },
      });
    }

    const clients = contractMetrics
      .filter((entry) => isSamePartnerName(entry.parceiro, partnerName))
      .map(mapClient);

    return NextResponse.json({
      clients,
      meta: { partnerName, clientCount: clients.length },
    });
  } catch {
    return NextResponse.json({ error: CLIENTS_ERROR }, { status: 500 });
  }
}
