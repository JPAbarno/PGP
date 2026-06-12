import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getManagedAccessDecision, isAdminAccess } from "@/lib/access-control";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const decision = await getManagedAccessDecision(session?.user?.email);

    if (decision.access === "unauthenticated") {
      return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    if (!isAdminAccess(decision)) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Erro ao validar acesso." }, { status: 500 });
  }

  try {
    const dealId = request.nextUrl.searchParams.get("dealId")?.trim();
    if (!dealId) {
      return NextResponse.json({ error: "dealId é obrigatório." }, { status: 400 });
    }

    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Erro ao processar debug." }, { status: 500 });
    }

    const props = [
      "dealname",
      "pipeline",
      "dealstage",
      "parceiro",
      "canal",
      "closedate",
      "createdate",
      "data_do_envio_da_proposta",
      "tcv_ponderado",
      "tcv_ponderado_proposta",
    ].join(",");

    const resp = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals/${encodeURIComponent(dealId)}?properties=${encodeURIComponent(props)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await resp.text();
    if (!resp.ok) {
      return NextResponse.json({ error: "Erro ao processar debug." }, { status: 500 });
    }

    const deal = JSON.parse(text) as {
      properties?: Record<string, string | null | undefined>;
    };

    const pipelineId = String(deal.properties?.pipeline ?? "").trim();
    const stageId = String(deal.properties?.dealstage ?? "").trim();
    let stageLabel = "";

    if (pipelineId) {
      const pipelineResp = await fetch(`https://api.hubapi.com/crm/v3/pipelines/deals/${encodeURIComponent(pipelineId)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (pipelineResp.ok) {
        const pipelinePayload = (await pipelineResp.json()) as {
          stages?: Array<{ id?: string; label?: string }>;
        };
        stageLabel =
          pipelinePayload.stages?.find((stage) => String(stage.id ?? "").trim() === stageId)?.label?.trim() ?? "";
      }
    }

    return NextResponse.json({
      ...deal,
      debug: {
        pipelineId,
        stageId,
        stageLabel,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao processar debug." }, { status: 500 });
  }
}
