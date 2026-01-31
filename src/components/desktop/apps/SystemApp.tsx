"use client";

import { useEffect, useMemo, useState } from "react";
import { XpWindow } from "@/components/desktop/apps/shared/XpWindow";
import { EcoButton, EcoForm, EcoInput, EcoNotice, EcoPanel } from "@/components/ui/eco";

type StorageProviderId = "SMB" | "FTP";

type ConnectionPayload = {
  provider: StorageProviderId;
  host: string;
  share: string;
  subPath: string;
  username: string;
  hasPassword: boolean;
  port?: number;
};

type ConnectionsResponse = {
  activeProvider: StorageProviderId | null;
  smb: ConnectionPayload | null;
  ftp: ConnectionPayload | null;
  error?: string;
};

type SmbFormState = {
  host: string;
  share: string;
  subPath: string;
  username: string;
  password: string;
};

type FtpFormState = {
  host: string;
  port: string;
  subPath: string;
  username: string;
  password: string;
};

const EMPTY_SMB_FORM: SmbFormState = {
  host: "",
  share: "",
  subPath: "",
  username: "",
  password: "",
};

const EMPTY_FTP_FORM: FtpFormState = {
  host: "",
  port: "21",
  subPath: "",
  username: "",
  password: "",
};

export default function SystemApp({ title }: { title: string }) {
  const [smbForm, setSmbForm] = useState<SmbFormState>(EMPTY_SMB_FORM);
  const [ftpForm, setFtpForm] = useState<FtpFormState>(EMPTY_FTP_FORM);
  const [smbConnection, setSmbConnection] = useState<ConnectionPayload | null>(null);
  const [ftpConnection, setFtpConnection] = useState<ConnectionPayload | null>(null);
  const [activeProvider, setActiveProvider] = useState<StorageProviderId | null>(null);
  const [expanded, setExpanded] = useState<StorageProviderId | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<StorageProviderId | null>(null);
  const [notice, setNotice] = useState<{ smb: string | null; ftp: string | null }>({
    smb: null,
    ftp: null,
  });

  const ftpPort = Number(ftpForm.port);
  const ftpPortValid = Number.isInteger(ftpPort) && ftpPort > 0 && ftpPort <= 65535;

  const canSubmitSmb = useMemo(
    () => Boolean(smbForm.host && smbForm.share && smbForm.username && !saving),
    [smbForm.host, smbForm.share, smbForm.username, saving]
  );

  const canSubmitFtp = useMemo(
    () => Boolean(ftpForm.host && ftpForm.username && ftpPortValid && !saving),
    [ftpForm.host, ftpForm.username, ftpPortValid, saving]
  );

  const applyResponse = (data: ConnectionsResponse) => {
    setActiveProvider(data.activeProvider ?? null);
    setSmbConnection(data.smb ?? null);
    setFtpConnection(data.ftp ?? null);
    setSmbForm((prev) => ({
      ...prev,
      host: data.smb?.host ?? "",
      share: data.smb?.share ?? "",
      subPath: data.smb?.subPath ?? "",
      username: data.smb?.username ?? "",
      password: "",
    }));
    setFtpForm((prev) => ({
      ...prev,
      host: data.ftp?.host ?? "",
      port: String(data.ftp?.port ?? 21),
      subPath: data.ftp?.subPath ?? "",
      username: data.ftp?.username ?? "",
      password: "",
    }));
  };

  const loadConnection = async () => {
    setLoading(true);
    setNotice({ smb: null, ftp: null });
    try {
      const res = await fetch("/api/storage/connection");
      const data = (await res.json()) as ConnectionsResponse;
      if (!res.ok) {
        throw new Error(data.error || "Не удалось загрузить настройки.");
      }
      applyResponse(data);
    } catch (error) {
      setNotice({
        smb: error instanceof Error ? error.message : "Ошибка загрузки.",
        ftp: null,
      });
      setSmbConnection(null);
      setFtpConnection(null);
      setActiveProvider(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConnection();
  }, []);

  const updateSmbField =
    (field: keyof SmbFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSmbForm((prev) => ({ ...prev, [field]: value }));
    };

  const updateFtpField =
    (field: keyof FtpFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFtpForm((prev) => ({ ...prev, [field]: value }));
    };

  const submitProvider = async (provider: StorageProviderId) => {
    const form = provider === "SMB" ? smbForm : ftpForm;
    const canSubmit = provider === "SMB" ? canSubmitSmb : canSubmitFtp;
    if (!canSubmit) return;
    setSaving(provider);
    setNotice((prev) => ({ ...prev, [provider === "SMB" ? "smb" : "ftp"]: null }));
    try {
      const payload: Record<string, unknown> = {
        provider,
        host: form.host,
        subPath: form.subPath,
        username: form.username,
        password: form.password,
      };
      if (provider === "SMB") {
        payload.share = (form as SmbFormState).share;
      } else {
        payload.port = Number((form as FtpFormState).port || 21);
      }
      const res = await fetch("/api/storage/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ConnectionsResponse;
      if (!res.ok) {
        throw new Error(data.error || "Не удалось сохранить подключение.");
      }
      applyResponse(data);
      setExpanded(null);
    } catch (error) {
      setNotice((prev) => ({
        ...prev,
        [provider === "SMB" ? "smb" : "ftp"]:
          error instanceof Error ? error.message : "Ошибка сохранения.",
      }));
    } finally {
      setSaving(null);
    }
  };

  const disconnectProvider = async (provider: StorageProviderId) => {
    setSaving(provider);
    setNotice((prev) => ({ ...prev, [provider === "SMB" ? "smb" : "ftp"]: null }));
    try {
      const res = await fetch(`/api/storage/connection?provider=${provider}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as ConnectionsResponse;
      if (!res.ok) {
        throw new Error(data.error || "Не удалось отключить шару.");
      }
      applyResponse(data);
      setExpanded(null);
    } catch (error) {
      setNotice((prev) => ({
        ...prev,
        [provider === "SMB" ? "smb" : "ftp"]:
          error instanceof Error ? error.message : "Ошибка отключения.",
      }));
    } finally {
      setSaving(null);
    }
  };

  const smbOnline = Boolean(smbConnection?.hasPassword);
  const ftpOnline = Boolean(ftpConnection?.hasPassword);

  const toggleSection = (provider: StorageProviderId) => {
    setExpanded((prev) => (prev === provider ? null : provider));
  };

  return (
    <XpWindow title={title}>
      <div className="stack">
        <div className="storage-accordion">
          <EcoPanel className={`storage-section ${expanded === "SMB" ? "is-open" : ""}`}>
            <button
              type="button"
              className="storage-section-header"
              onClick={() => toggleSection("SMB")}
              aria-expanded={expanded === "SMB"}
            >
              <span className="storage-section-title">SMB</span>
              <span className="storage-section-meta">
                {activeProvider === "SMB" ? (
                  <span className="storage-active-badge">Активен</span>
                ) : null}
                <span
                  className={`storage-status-dot ${smbOnline ? "is-online" : "is-offline"}`}
                  aria-hidden
                />
                <span className="storage-section-chevron" aria-hidden="true" />
              </span>
            </button>
            {expanded === "SMB" ? (
              <div className="storage-section-body">
                <EcoForm className="storage-form" onSubmit={(event) => {
                  event.preventDefault();
                  submitProvider("SMB");
                }}>
                  <label className="setup-field">
                    <span>IP / Host</span>
                    <EcoInput
                      value={smbForm.host}
                      onChange={updateSmbField("host")}
                      placeholder="192.168.1.10"
                      disabled={loading || saving === "SMB"}
                      required
                    />
                  </label>
                  <label className="setup-field">
                    <span>Имя шары (SMB)</span>
                    <EcoInput
                      value={smbForm.share}
                      onChange={updateSmbField("share")}
                      placeholder="media"
                      disabled={loading || saving === "SMB"}
                      required
                    />
                  </label>
                  <label className="setup-field">
                    <span>Подкаталог</span>
                    <EcoInput
                      value={smbForm.subPath}
                      onChange={updateSmbField("subPath")}
                      placeholder="media/videos"
                      disabled={loading || saving === "SMB"}
                    />
                  </label>
                  <label className="setup-field">
                    <span>Логин</span>
                    <EcoInput
                      value={smbForm.username}
                      onChange={updateSmbField("username")}
                      placeholder="user"
                      disabled={loading || saving === "SMB"}
                      required
                    />
                  </label>
                  <label className="setup-field">
                    <span>Пароль</span>
                    <EcoInput
                      type="password"
                      value={smbForm.password}
                      onChange={updateSmbField("password")}
                      placeholder={smbConnection?.hasPassword ? "Сохранён" : ""}
                      disabled={loading || saving === "SMB"}
                    />
                  </label>
                  {notice.smb ? <EcoNotice>{notice.smb}</EcoNotice> : null}
                  <div className="button-row">
                    <EcoButton type="submit" disabled={!canSubmitSmb}>
                      Сохранить
                    </EcoButton>
                    <EcoButton
                      type="button"
                      variant="secondary"
                      onClick={() => disconnectProvider("SMB")}
                      disabled={loading || saving === "SMB"}
                    >
                      Отключить
                    </EcoButton>
                  </div>
                </EcoForm>
              </div>
            ) : null}
          </EcoPanel>

          <EcoPanel className={`storage-section ${expanded === "FTP" ? "is-open" : ""}`}>
            <button
              type="button"
              className="storage-section-header"
              onClick={() => toggleSection("FTP")}
              aria-expanded={expanded === "FTP"}
            >
              <span className="storage-section-title">FTP</span>
              <span className="storage-section-meta">
                {activeProvider === "FTP" ? (
                  <span className="storage-active-badge">Активен</span>
                ) : null}
                <span
                  className={`storage-status-dot ${ftpOnline ? "is-online" : "is-offline"}`}
                  aria-hidden
                />
                <span className="storage-section-chevron" aria-hidden="true" />
              </span>
            </button>
            {expanded === "FTP" ? (
              <div className="storage-section-body">
                <EcoForm className="storage-form" onSubmit={(event) => {
                  event.preventDefault();
                  submitProvider("FTP");
                }}>
                  <label className="setup-field">
                    <span>IP / Host</span>
                    <EcoInput
                      value={ftpForm.host}
                      onChange={updateFtpField("host")}
                      placeholder="192.168.1.10"
                      disabled={loading || saving === "FTP"}
                      required
                    />
                  </label>
                  <label className="setup-field">
                    <span>Порт</span>
                    <EcoInput
                      type="number"
                      value={ftpForm.port}
                      onChange={updateFtpField("port")}
                      placeholder="21"
                      disabled={loading || saving === "FTP"}
                      required
                    />
                  </label>
                  <label className="setup-field">
                    <span>Подкаталог</span>
                    <EcoInput
                      value={ftpForm.subPath}
                      onChange={updateFtpField("subPath")}
                      placeholder="video"
                      disabled={loading || saving === "FTP"}
                    />
                  </label>
                  <label className="setup-field">
                    <span>Логин</span>
                    <EcoInput
                      value={ftpForm.username}
                      onChange={updateFtpField("username")}
                      placeholder="user"
                      disabled={loading || saving === "FTP"}
                      required
                    />
                  </label>
                  <label className="setup-field">
                    <span>Пароль</span>
                    <EcoInput
                      type="password"
                      value={ftpForm.password}
                      onChange={updateFtpField("password")}
                      placeholder={ftpConnection?.hasPassword ? "Сохранён" : ""}
                      disabled={loading || saving === "FTP"}
                    />
                  </label>
                  {notice.ftp ? <EcoNotice>{notice.ftp}</EcoNotice> : null}
                  <div className="button-row">
                    <EcoButton type="submit" disabled={!canSubmitFtp}>
                      Сохранить
                    </EcoButton>
                    <EcoButton
                      type="button"
                      variant="secondary"
                      onClick={() => disconnectProvider("FTP")}
                      disabled={loading || saving === "FTP"}
                    >
                      Отключить
                    </EcoButton>
                  </div>
                </EcoForm>
              </div>
            ) : null}
          </EcoPanel>
        </div>
      </div>
    </XpWindow>
  );
}
