import Link from "next/link";

export type MainNavRole = "admin" | "galapos" | "partner";
export type MainNavSection = "dashboard" | "portal-assessor" | "configuracoes";

type MainNavProps = {
  role: MainNavRole;
  active: MainNavSection;
  userEmail: string;
  partnerName?: string | null;
};

function navLinkStyle(isActive: boolean) {
  return {
    background: isActive ? "rgba(255,193,48,0.08)" : "transparent",
    border: isActive
      ? "1px solid rgba(255,193,48,0.35)"
      : "1px solid transparent",
    borderRadius: 999,
    color: isActive ? "#FFC130" : "#9ca3af",
    fontSize: 13,
    fontWeight: (isActive ? 700 : 500) as number,
    letterSpacing: "0.02em",
    padding: "7px 14px",
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
  };
}

export function MainNav({ role, active, userEmail, partnerName }: MainNavProps) {
  const isAdminOrGalapos = role === "admin" || role === "galapos";

  return (
    <header
      style={{
        background: "linear-gradient(180deg, #191919 0%, #161616 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 24,
          justifyContent: "space-between",
          margin: "0 auto",
          maxWidth: 1480,
          minHeight: 64,
          padding: "0 32px",
        }}
      >
        <div
          style={{
            color: "#FFC130",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Analise de Parceiros
        </div>

        <nav style={{ alignItems: "center", display: "flex", gap: 4 }}>
          {isAdminOrGalapos && (
            <Link href="/dashboard" style={navLinkStyle(active === "dashboard")}>
              Gestão do Canal
            </Link>
          )}
          <Link href="/portal-assessor" style={navLinkStyle(active === "portal-assessor")}>
            Portal do Assessor
          </Link>
          {isAdminOrGalapos && (
            <Link href="/configuracoes" style={navLinkStyle(active === "configuracoes")}>
              Configurações
            </Link>
          )}
        </nav>

        <div style={{ alignItems: "center", display: "flex", gap: 12 }}>
          {role === "partner" && partnerName && (
            <span
              style={{
                color: "#e5e7eb",
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {partnerName}
            </span>
          )}
          <span
            style={{
              color: "#9ca3af",
              fontSize: 12,
              maxWidth: 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {userEmail}
          </span>
          <Link
            href="/api/auth/signout"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999,
              color: "#6b7280",
              fontSize: 12,
              padding: "4px 12px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Sair
          </Link>
        </div>
      </div>
    </header>
  );
}
