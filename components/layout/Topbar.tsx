"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftIcon, ChevronRightIcon } from "@/components/icons";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { departmentName } from "@/lib/format";
import { UserMenu } from "./UserMenu";

export function Topbar({
  onMenuClick,
}: {
  onMenuClick: () => void;
  isSidebarCollapsed?: boolean;
}) {
  const { lang } = useI18n();
  const user = useSessionUser();
  const dept = departmentName(user.departmentId, lang);
  const router = useRouter();
  const pathname = usePathname();

  const isHome = pathname === "/";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-topbar items-center justify-between bg-surface border-b border-border/60 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        {/* On mobile: Click logo to toggle (show/hide) sidebar */}
        <button
          type="button"
          onClick={onMenuClick}
          className="group flex items-center gap-2 font-extrabold tracking-tight transition-all active:scale-95 cursor-pointer lg:hidden p-1 rounded-xl hover:bg-page"
          title="คลิกเพื่อแสดงแถบเมนู (Show Sidebar)"
          aria-label="แสดงแถบเมนู"
        >
          <BrandLogo size="sm" />
          <ChevronRightIcon width={14} height={14} className="text-text-muted group-hover:text-primary transition-colors" />
        </button>

        {/* ปุ่มย้อนกลับไปหน้าก่อนหน้า (แสดงบนทุกหน้า ยกเว้นหน้าแรก Dashboard) */}
        {!isHome && (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-white px-3 py-1.5 text-xs font-bold text-text-muted transition-all hover:border-primary hover:bg-primary/5 hover:text-primary active:scale-95 cursor-pointer shadow-xs"
            title="ย้อนกลับไปหน้าก่อนหน้า"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>ย้อนกลับ</span>
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        <div className="hidden items-center gap-1.5 rounded-full border border-border/80 bg-page px-3 py-1 text-xs font-semibold text-text md:flex">
          <span>🏢</span>
          <span>{dept}</span>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
