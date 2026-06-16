import type { ReactNode } from "react";
import { PortalNav } from "./_components/portal-nav";

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
          <div
            style={{
              color: "#FFC130",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Portal do Assessor
          </div>
          <PortalNav />
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
