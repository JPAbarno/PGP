import { NextRequest, NextResponse } from "next/server";

type MeetingProperty = {
  name?: string;
  label?: string;
  type?: string;
  fieldType?: string;
  groupName?: string;
  options?: Array<{ label?: string; value?: string }>;
};

type MeetingObject = {
  id?: string;
  properties?: Record<string, string | null | undefined>;
};

const R1_MEETING_TYPE_LABEL = "1ª Reunião - Investigação";

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isTruthyValue(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

async function hubspotFetch<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Falha no HubSpot (${resp.status}): ${text.slice(0, 280)}`);
  }

  return (await resp.json()) as T;
}

async function getMeetingSchema(token: string) {
  const payload = await hubspotFetch<{ results?: MeetingProperty[] }>(
    token,
    "https://api.hubapi.com/crm/v3/properties/meetings"
  );

  const allProps = payload.results ?? [];
  const normalizedTarget = normalizeText(R1_MEETING_TYPE_LABEL);

  const likelyTypeProps = allProps.filter((prop) => {
    const haystack = `${prop.name ?? ""} ${prop.label ?? ""}`;
    const normalized = normalizeText(haystack);
    return (
      normalized.includes("tipo") ||
      normalized.includes("reuniao") ||
      normalized.includes("meeting") ||
      normalized.includes("type")
    );
  });

  const exactCandidates = allProps.filter((prop) => {
    const options = prop.options ?? [];
    return options.some((option) => normalizeText(String(option.label ?? "")) === normalizedTarget);
  });

  return {
    allProps,
    likelyTypeProps,
    exactCandidates,
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Token do HubSpot não encontrado." }, { status: 500 });
    }

    const dealId = request.nextUrl.searchParams.get("dealId")?.trim();
    if (!dealId) {
      return NextResponse.json({ error: "Informe ?dealId=..." }, { status: 400 });
    }

    const schema = await getMeetingSchema(token);
    const assoc = await hubspotFetch<{ results?: Array<{ toObjectId?: number | string }> }>(
      token,
      `https://api.hubapi.com/crm/v4/objects/deals/${encodeURIComponent(dealId)}/associations/meetings`
    );

    const meetingIds = (assoc.results ?? []).map((item) => String(item.toObjectId ?? "").trim()).filter(Boolean);
    const propertiesToRead = schema.allProps.map((prop) => String(prop.name ?? "").trim()).filter(Boolean);

    const meetings = meetingIds.length
      ? await hubspotFetch<{ results?: MeetingObject[] }>(
          token,
          "https://api.hubapi.com/crm/v3/objects/meetings/batch/read",
          {
            method: "POST",
            body: JSON.stringify({
              properties: propertiesToRead,
              inputs: meetingIds.map((id) => ({ id })),
            }),
          }
        )
      : { results: [] };

    const compactMeetings = (meetings.results ?? []).map((meeting) => {
      const properties = meeting.properties ?? {};
      const nonEmptyProperties = Object.fromEntries(
        Object.entries(properties).filter(([, value]) => isTruthyValue(value))
      );

      const matchingProperties = Object.entries(nonEmptyProperties)
        .filter(([, value]) => normalizeText(String(value ?? "")) === normalizeText(R1_MEETING_TYPE_LABEL))
        .map(([key, value]) => ({ key, value }));

      return {
        id: meeting.id,
        nonEmptyProperties,
        matchingProperties,
      };
    });

    return NextResponse.json({
      dealId,
      targetLabel: R1_MEETING_TYPE_LABEL,
      meetingIds,
      schema: {
        totalProperties: schema.allProps.length,
        exactCandidates: schema.exactCandidates,
        likelyTypeProps: schema.likelyTypeProps,
      },
      meetings: compactMeetings,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao inspecionar R1", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
