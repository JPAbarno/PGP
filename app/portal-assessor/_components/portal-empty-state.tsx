import Link from "next/link";

export function PortalNoPartnerState({ resource }: { resource: string }) {
  return (
    <section
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: 28,
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
        Selecione um parceiro
      </h2>
      <p style={{ color: "#9ca3af", fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
        É necessário selecionar um parceiro antes de visualizar {resource}. Volte ao Portal do
        Assessor e escolha um parceiro para continuar.
      </p>
      <Link
        href="/portal-assessor"
        style={{
          background: "#FFC130",
          borderRadius: 6,
          color: "#111",
          display: "inline-block",
          fontSize: 14,
          fontWeight: 700,
          padding: "10px 20px",
          textDecoration: "none",
        }}
      >
        ← Selecionar parceiro
      </Link>
    </section>
  );
}
