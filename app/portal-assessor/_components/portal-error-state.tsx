export function PortalErrorState({ message }: { message: string }) {
  return (
    <section
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(239,68,68,0.30)",
        borderRadius: 8,
        padding: 28,
      }}
    >
      <p style={{ color: "#f87171", fontSize: 15 }}>{message}</p>
    </section>
  );
}
