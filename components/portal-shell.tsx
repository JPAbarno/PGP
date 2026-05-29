import Link from "next/link";
import { ReactNode } from "react";

export function PortalShell({ title, subtitle, active, children }: { title: string; subtitle: string; active: "dashboard"; children: ReactNode }) {
  const navLink = (isActive: boolean) => ({
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 999,
    border: isActive ? "1px solid rgba(255,193,48,0.35)" : "1px solid transparent",
    background: isActive ? "rgba(255,193,48,0.10)" : "transparent",
    color: isActive ? "#FFC130" : "#9ca3af",
    textDecoration: "none",
    letterSpacing: "0.04em",
  });

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, #191919 0%, #161616 100%)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1480, margin: "0 auto", padding: "0 32px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FFC130", marginBottom: 2 }}>Analise de Parceiros</div>
            <div style={{ color: "#9ca3af", fontSize: 13 }}>Portal novo, isolado do ambiente do assessor</div>
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/dashboard" style={navLink(active === "dashboard")}>Dashboard</Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1480, margin: "0 auto", padding: "40px 32px 72px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 40, lineHeight: 1.05, letterSpacing: "-0.04em", marginBottom: 10 }}>{title}</h1>
          <p style={{ color: "#6b7280", fontSize: 17, maxWidth: 900, lineHeight: 1.6 }}>{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}

