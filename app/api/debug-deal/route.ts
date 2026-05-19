import { NextRequest, NextResponse } from "next/server";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function GET(request: NextRequest) {
  try {
    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Token do HubSpot não encontrado. Verifique o .env.local" }, { status: 500 });
    }

    const dealId = request.nextUrl.searchParams.get("dealId")?.trim();
    if (!dealId) {
      return NextResponse.json({ error: "dealId é obrigatório" }, { status: 400 });
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
      return NextResponse.json(
        { error: `Falha no HubSpot (${resp.status})`, details: text.slice(0, 500) },
        { status: resp.status }
      );
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
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Erro ao inspecionar deal", details: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
