import type { ManagedUser, ManagedUserRole } from "./dataverse-access";

const DEFAULT_ALLOWED_EMAIL_DOMAIN = "@galapos.com.br";

export type ManagedAccessScope = "all" | "partner";

export type ManagedAccessForbiddenReason = "not_managed" | "inactive" | "missing_partner";

export type ActiveManagedUser = ManagedUser & {
  status: "active";
};

export type ManagedAccessUnauthenticatedDecision = {
  access: "unauthenticated";
};

export type ManagedAccessForbiddenDecision = {
  access: "forbidden";
  reason: ManagedAccessForbiddenReason;
  user?: ManagedUser;
};

export type ManagedAccessAllowedDecision = {
  access: "allowed";
  user: ActiveManagedUser;
  role: ManagedUserRole;
  status: "active";
  scope: ManagedAccessScope;
  partnerName: string | null;
};

export type ManagedAccessDecision =
  | ManagedAccessUnauthenticatedDecision
  | ManagedAccessForbiddenDecision
  | ManagedAccessAllowedDecision;

export type PortalPartnerScopeResult =
  | { ok: true; partnerName: string }
  | { ok: false; status: 400 | 403; error: string };

export function getAllowedEmailDomain() {
  const configuredDomain = process.env.ALLOWED_EMAIL_DOMAIN?.trim();
  const domain = configuredDomain || DEFAULT_ALLOWED_EMAIL_DOMAIN;
  const normalizedDomain = domain.toLowerCase();

  return normalizedDomain.startsWith("@") ? normalizedDomain : `@${normalizedDomain}`;
}

export function isAllowedEmail(email: string | null | undefined) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();

  return Boolean(normalizedEmail) && normalizedEmail.endsWith(getAllowedEmailDomain());
}

export function getInternalUserAccessStatus(email: string | null | undefined) {
  if (!email) return "unauthenticated";

  return isAllowedEmail(email) ? "allowed" : "forbidden";
}

export function isCronAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${cronSecret}`;
}

export function normalizePartnerName(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function isSamePartnerName(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  return normalizePartnerName(String(a ?? "")) === normalizePartnerName(String(b ?? ""));
}

export function resolvePortalPartnerScope(
  decision: ManagedAccessDecision,
  requestedPartner?: string | null
): PortalPartnerScopeResult {
  const hasRequestedPartner = requestedPartner !== null && requestedPartner !== undefined;
  const requestedPartnerName = String(requestedPartner ?? "").trim();

  if (isAdminOrGalaposAccess(decision)) {
    if (!requestedPartnerName) {
      return { ok: false, status: 400, error: "Parceiro obrigatório." };
    }

    return { ok: true, partnerName: requestedPartnerName };
  }

  if (isPartnerAccess(decision)) {
    const managedPartnerName = decision.partnerName.trim();

    if (!managedPartnerName) {
      return { ok: false, status: 403, error: "Acesso negado." };
    }

    if (!hasRequestedPartner) {
      return { ok: true, partnerName: managedPartnerName };
    }

    if (isSamePartnerName(requestedPartnerName, managedPartnerName)) {
      return { ok: true, partnerName: managedPartnerName };
    }
  }

  return { ok: false, status: 403, error: "Acesso negado." };
}

function getManagedAccessScope(role: ManagedUserRole): ManagedAccessScope {
  return role === "partner" ? "partner" : "all";
}

function hasMissingPartnerError(err: unknown) {
  return (
    err instanceof Error &&
    err.name === "DataverseAccessError" &&
    "code" in err &&
    err.code === "invalid_record" &&
    err.message.includes("sem parceiro associado")
  );
}

export async function getManagedAccessDecision(
  email: string | null | undefined
): Promise<ManagedAccessDecision> {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();

  if (!normalizedEmail) {
    return { access: "unauthenticated" };
  }

  try {
    const { getManagedUserByEmail } = await import("./dataverse-access");
    const user = await getManagedUserByEmail(normalizedEmail);

    if (!user) {
      return { access: "forbidden", reason: "not_managed" };
    }

    if (user.status === "inactive") {
      return { access: "forbidden", reason: "inactive", user };
    }

    if (user.role === "partner" && !user.partnerName) {
      return { access: "forbidden", reason: "missing_partner", user };
    }

    const activeUser: ActiveManagedUser = {
      ...user,
      status: "active",
    };
    const scope = getManagedAccessScope(activeUser.role);

    return {
      access: "allowed",
      user: activeUser,
      role: activeUser.role,
      status: activeUser.status,
      scope,
      partnerName: scope === "partner" ? activeUser.partnerName : null,
    };
  } catch (err) {
    if (hasMissingPartnerError(err)) {
      return { access: "forbidden", reason: "missing_partner" };
    }

    throw err;
  }
}

export function isManagedAccessAllowed(
  decision: ManagedAccessDecision
): decision is ManagedAccessAllowedDecision {
  return decision.access === "allowed";
}

export function isAdminAccess(
  decision: ManagedAccessDecision
): decision is ManagedAccessAllowedDecision & { role: "admin"; scope: "all" } {
  return decision.access === "allowed" && decision.role === "admin";
}

export function isAdminOrGalaposAccess(
  decision: ManagedAccessDecision
): decision is ManagedAccessAllowedDecision & { role: "admin" | "galapos"; scope: "all" } {
  return decision.access === "allowed" && (decision.role === "admin" || decision.role === "galapos");
}

export function isPartnerAccess(
  decision: ManagedAccessDecision
): decision is ManagedAccessAllowedDecision & { role: "partner"; scope: "partner"; partnerName: string } {
  return decision.access === "allowed" && decision.role === "partner" && Boolean(decision.partnerName);
}
