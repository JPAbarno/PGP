import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getManagedAccessDecision, isAdminOrGalaposAccess, isCronAuthorized } from "@/lib/access-control";
import { refreshMetricsCache } from "../route";

type RebuildAuthorization =
  | { ok: true; source: "cron" | "manual" }
  | { ok: false; response: NextResponse };

async function handleRebuild(source: string) {
  try {
    const payload = await refreshMetricsCache(source);
    return NextResponse.json({
      ok: true,
      generatedAt: payload.meta.generatedAt ?? "",
      partnerCount: payload.meta.partnerCount ?? 0,
      dealCount: payload.meta.dealCount ?? 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao reconstruir snapshot." },
      { status: 500 }
    );
  }
}

async function authorizeRebuildRequest(request: Request): Promise<RebuildAuthorization> {
  if (isCronAuthorized(request)) {
    return { ok: true, source: "cron" as const };
  }

  try {
    const session = await getServerSession(authOptions);
    const decision = await getManagedAccessDecision(session?.user?.email);

    if (decision.access === "unauthenticated") {
      return {
        ok: false,
        response: NextResponse.json({ error: "Autenticação necessária." }, { status: 401 }),
      };
    }

    if (!isAdminOrGalaposAccess(decision)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Acesso negado." }, { status: 403 }),
      };
    }

    return { ok: true, source: "manual" as const };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Erro ao validar acesso." }, { status: 500 }),
    };
  }
}

export async function GET(request: Request) {
  const authorization = await authorizeRebuildRequest(request);
  if (!authorization.ok) return authorization.response;

  return handleRebuild(authorization.source);
}

export async function POST(request: Request) {
  const authorization = await authorizeRebuildRequest(request);
  if (!authorization.ok) return authorization.response;

  return handleRebuild(authorization.source);
}
