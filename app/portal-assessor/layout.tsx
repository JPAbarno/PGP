import Link from "next/link";
import type { ReactNode } from "react";

const portalRoutes = [
  { href: "/portal-assessor", label: "Inicio" },
  { href: "/portal-assessor/pipeline", label: "Pipeline" },
  { href: "/portal-assessor/clientes", label: "Clientes" },
  { href: "/portal-assessor/comissoes", label: "Comissoes" },
  { href: "/portal-assessor/enviar-oportunidade", label: "Enviar oportunidade" },
];

const linkStyle = {
  border: "1px solid rgba(255,193,48,0.24)",
  borderRadius: 999,
  color: "#FFC130",
  fontSize: 12,
  fontWeight: 700,
  padding: "8px 12px",
  textDecoration: "none",
};

export default function PortalAssessorLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          background: "linear-gradient(180deg, #191919 0%, #161616 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 24,
            justifyContent: "space-between",
            margin: "0 auto",
            maxWidth: 1180,
            minHeight: 72,
            padding: "14px 32px",
          }}
        >
          <div>
            <div
              style={{
                color: "#FFC130",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Portal do Assessor
            </div>
            <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>Modulo em preparacao</div>
          </div>
          <nav style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {portalRoutes.map((route) => (
              <Link href={route.href} key={route.href} style={linkStyle}>
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ margin: "0 auto", maxWidth: 1180, padding: "40px 32px 72px" }}>{children}</main>
    </div>
  );
}
