import { beforeEach, describe, expect, it } from "vitest";
import { clearAdminDb, loadAdminDb, saveAdminDb } from "../setupSession";

describe("setup session", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    // @ts-expect-error - test shim
    globalThis.sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
  });

  it("stores and loads admin db credentials", () => {
    saveAdminDb({
      host: "localhost",
      port: "5432",
      user: "postgres",
      password: "secret",
      ssl: true,
    });
    expect(loadAdminDb()).toEqual({
      host: "localhost",
      port: "5432",
      user: "postgres",
      password: "secret",
      ssl: true,
    });
  });

  it("clears admin db credentials", () => {
    saveAdminDb({
      host: "h",
      port: "5432",
      user: "u",
      password: "p",
      ssl: false,
    });
    clearAdminDb();
    expect(loadAdminDb()).toBeNull();
  });
});
