import { HubspotFormEmbed } from "../_components/hubspot-form-embed";

export default function PortalAssessorEnviarOportunidadePage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 32px 72px" }}>
      <div style={{ marginBottom: 32 }}>
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
