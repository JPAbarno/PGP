import Link from "next/link";
import { HubspotFormEmbed } from "../_components/hubspot-form-embed";

const SUB_NAV_LINKS = [
  { href: "/portal-assessor", label: "← Portal", preservePartner: false },
  { href: "/portal-assessor/pipeline", label: "Pipeline", preservePartner: true },
  { href: "/portal-assessor/clientes", label: "Clientes", preservePartner: true },
  { href: "/portal-assessor/comissoes", label: "Comissões", preservePartner: true },
];

function SubNav({ partnerName }: { partnerName?: string }) {
  return (
    <nav style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {SUB_NAV_LINKS.map(({ href, label, preservePartner }) => {
        const dest =
          partnerName && preservePartner
            ? `${href}?parceiro=${encodeURIComponent(partnerName)}`
            : href;
        return (
          <Link
            key={href}
            href={dest}
            style={{
              display: "inline-block",
              padding: "8px 16px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 6,
              color: "#d1d5db",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default async function PortalAssessorEnviarOportunidadePage({
  searchParams,
}: {
  searchParams: Promise<{ parceiro?: string | string[] }>;
}) {
  const params = await searchParams;
  const parceiroParam = typeof params.parceiro === "string" ? params.parceiro : undefined;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 32px 72px" }}>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#FFC130",
            marginBottom: 8,
          }}
        >
          Portal do Assessor
        </div>
        <h1 style={{ fontSize: 32, lineHeight: 1.1, marginBottom: 10 }}>
          Enviar oportunidade
        </h1>
        <p style={{ color: "#9ca3af", fontSize: 15, lineHeight: 1.6 }}>
          Preencha o formulário abaixo para registrar uma nova oportunidade.
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <SubNav partnerName={parceiroParam} />
      </div>

      <section
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: 32,
        }}
      >
        <HubspotFormEmbed />
      </section>
    </div>
  );
}
