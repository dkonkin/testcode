import type { RecreationBase } from "../types";

const prefix = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function apiPath(path: string): string {
  if (path.startsWith("http")) return path;
  return `${prefix}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchBases(): Promise<RecreationBase[]> {
  const r = await fetch(apiPath("/api/bases"), { cache: "no-store" });
  if (!r.ok) throw new Error("Не удалось загрузить базы");
  return r.json();
}

export async function loginRequest(
  username: string,
  password: string
): Promise<{ access_token: string; username: string; role: string }> {
  const r = await fetch(apiPath("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as { error?: string }).error || "Ошибка входа");
  return data as { access_token: string; username: string; role: string };
}

export async function createBase(
  token: string,
  body: Record<string, unknown>
): Promise<RecreationBase> {
  const r = await fetch(apiPath("/api/bases"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error((data as { error?: string }).error || "Ошибка сохранения");
  }
  return data as RecreationBase;
}
