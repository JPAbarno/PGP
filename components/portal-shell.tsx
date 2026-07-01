import { ReactNode } from "react";
import { MainNav, type MainNavRole, type MainNavSection } from "./main-nav";

type PortalShellProps = {
  title: string;
  subtitle: string;
  active: MainNavSection;
  role: MainNavRole;
  userEmail: string;
  partnerName?: string | null;
  children: ReactNode;
};

export function PortalShell({
  title,
  subtitle,
  active,
  role,
  userEmail,
  partnerName,
  children,
}: PortalShellProps) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <MainNav
        role={role}
        active={active}
        userEmail={userEmail}
        partnerName={partnerName}
      />
      <main style={{ maxWidth: 1480, margin: "0 auto", padding: "40px 32px 72px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 40,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              marginBottom: 10,
            }}
          >
            {title}
          </h1>
          <p style={{ color: "#6b7280", fontSize: 17, lineHeight: 1.6, maxWidth: 900 }}>
            {subtitle}
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
