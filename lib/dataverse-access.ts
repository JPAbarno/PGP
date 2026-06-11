export type ManagedUserRole = "admin" | "galapos" | "partner";
export type ManagedUserStatus = "active" | "inactive";

export type ManagedUser = {
  email: string;
  role: ManagedUserRole;
  status: ManagedUserStatus;
  partnerName: string | null;
  notes: string | null;
};

export type DataverseAccessErrorCode =
  | "configuration"
  | "authentication"
  | "query_failed"
  | "invalid_record";

export class DataverseAccessError extends Error {
  code: DataverseAccessErrorCode;

  constructor(code: DataverseAccessErrorCode, message: string) {
    super(message);
    this.name = "DataverseAccessError";
    this.code = code;
  }
}

type DataverseAccessConfig = {
  dataverseUrl: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  tableName: string;
  emailColumn: string;
  roleColumn: string;
  statusColumn: string;
  partnerColumn: string;
  notesColumn: string;
  roleAdmin: string;
  roleGalapos: string;
  rolePartner: string;
  statusActive: string;
  statusInactive: string;
};

type DataverseTokenResponse = {
  access_token?: string;
  error?: string;
};

type DataverseQueryResponse = {
  value?: Record<string, unknown>[];
  error?: {
    code?: string;
    message?: string;
  };
};

const DEFAULT_DATAVERSE_EMAIL_COLUMN = "cr683_email";
const DEFAULT_DATAVERSE_ROLE_COLUMN = "cr683_funcao";
const DEFAULT_DATAVERSE_STATUS_COLUMN = "cr683_statuspgp";
const DEFAULT_DATAVERSE_PARTNER_COLUMN = "cr683_parceiro";
const DEFAULT_DATAVERSE_NOTES_COLUMN = "cr683_observacoes";
const DEFAULT_DATAVERSE_ROLE_ADMIN = "608880000";
const DEFAULT_DATAVERSE_ROLE_GALAPOS = "608880001";
const DEFAULT_DATAVERSE_ROLE_PARTNER = "608880002";
const DEFAULT_DATAVERSE_STATUS_ACTIVE = "608880000";
const DEFAULT_DATAVERSE_STATUS_INACTIVE = "608880001";

function readRequiredEnv(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name]?.trim();

  if (!value) {
    throw new DataverseAccessError(
      "configuration",
      `Variavel de ambiente obrigatoria ${name} nao configurada.`
    );
  }

  return value;
}

function readEnvOrDefault(env: NodeJS.ProcessEnv, name: string, defaultValue: string) {
  return env[name]?.trim() || defaultValue;
}

function normalizeDataverseUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new DataverseAccessError(
      "configuration",
      "DATAVERSE_URL deve ser uma URL valida do ambiente Dataverse."
    );
  }

  if (url.protocol !== "https:") {
    throw new DataverseAccessError(
      "configuration",
      "DATAVERSE_URL deve usar HTTPS."
    );
  }

  return url.toString().replace(/\/+$/, "");
}

function assertDataverseIdentifier(name: string, value: string) {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) return;

  throw new DataverseAccessError(
    "configuration",
    `${name} contem um identificador Dataverse invalido.`
  );
}

function readDataverseAccessConfig(env: NodeJS.ProcessEnv = process.env): DataverseAccessConfig {
  const config: DataverseAccessConfig = {
    dataverseUrl: normalizeDataverseUrl(readRequiredEnv(env, "DATAVERSE_URL")),
    tenantId: readRequiredEnv(env, "DATAVERSE_TENANT_ID"),
    clientId: readRequiredEnv(env, "DATAVERSE_CLIENT_ID"),
    clientSecret: readRequiredEnv(env, "DATAVERSE_CLIENT_SECRET"),
    tableName: readRequiredEnv(env, "DATAVERSE_TABLE_NAME"),
    emailColumn: readEnvOrDefault(env, "DATAVERSE_EMAIL_COLUMN", DEFAULT_DATAVERSE_EMAIL_COLUMN),
    roleColumn: readEnvOrDefault(env, "DATAVERSE_ROLE_COLUMN", DEFAULT_DATAVERSE_ROLE_COLUMN),
    statusColumn: readEnvOrDefault(env, "DATAVERSE_STATUS_COLUMN", DEFAULT_DATAVERSE_STATUS_COLUMN),
    partnerColumn: readEnvOrDefault(env, "DATAVERSE_PARTNER_COLUMN", DEFAULT_DATAVERSE_PARTNER_COLUMN),
    notesColumn: readEnvOrDefault(env, "DATAVERSE_NOTES_COLUMN", DEFAULT_DATAVERSE_NOTES_COLUMN),
    roleAdmin: readEnvOrDefault(env, "DATAVERSE_ROLE_ADMIN", DEFAULT_DATAVERSE_ROLE_ADMIN),
    roleGalapos: readEnvOrDefault(env, "DATAVERSE_ROLE_GALAPOS", DEFAULT_DATAVERSE_ROLE_GALAPOS),
    rolePartner: readEnvOrDefault(env, "DATAVERSE_ROLE_PARTNER", DEFAULT_DATAVERSE_ROLE_PARTNER),
    statusActive: readEnvOrDefault(env, "DATAVERSE_STATUS_ACTIVE", DEFAULT_DATAVERSE_STATUS_ACTIVE),
    statusInactive: readEnvOrDefault(env, "DATAVERSE_STATUS_INACTIVE", DEFAULT_DATAVERSE_STATUS_INACTIVE),
  };

  assertDataverseIdentifier("DATAVERSE_TABLE_NAME", config.tableName);
  assertDataverseIdentifier("DATAVERSE_EMAIL_COLUMN", config.emailColumn);
  assertDataverseIdentifier("DATAVERSE_ROLE_COLUMN", config.roleColumn);
  assertDataverseIdentifier("DATAVERSE_STATUS_COLUMN", config.statusColumn);
  assertDataverseIdentifier("DATAVERSE_PARTNER_COLUMN", config.partnerColumn);
  assertDataverseIdentifier("DATAVERSE_NOTES_COLUMN", config.notesColumn);

  return config;
}

function getHttpErrorMessage(serviceName: string, response: Response, errorCode?: string) {
  const statusDetails: Record<number, string> = {
    401: "credenciais recusadas ou token invalido",
    403: "permissao insuficiente para a operacao",
    500: "erro interno no servico remoto",
  };
  const statusText = statusDetails[response.status] ?? "erro retornado pelo servico remoto";
  const codeSuffix = errorCode ? ` Codigo: ${errorCode}.` : "";

  return `${serviceName} retornou HTTP ${response.status}: ${statusText}.${codeSuffix}`;
}

async function getDataverseAccessToken(config: DataverseAccessConfig) {
  const tokenUrl = new URL(
    "oauth2/v2.0/token",
    `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/`
  );
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
    scope: `${config.dataverseUrl}/.default`,
  });

  let response: Response;

  try {
    response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch {
    throw new DataverseAccessError(
      "authentication",
      "Falha de rede ao autenticar no Microsoft Entra ID para acessar o Dataverse."
    );
  }

  const payload = (await response.json().catch(() => ({}))) as DataverseTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new DataverseAccessError(
      "authentication",
      getHttpErrorMessage("Microsoft Entra ID", response, payload.error)
    );
  }

  return payload.access_token;
}

function escapeODataStringLiteral(value: string) {
  return value.replace(/'/g, "''");
}

function buildUserByEmailUrl(config: DataverseAccessConfig, email: string) {
  const url = new URL(`/api/data/v9.2/${config.tableName}`, config.dataverseUrl);

  url.searchParams.set(
    "$select",
    [
      config.emailColumn,
      config.roleColumn,
      config.statusColumn,
      config.partnerColumn,
      config.notesColumn,
    ].join(",")
  );
  url.searchParams.set("$filter", `${config.emailColumn} eq '${escapeODataStringLiteral(email)}'`);
  url.searchParams.set("$top", "2");

  return url;
}

async function fetchDataverseUserByEmail(
  config: DataverseAccessConfig,
  accessToken: string,
  email: string
) {
  let response: Response;

  try {
    response = await fetch(buildUserByEmailUrl(config, email), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: "odata.maxpagesize=2",
      },
    });
  } catch {
    throw new DataverseAccessError(
      "query_failed",
      "Falha de rede ao consultar usuario no Dataverse."
    );
  }

  const payload = (await response.json().catch(() => ({}))) as DataverseQueryResponse;

  if (!response.ok) {
    throw new DataverseAccessError(
      "query_failed",
      getHttpErrorMessage("Dataverse Web API", response, payload.error?.code)
    );
  }

  return payload.value ?? [];
}

function normalizeNullableString(value: unknown) {
  if (value === null || value === undefined) return null;

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizeOptionSetValue(value: unknown) {
  const normalized = normalizeNullableString(value);

  return normalized;
}

function mapDataverseRole(value: unknown, config: DataverseAccessConfig): ManagedUserRole {
  const roleValue = normalizeOptionSetValue(value);

  if (roleValue === config.roleAdmin) return "admin";
  if (roleValue === config.roleGalapos) return "galapos";
  if (roleValue === config.rolePartner) return "partner";

  throw new DataverseAccessError(
    "invalid_record",
    `Funcao Dataverse desconhecida em ${config.roleColumn}. Atualize DATAVERSE_ROLE_* ou corrija o registro.`
  );
}

function mapDataverseStatus(value: unknown, config: DataverseAccessConfig): ManagedUserStatus {
  const statusValue = normalizeOptionSetValue(value);

  if (statusValue === config.statusActive) return "active";
  if (statusValue === config.statusInactive) return "inactive";

  throw new DataverseAccessError(
    "invalid_record",
    `Status Dataverse desconhecido em ${config.statusColumn}. Atualize DATAVERSE_STATUS_* ou corrija o registro.`
  );
}

function normalizeManagedUser(
  row: Record<string, unknown>,
  config: DataverseAccessConfig
): ManagedUser {
  const email = normalizeNullableString(row[config.emailColumn])?.toLowerCase();
  const role = mapDataverseRole(row[config.roleColumn], config);
  const status = mapDataverseStatus(row[config.statusColumn], config);
  const partnerName = normalizeNullableString(row[config.partnerColumn]);
  const notes = normalizeNullableString(row[config.notesColumn]);

  if (!email) {
    throw new DataverseAccessError(
      "invalid_record",
      `Registro Dataverse sem email valido em ${config.emailColumn}.`
    );
  }

  if (role === "partner" && !partnerName) {
    throw new DataverseAccessError(
      "invalid_record",
      "Usuario Parceiro no Dataverse esta sem parceiro associado."
    );
  }

  return {
    email,
    role,
    status,
    partnerName,
    notes,
  };
}

export async function getManagedUserByEmail(
  email: string | null | undefined
): Promise<ManagedUser | null> {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();

  if (!normalizedEmail) return null;

  const config = readDataverseAccessConfig();
  const accessToken = await getDataverseAccessToken(config);
  const rows = await fetchDataverseUserByEmail(config, accessToken, normalizedEmail);

  if (rows.length === 0) return null;

  if (rows.length > 1) {
    throw new DataverseAccessError(
      "invalid_record",
      "Mais de um usuario Dataverse encontrado para o mesmo email."
    );
  }

  return normalizeManagedUser(rows[0], config);
}
