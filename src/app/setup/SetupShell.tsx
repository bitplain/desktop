"use client";

import type { ReactNode } from "react";

type SetupShellProps = {
  title: string;
  subtitle?: string;
  steps?: string[];
  activeStep?: number;
  children: ReactNode;
};

export function SetupShell({
  title,
  subtitle,
  steps,
  activeStep = 0,
  children,
}: SetupShellProps) {
  return (
    <main className="auth-shell">
      <div className="auth-card setup-card">
        <div className="auth-hero">
          <div className="auth-brand">
            <span
              className="auth-brand-icon"
              style={{ backgroundImage: "url(/icons/xp/window.png)" }}
              aria-hidden
            />
            <div>
              <div className="auth-brand-title">Desktop</div>
              <div className="auth-brand-subtitle">Первый запуск системы</div>
            </div>
          </div>
          <div className="auth-greeting">
            <div className="auth-greeting-title">{title}</div>
            {subtitle ? <div className="auth-hint">{subtitle}</div> : null}
          </div>
          {steps ? (
            <div className="setup-steps">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className={`setup-step${index === activeStep ? " is-active" : ""}`}
                >
                  {index + 1}. {step}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="auth-form">
          <div className="auth-form-body">{children}</div>
        </div>
      </div>
    </main>
  );
}
