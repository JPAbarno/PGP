type PortalPageHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PortalPageHeader({ title, subtitle }: PortalPageHeaderProps) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          color: "#FFC130",
          fontSize: 12,
          letterSpacing: "0.12em",
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        Portal do Assessor
      </div>
      <h1 style={{ fontSize: 32, lineHeight: 1.1, marginBottom: subtitle ? 10 : 0 }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ color: "#9ca3af", fontSize: 15, lineHeight: 1.6 }}>{subtitle}</p>
      )}
    </div>
  );
}
