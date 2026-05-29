const DEFAULT_ALLOWED_EMAIL_DOMAIN = "@galapos.com.br";

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
