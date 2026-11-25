import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { dispatch, type HttpRequest, type HttpResult } from "./http";
import { createSmtpMailer, type Mailer } from "./mail";
import { MarketplaceService, type MarketplaceSnapshot, type ServiceOptions } from "./service";

export interface StateStore {
  readonly kind: "memory" | "file" | "postgres";
  load(): Promise<MarketplaceSnapshot | null>;
  save(snapshot: MarketplaceSnapshot): Promise<void>;
  close?(): Promise<void>;
}

export class StoreConflictError extends Error {
  constructor() {
    super("Stored marketplace state was changed by another process. Run a single app instance against this database and restart it.");
  }
}

export class MemoryStateStore implements StateStore {
  readonly kind = "memory" as const;
  private json: string | null = null;

  async load() {
    return this.json ? (JSON.parse(this.json) as MarketplaceSnapshot) : null;
  }

  async save(snapshot: MarketplaceSnapshot) {
    this.json = JSON.stringify(snapshot);
  }
}

export class FileStateStore implements StateStore {
  readonly kind = "file" as const;
  readonly path: string;

  constructor(path: string) {
    this.path = resolve(path);
  }

  async load() {
    try {
      return JSON.parse(await readFile(this.path, "utf8")) as MarketplaceSnapshot;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async save(snapshot: MarketplaceSnapshot) {
    const json = JSON.stringify(snapshot);
    await mkdir(dirname(this.path), { recursive: true });
    const temp = `${this.path}.${process.pid}.tmp`;
    await writeFile(temp, json, { encoding: "utf8", mode: 0o600 });
    await rename(temp, this.path);
  }
}

/** Matches both `pg.Pool` and PGlite. */
export interface SqlClient {
  query<Row = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: Row[] }>;
}

export class PostgresStateStore implements StateStore {
  readonly kind = "postgres" as const;
  private revision = 0;
  private ready: Promise<void> | null = null;

  constructor(
    private readonly client: SqlClient,
    private readonly onClose?: () => Promise<void>,
    private readonly key = "main",
  ) {}

  private ensureTable() {
    this.ready ??= this.client
      .query(
        `CREATE TABLE IF NOT EXISTS marketplace_state (
          id TEXT PRIMARY KEY,
          revision INTEGER NOT NULL,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`,
      )
      .then(() => undefined);
    return this.ready;
  }

  async load() {
    await this.ensureTable();
    const { rows } = await this.client.query<{ revision: number; data: MarketplaceSnapshot | string }>(
      "SELECT revision, data FROM marketplace_state WHERE id = $1",
      [this.key],
    );
    const row = rows[0];
    if (!row) return null;
    this.revision = Number(row.revision);
    return typeof row.data === "string" ? (JSON.parse(row.data) as MarketplaceSnapshot) : row.data;
  }

  async save(snapshot: MarketplaceSnapshot) {
    await this.ensureTable();
    const json = JSON.stringify(snapshot);
    const next = this.revision + 1;
    const { rows } =
      this.revision === 0
        ? await this.client.query<{ revision: number }>(
            "INSERT INTO marketplace_state (id, revision, data) VALUES ($1, $2, $3::jsonb) ON CONFLICT (id) DO NOTHING RETURNING revision",
            [this.key, next, json],
          )
        : await this.client.query<{ revision: number }>(
            "UPDATE marketplace_state SET revision = $2, data = $3::jsonb, updated_at = now() WHERE id = $1 AND revision = $4 RETURNING revision",
            [this.key, next, json, this.revision],
          );
    if (!rows.length) throw new StoreConflictError();
    this.revision = next;
  }

  async close() {
    await this.onClose?.();
  }
}

/** Reads that change state: revealing a delivery marks units as revealed so they are never restocked. */
const MUTATING_READS = [/^\/orders\/[^/]+\/delivery$/];

export function changesState(method: string, path: string, status: number) {
  if (status >= 400) return false;
  if (method !== "GET" && method !== "HEAD") return true;
  return MUTATING_READS.some((pattern) => pattern.test(path));
}

export async function handleRequest(runtime: MarketplaceRuntime, request: HttpRequest): Promise<HttpResult> {
  const result = await dispatch(request, runtime.service);
  if (!changesState(request.method, request.path, result.status)) return result;
  try {
    await runtime.persist();
  } catch (error) {
    console.error(JSON.stringify({ time: new Date().toISOString(), event: "persist_failed", store: runtime.store.kind, message: (error as Error).message }));
    return { status: 503, body: { error: { code: "STORAGE_UNAVAILABLE", message: "The change could not be saved. Try again shortly." } } };
  }
  return result;
}

export interface RuntimeEnv {
  [key: string]: string | undefined;
}

export interface MarketplaceRuntime {
  service: MarketplaceService;
  store: StateStore;
  /** Writes the current state. Calls are serialized so every write captures all earlier changes. */
  persist(): Promise<void>;
}

const INSECURE_DEFAULTS = new Set(["", "replace-with-a-long-random-string", "demo-only-inventory-key", "demo-only-session-secret-change-me", "demo-webhook-secret"]);

export function serviceOptionsFromEnv(env: RuntimeEnv): ServiceOptions {
  return {
    customerFeeBps: Number(env.CUSTOMER_FEE_BPS ?? 300),
    commissionBps: Number(env.COMMISSION_BPS ?? 1000),
    demoMode: env.DEMO_MODE !== "false",
    telecomEnabled: env.FEATURE_TELECOM === "true",
    cardsEnabled: env.FEATURE_CARDS === "true",
    encryptionKey: env.INVENTORY_ENC_KEY || "demo-only-inventory-key",
    webhookSecret: env.WEBHOOK_SECRET || "demo-webhook-secret",
    publicUrl: env.PUBLIC_URL || env.WEB_ORIGIN || "http://localhost:3000",
    alertEmail: env.ORDER_ALERT_EMAIL || undefined,
  };
}

export async function createMailer(env: RuntimeEnv): Promise<Mailer | null> {
  if (!env.SMTP_URL) return null;
  if (!env.MAIL_FROM) throw new Error("MAIL_FROM is required when SMTP_URL is set.");
  return createSmtpMailer(env.SMTP_URL, env.MAIL_FROM);
}

/** Returns the problems that make this environment unsafe to serve real customers. */
export function productionConfigErrors(env: RuntimeEnv) {
  const errors: string[] = [];
  if (env.DEMO_MODE !== "false") errors.push("DEMO_MODE must be \"false\".");
  for (const name of ["SESSION_SECRET", "INVENTORY_ENC_KEY", "WEBHOOK_SECRET"]) {
    const value = env[name] ?? "";
    if (INSECURE_DEFAULTS.has(value) || value.length < 32) errors.push(`${name} must be a random value of at least 32 characters.`);
  }
  if (!env.SMTP_URL || !env.MAIL_FROM) errors.push("SMTP_URL and MAIL_FROM are required: sign-in codes, verification and reset links are sent by email.");
  if (!env.PUBLIC_URL?.startsWith("https://")) errors.push("PUBLIC_URL must be the https:// address customers use; emailed links point there.");
  if (resolvePersistence(env) === "memory") errors.push("PERSISTENCE must be \"postgres\" or \"file\" so data survives restarts.");
  if (resolvePersistence(env) === "postgres" && !env.DATABASE_URL) errors.push("DATABASE_URL is required when PERSISTENCE=postgres.");
  return errors;
}

export function resolvePersistence(env: RuntimeEnv): StateStore["kind"] {
  const value = (env.PERSISTENCE ?? "").toLowerCase();
  if (value === "postgres" || value === "prisma") return "postgres";
  if (value === "memory") return "memory";
  if (value === "file") return "file";
  return env.DATABASE_URL && env.NODE_ENV === "production" ? "postgres" : "file";
}

export async function createStore(env: RuntimeEnv): Promise<StateStore> {
  const kind = resolvePersistence(env);
  if (kind === "memory") return new MemoryStateStore();
  if (kind === "file") return new FileStateStore(env.STATE_FILE || ".data/marketplace-state.json");
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required when PERSISTENCE=postgres.");
  const { default: pg } = await import("pg");
  const url = new URL(env.DATABASE_URL);
  url.searchParams.delete("schema");
  const pool = new pg.Pool({ connectionString: url.toString(), max: 4 });
  return new PostgresStateStore(pool, () => pool.end());
}

export async function openMarketplace(env: RuntimeEnv, log: (event: string, fields?: Record<string, unknown>) => void = () => undefined): Promise<MarketplaceRuntime> {
  if (env.NODE_ENV === "production") {
    const errors = productionConfigErrors(env);
    if (errors.length && env.ALLOW_INSECURE_DEMO !== "true") {
      throw new Error(`Refusing to start in production:\n- ${errors.join("\n- ")}\nSet ALLOW_INSECURE_DEMO=true only for a public demo with no real customers.`);
    }
  }
  const store = await createStore(env);
  const options: ServiceOptions = { ...serviceOptionsFromEnv(env), mailer: await createMailer(env), storage: store.kind };
  log("mail", { delivery: options.mailer ? "smtp" : options.demoMode ? "inline_demo" : "disabled" });
  const snapshot = await store.load();
  let service: MarketplaceService;
  if (snapshot) {
    service = MarketplaceService.restore(options, snapshot);
    log("state_loaded", { store: store.kind, savedAt: snapshot.savedAt });
  } else if (env.SEED_DEMO !== "false" && options.demoMode) {
    service = await MarketplaceService.createDemo(options);
    await store.save(service.exportState());
    log("state_seeded", { store: store.kind, seed: "demo" });
  } else {
    const email = env.BOOTSTRAP_ADMIN_EMAIL;
    const password = env.BOOTSTRAP_ADMIN_PASSWORD;
    if (!email || !password || password.length < 12) {
      throw new Error("Empty database: set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (12+ characters) to create the first administrator.");
    }
    service = await MarketplaceService.createEmpty(options, { email, password, name: env.BOOTSTRAP_ADMIN_NAME || "Administrator" });
    await store.save(service.exportState());
    log("state_seeded", { store: store.kind, seed: "bootstrap_admin" });
  }

  let queue: Promise<void> = Promise.resolve();
  const persist = () => {
    const run = queue.then(() => store.save(service.exportState()));
    queue = run.catch(() => undefined);
    return run;
  };
  return { service, store, persist };
}
