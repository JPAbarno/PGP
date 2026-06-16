import { HubspotFormEmbed } from "../_components/hubspot-form-embed";
import { PortalPageHeader } from "../_components/portal-page-header";

export default function PortalAssessorEnviarOportunidadePage() {
  return (
    <div style={{ margin: "0 auto", maxWidth: 800, padding: "40px 32px 72px" }}>
      <PortalPageHeader
        title="Enviar oportunidade"
        subtitle="Preencha o formulário abaixo para registrar uma nova oportunidade."
      />

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
