import Link from "next/link";

export function PartnerSelector({ partners }: { partners: string[] }) {
  if (partners.length === 0) {
    return (
      <section
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: 28,
        }}
      >
        <p style={{ color: "#9ca3af", fontSize: 15, marginBottom: 8 }}>
          Nenhum parceiro encontrado no snapshot atual.
        </p>
        <p style={{ color: "#6b7280", fontSize: 13 }}>
          O snapshot pode estar desatualizado ou ainda não contém dados de parceiros.
          Rode o rebuild para atualizar os dados.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: 28,
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Selecione um parceiro</h2>
      <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20 }}>
        Escolha um escritório parceiro para visualizar os dados do Portal.
      </p>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {partners.map((name) => (
          <li key={name}>
            <Link
              href={`/portal-assessor/pipeline?parceiro=${encodeURIComponent(name)}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                color: "#e5e7eb",
                textDecoration: "none",
                fontSize: 15,
              }}
            >
              <span>{name}</span>
              <span style={{ color: "#9ca3af", fontSize: 12 }}>Ver Pipeline →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
