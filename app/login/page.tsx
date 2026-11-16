import type { Metadata } from "next";
import { Suspense } from "react";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { LoginForm } from "@/components/pages/LoginForm";
import { getLang } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md rounded-card bg-surface p-6 shadow-card sm:p-10">
        <Suspense fallback={<div className="h-[480px]" />}>
          <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}

async function LoginContent() {
  const lang = await getLang();
  return (
    <I18nProvider lang={lang}>
      <LoginForm />
    </I18nProvider>
  );
}
