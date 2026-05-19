import { NextResponse } from "next/server";
import { refreshMetricsCache } from "../route";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${cronSecret}`;
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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "Não autorizado para reconstruir snapshot",
      },
      { status: 401 }
    );
  }

  return handleRebuild("cron");
}

export async function POST() {
  return handleRebuild("manual");
}
