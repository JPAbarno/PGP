export function PortalPlaceholder({ title }: { title: string }) {
  return (
    <section
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: 28,
      }}
    >
      <h1 style={{ fontSize: 36, lineHeight: 1.1, marginBottom: 12 }}>{title}</h1>
      <p style={{ color: "#9ca3af", fontSize: 16, lineHeight: 1.6 }}>Em breve.</p>
    </section>
  );
}
