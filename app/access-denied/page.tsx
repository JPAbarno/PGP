export default function AccessDeniedPage() {
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
        <h1 style={{ fontSize: 32, lineHeight: 1.1, marginBottom: 12 }}>Acesso restrito a usuários Galapos.</h1>
        <p style={{ color: "#9ca3af", fontSize: 15, lineHeight: 1.6 }}>
          Use uma conta corporativa com e-mail @galapos.com.br para acessar a PGP.
        </p>
      </section>
    </main>
  );
}
