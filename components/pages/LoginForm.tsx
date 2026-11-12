"use client";

import { useActionState, useRef } from "react";
import { login, type LoginState } from "@/lib/auth/actions";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button } from "@/components/ui";
import { getDemoAccounts, getUserById } from "@/data";

// Demo only: credentials are shown on screen to make testing easy.
const DEMO_ACCOUNTS = getDemoAccounts().map((a) => ({
  ...a,
  role: getUserById(a.userId)?.role ?? "employee",
}));

const inputClass =
  "h-12 w-full rounded-control border border-border bg-page px-4 text-sm outline-none focus:border-primary";

export function LoginForm() {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  const fill = (username: string, password: string) => {
    if (userRef.current) userRef.current.value = username;
    if (passRef.current) passRef.current.value = password;
  };

  return (
    <>
      <div className="mb-8 text-center">
        <p className="mb-4 text-2xl font-extrabold tracking-tight">
          <span className="text-primary">QE</span>Tracking
        </p>
        <h1 className="text-2xl font-bold">{t.login.title}</h1>
        <p className="mt-2 text-sm text-text-muted">{t.login.subtitle}</p>
      </div>

      <form action={formAction} className="space-y-5" noValidate>
        <div>
          <label htmlFor="username" className="mb-2 block text-sm font-semibold">
            {t.login.username}
          </label>
          <input
            ref={userRef}
            id="username"
            name="username"
            autoComplete="username"
            defaultValue={state.username}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold">
            {t.login.password}
          </label>
          <input
            ref={passRef}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={inputClass}
          />
        </div>

        {state.error && (
          <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {t.login[state.error]}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t.login.submitting : t.login.submit}
        </Button>
      </form>

      <div className="mt-8 border-t border-border/60 pt-5">
        <p className="mb-3 text-center text-xs font-semibold text-text-muted">{t.login.demoAccounts}</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.username}
              type="button"
              onClick={() => fill(a.username, a.password)}
              className="rounded-control border border-border px-3 py-2.5 text-left text-xs transition-colors cursor-pointer hover:border-primary hover:bg-primary-soft"
            >
              <span className="block font-bold text-text">{t.roles[a.role]}</span>
              <span className="mt-0.5 block truncate font-mono text-[11px] text-text-muted">
                {a.username} / {a.password}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
