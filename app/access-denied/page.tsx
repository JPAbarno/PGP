import type { CSSProperties } from "react";

export default function AccessDeniedPage() {
  const actionStyle: CSSProperties = {
    borderRadius: 999,
    border: "1px solid rgba(255,193,48,0.35)",
    background: "rgba(255,193,48,0.08)",
    color: "#ffc130",
    display: "inline-flex",
    fontSize: 14,
    fontWeight: 700,
    marginTop: 20,
    padding: "10px 16px",
    textDecoration: "none",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 32,
      }}
    >
      <section
        style={{
          maxWidth: 520,
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 18,
          background: "rgba(255,255,255,0.03)",
          padding: 28,
        }}
      >
        <div
          style={{
            color: "#FFC130",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.12em",
            marginBottom: 12,
            textTransform: "uppercase",
          }}
        >
          Acesso restrito
        </div>
        <h1 style={{ fontSize: 32, lineHeight: 1.1, marginBottom: 12 }}>Não foi possível liberar seu acesso a esta área.</h1>
        <p style={{ color: "#9ca3af", fontSize: 15, lineHeight: 1.6 }}>
          Se você acredita que deveria ter acesso, entre em contato com o responsável pelo sistema.
        </p>
        <a href="/dashboard" style={actionStyle}>
          Tentar novamente
        </a>
      </section>
    </main>
  );
}
