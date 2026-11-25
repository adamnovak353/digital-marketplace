export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path.startsWith("http") ? path : `/api/v1${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    credentials: "include",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body?.error?.message === "string" ? body.error.message : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}
