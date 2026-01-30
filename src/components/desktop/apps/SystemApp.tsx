"use client";

import { useEffect, useMemo, useState } from "react";
import { XpWindow } from "@/components/desktop/apps/shared/XpWindow";
import { EcoButton, EcoForm, EcoInput, EcoNotice, EcoPanel } from "@/components/ui/eco";

type ConnectionPayload = {
  provider: "SMB";
  host: string;
  share: string;
  subPath: string;
  username: string;
  hasPassword: boolean;
};

type ConnectionResponse =
  | { connected: false }
  | { connected: true; connection: ConnectionPayload };

type FormState = {
  host: string;
  share: string;
  subPath: string;
  username: string;
  password: string;
};

const EMPTY_FORM: FormState = {
  host: "",
  share: "",
  subPath: "",
  username: "",
  password: "",
};

export default function SystemApp({ title }: { title: string }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [connected, setConnected] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(form.host && form.share && form.username && !saving),
    [form.host, form.share, form.username, saving]
  );

  const loadConnection = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/storage/connection");
      const data = (await res.json()) as ConnectionResponse;
      if (!res.ok) {
        throw new Error("Не удалось загрузить настройки.");
      }
      if (data.connected) {
        setConnected(true);
        setHasPassword(Boolean(data.connection.hasPassword));
        setForm((prev) => ({
          ...prev,
          host: data.connection.host,
          share: data.connection.share,
          subPath: data.connection.subPath,
          username: data.connection.username,
          password: "",
        }));
      } else {
        setConnected(false);
        setHasPassword(false);
      }
    } catch (error) {
      setConnected(false);
      setNotice(error instanceof Error ? error.message : "Ошибка загрузки.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConnection();
  }, []);

  const updateField =
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/storage/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: form.host,
          share: form.share,
          subPath: form.subPath,
          username: form.username,
          password: form.password,
        }),
      });
      const data = (await res.json()) as ConnectionResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Не удалось сохранить подключение.");
      }
      if (data.connected) {
        setConnected(true);
        setHasPassword(Boolean(data.connection.hasPassword));
        setForm((prev) => ({ ...prev, password: "" }));
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ошибка сохранения.");
    } finally {
      setSaving(false);
    }
  };

  const onDisconnect = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/storage/connection", { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Не удалось отключить шару.");
      }
      setConnected(false);
      setHasPassword(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ошибка отключения.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <XpWindow title={title}>
      <div className="stack">
        <EcoPanel>
          <div className="storage-panel-header">
            <div className="panel-title">Файловая шара</div>
            <span
              className={`storage-status-dot ${connected ? "is-online" : "is-offline"}`}
              aria-hidden
            />
          </div>
          <EcoForm className="storage-form" onSubmit={onSubmit}>
            <label className="setup-field">
              <span>IP / Host</span>
              <EcoInput
                value={form.host}
                onChange={updateField("host")}
                placeholder="192.168.1.10"
                disabled={loading || saving}
                required
              />
            </label>
            <label className="setup-field">
              <span>Имя шары (SMB)</span>
              <EcoInput
                value={form.share}
                onChange={updateField("share")}
                placeholder="media"
                disabled={loading || saving}
                required
              />
            </label>
            <label className="setup-field">
              <span>Подкаталог</span>
              <EcoInput
                value={form.subPath}
                onChange={updateField("subPath")}
                placeholder="media/videos"
                disabled={loading || saving}
              />
            </label>
            <label className="setup-field">
              <span>Логин</span>
              <EcoInput
                value={form.username}
                onChange={updateField("username")}
                placeholder="user"
                disabled={loading || saving}
                required
              />
            </label>
            <label className="setup-field">
              <span>Пароль</span>
              <EcoInput
                type="password"
                value={form.password}
                onChange={updateField("password")}
                placeholder={hasPassword ? "Сохранён" : ""}
                disabled={loading || saving}
              />
            </label>
            {notice ? <EcoNotice>{notice}</EcoNotice> : null}
            <div className="button-row">
              <EcoButton type="submit" disabled={!canSubmit}>
                Сохранить
              </EcoButton>
              <EcoButton
                type="button"
                variant="secondary"
                onClick={onDisconnect}
                disabled={saving || loading}
              >
                Отключить
              </EcoButton>
            </div>
          </EcoForm>
        </EcoPanel>
      </div>
    </XpWindow>
  );
}
