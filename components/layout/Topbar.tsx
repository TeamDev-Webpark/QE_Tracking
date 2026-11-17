"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftIcon, AuditIcon, ChevronRightIcon } from "@/components/icons";
import { Badge } from "@/components/ui";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import type { UpcomingAuditNotice } from "@/lib/audits/queries";
import { departmentName } from "@/lib/format";
import { UserMenu } from "./UserMenu";

export function Topbar({
  onMenuClick,
  upcomingAudits = [],
}: {
  onMenuClick: () => void;
  isSidebarCollapsed?: boolean;
  upcomingAudits?: UpcomingAuditNotice[];
}) {
  const { lang } = useI18n();
  const user = useSessionUser();
  const dept = departmentName(user.departmentId, lang);
  const router = useRouter();
  const pathname = usePathname();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const noticeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!noticeOpen) return;
    function handleOutside(e: MouseEvent) {
      if (noticeRef.current && !noticeRef.current.contains(e.target as Node)) {
        setNoticeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [noticeOpen]);

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

      <div className="ml-auto flex items-center gap-2.5 sm:gap-3.5">
        {upcomingAudits.length > 0 && (
          <div ref={noticeRef} className="relative">
            <button
              type="button"
              onClick={() => setNoticeOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
              title="แจ้งเตือนกำหนดการเข้าตรวจติดตามภายใน"
            >
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <AuditIcon width={14} height={14} />
              <span className="hidden sm:inline">นัดตรวจภายใน</span>
              <span className="rounded-full bg-amber-200/80 px-1.5 py-0.2 text-[11px] font-extrabold text-amber-950">
                {upcomingAudits.length}
              </span>
            </button>

            {noticeOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-surface p-3.5 shadow-xl z-50">
                <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                  <div>
                    <p className="text-xs font-bold text-text">แจ้งเตือนหัวข้อการตรวจติดตามภายใน</p>
                    <p className="text-[11px] text-text-muted">
                      แจ้งเฉพาะเรื่องที่จะตรวจ (ไม่ระบุวันและเวลาเข้าตรวจ)
                    </p>
                  </div>
                  <Badge tone="warning">{upcomingAudits.length} รายการ</Badge>
                </div>

                <div className="max-h-72 space-y-2.5 overflow-y-auto">
                  {upcomingAudits.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-border/80 bg-page p-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-primary">
                          {a.code} · {a.standardLabel}
                        </span>
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                          ไม่ระบุวัน-เวลาเข้าตรวจ
                        </span>
                      </div>
                      <p className="font-bold text-text">{a.title}</p>
                      {a.scope && (
                        <p className="rounded border border-amber-200/80 bg-amber-50/70 px-2 py-1 text-[11px] text-amber-950">
                          <strong className="font-semibold">เรื่องที่ตรวจ:</strong> {a.scope}
                        </p>
                      )}
                      <p className="text-[11px] text-text-muted">
                        แผนกที่รับการตรวจ: <strong className="text-text">{departmentName(a.departmentId, lang)}</strong>
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 border-t border-border/60 pt-2 text-right">
                  <Link
                    href="/audits"
                    onClick={() => setNoticeOpen(false)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    ดูตารางนัดตรวจทั้งหมด →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="hidden items-center gap-1.5 rounded-full border border-border/80 bg-page px-3 py-1 text-xs font-semibold text-text md:flex">
          <span>🏢</span>
          <span>{dept}</span>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
