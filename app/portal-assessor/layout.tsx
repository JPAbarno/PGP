import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getManagedAccessDecision } from "@/lib/access-control";
import type { MainNavRole } from "@/components/main-nav";
import { MainNav } from "@/components/main-nav";
import { PortalNav } from "./_components/portal-nav";

export default async function PortalAssessorLayout({ children }: { children: ReactNode }) {
  let role: MainNavRole = "partner";
  let partnerName: string | null = null;
  let userEmail = "";

  try {
    const session = await getServerSession(authOptions);
    userEmail = session?.user?.email ?? "";

    if (userEmail) {
      const decision = await getManagedAccessDecision(userEmail);
      if (decision.access === "allowed") {
        role = decision.role;
        partnerName = decision.partnerName;
      }
    }
  } catch {
    // Dataverse error: default conservador (partner = itens mínimos de nav)
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <MainNav
        role={role}
        active="portal-assessor"
        userEmail={userEmail}
        partnerName={partnerName}
      />
      <div
        style={{
          background: "linear-gradient(180deg, #141414 0%, #111111 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "sticky",
          top: 64,
          zIndex: 20,
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            margin: "0 auto",
            maxWidth: 1180,
            padding: "10px 32px",
          }}
        >
          <span
            style={{
              color: "#FFC130",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Portal do Assessor
          </span>
          <PortalNav />
        </div>
      </div>
      <main>{children}</main>
    </div>
  );
}
