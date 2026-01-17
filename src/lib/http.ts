export async function getJson(url: string) {
  try {
    const response = await fetch(url, { method: "GET" });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: {},
      error: "Network error. Check your connection.",
    };
  }
}

export async function postJson(url: string, body?: unknown) {
  const headers: Record<string, string> = {};
  const init: RequestInit = { method: "POST", headers };

  if (typeof document !== "undefined") {
    const token = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("csrf-token="))
      ?.split("=")[1];
    if (token) {
      headers["x-csrf-token"] = decodeURIComponent(token);
    }
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, init);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: {},
      error: "Network error. Check your connection.",
    };
  }
}
