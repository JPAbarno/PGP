import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getInternalUserAccessStatus, isCronAuthorized } from "@/lib/access-control";
import { refreshMetricsCache } from "../route";

type RebuildAuthorization =
  | { ok: true; source: "cron" | "manual" }
  | { ok: false; response: NextResponse };

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function handleRebuild(source: string) {
  try {
    const payload = await refreshMetricsCache(source);
    return NextResponse.json({
      ok: true,
      generatedAt: payload.meta.generatedAt ?? "",
      partnerCount: payload.meta.partnerCount ?? 0,
      dealCount: payload.meta.dealCount ?? 0,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Erro ao reconstruir snapshot",
        details: getErrorMessage(err),
      },
      { status: 500 }
    );
  }
}

async function authorizeRebuildRequest(request: Request): Promise<RebuildAuthorization> {
  if (isCronAuthorized(request)) {
    return { ok: true, source: "cron" as const };
  }

  const session = await getServerSession(authOptions);
  const accessStatus = getInternalUserAccessStatus(session?.user?.email);

  if (accessStatus === "forbidden") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Acesso restrito a usuários Galapos." }, { status: 403 }),
    };
  }

  if (accessStatus === "unauthenticated") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Autenticação necessária ou segredo inválido." }, { status: 401 }),
    };
  }

  return { ok: true, source: "manual" as const };
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
