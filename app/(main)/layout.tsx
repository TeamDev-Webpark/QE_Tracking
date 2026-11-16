import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ToastProvider } from "@/components/ui";
import { getDictionary } from "@/i18n/dictionaries";
import { AppShell } from "@/components/layout/AppShell";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { getLang, getSessionUser } from "@/lib/auth/session";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <SessionShell>{children}</SessionShell>
    </Suspense>
  );
}

/** Reads session + language cookies (request-time data, so inside Suspense). */
async function SessionShell({ children }: { children: React.ReactNode }) {
  const [user, lang] = await Promise.all([getSessionUser(), getLang()]);
  if (!user) redirect("/login"); // backup for proxy.ts

  return (
    <I18nProvider lang={lang}>
      <SessionProvider user={user}>
        <ToastProvider dismissLabel={getDictionary().common.dismiss}>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </SessionProvider>
    </I18nProvider>
  );
}

function ShellFallback() {
  return (
    <div className="min-h-screen lg:pl-sidebar">
      <div className="fixed inset-y-0 left-0 hidden w-sidebar bg-surface lg:block" />
      <div className="h-topbar bg-surface" />
    </div>
  );
}
