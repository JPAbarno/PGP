"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const NAV_ITEMS = [
  { href: "/portal-assessor", label: "Portal" },
  { href: "/portal-assessor/pipeline", label: "Pipeline" },
  { href: "/portal-assessor/clientes", label: "Clientes" },
  { href: "/portal-assessor/comissoes", label: "Comissões" },
  { href: "/portal-assessor/enviar-oportunidade", label: "Enviar oportunidade" },
];

function NavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parceiro = searchParams.get("parceiro");

  return (
    <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 16 }}>
      {parceiro && (
        <span style={{ color: "#9ca3af", fontSize: 12, whiteSpace: "nowrap" }}>
          {"Contexto: "}
          <strong style={{ color: "#e5e7eb", fontWeight: 600 }}>{parceiro}</strong>
          {" · "}
          <Link
            href="/portal-assessor"
            style={{ color: "#FFC130", textDecoration: "none" }}
          >
            trocar
          </Link>
        </span>
      )}
      <nav style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive = pathname === href;
          const dest =
            parceiro && href !== "/portal-assessor"
              ? `${href}?parceiro=${encodeURIComponent(parceiro)}`
              : href;
          return (
            <Link
              key={href}
              href={dest}
              style={{
                background: isActive ? "rgba(255,193,48,0.08)" : "transparent",
                border: isActive
                  ? "1px solid rgba(255,193,48,0.60)"
                  : "1px solid rgba(255,193,48,0.24)",
                borderRadius: 999,
                color: isActive ? "#FFC130" : "#9ca3af",
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                padding: "8px 12px",
                textDecoration: "none",
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PortalNav() {
  return (
    <Suspense fallback={<div style={{ height: 36 }} />}>
      <NavInner />
    </Suspense>
  );
}

