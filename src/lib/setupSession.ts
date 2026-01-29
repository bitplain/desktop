export type AdminDbSession = {
  host: string;
  port: string;
  user: string;
  password: string;
  ssl: boolean;
};

const STORAGE_KEY = "setup.adminDb";

function hasSessionStorage() {
  return typeof sessionStorage !== "undefined";
}

export function saveAdminDb(value: AdminDbSession) {
  if (!hasSessionStorage()) {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function loadAdminDb() {
  if (!hasSessionStorage()) {
    return null;
  }
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as AdminDbSession;
    if (!parsed.host || !parsed.port || !parsed.user) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearAdminDb() {
  if (!hasSessionStorage()) {
    return;
  }
  sessionStorage.removeItem(STORAGE_KEY);
}
