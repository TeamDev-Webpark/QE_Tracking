"use client";

import { useMemo, useState, useTransition } from "react";
import type { Role } from "@/config/access";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Field,
  Input,
  PageHeader,
  Textarea,
  useToast,
  type BadgeTone,
  type Column,
} from "@/components/ui";
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { cn } from "@/lib/cn";
import { departmentName } from "@/lib/format";
import { deleteUser, resetDemoData, saveSystemSettings } from "@/lib/settings/actions";
import type { FieldError } from "@/lib/standards/actions";
import type { SystemSettings, User } from "@/lib/types";
import { UserFormModal } from "./UserFormModal";

const DEMO_USER_IDS = new Set(["u1", "u2", "u3", "u4"]);

const ROLE_TONE: Record<Role, BadgeTone> = {
  admin: "purple",
  qe: "primary",
  iso: "info",
  employee: "neutral",
};

const ROLE_LABEL: Record<Role, string> = {
  admin: "ผู้ดูแลระบบ",
  qe: "QE / QMR",
  iso: "ISO Auditor",
  employee: "พนักงาน / แผนก",
};

export function SettingsView({
  users,
  settings,
}: {
  users: User[];
  settings: SystemSettings;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const currentUser = useSessionUser();
  const [tab, setTab] = useState<"users" | "system">("users");

  // Users state
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [modalUser, setModalUser] = useState<User | null | undefined>(undefined);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // System settings state
  const [orgName, setOrgName] = useState(settings.orgName);
  const [orgShortName, setOrgShortName] = useState(settings.orgShortName);
  const [isoScope, setIsoScope] = useState(settings.isoScope);
  const [riskAcceptableMaxScore, setRiskAcceptableMaxScore] = useState(String(settings.riskAcceptableMaxScore));
  const [documentReviewCycleDays, setDocumentReviewCycleDays] = useState(String(settings.documentReviewCycleDays));
  const [ncDefaultDueDays, setNcDefaultDueDays] = useState(String(settings.ncDefaultDueDays));
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldError>>({});
  const [confirmReset, setConfirmReset] = useState(false);

  const [pending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      const text = `${u.name} ${u.nameEn} ${u.position} ${departmentName(u.departmentId, lang)}`.toLowerCase();
      return text.includes(q);
    });
  }, [users, search, roleFilter, lang]);

  function handleDeleteUser() {
    if (!deletingUser) return;
    startTransition(async () => {
      const res = await deleteUser(deletingUser.id);
      setDeletingUser(null);
      if (!res.ok) {
        toast.error(
          res.error === "protectedDemoUser"
            ? "ไม่สามารถลบบัญชีทดลองหลักหรือบัญชีที่กำลังใช้งานอยู่ได้"
            : t.errors.forbidden,
        );
        return;
      }
      toast.success("ลบผู้ใช้งานเรียบร้อยแล้ว");
    });
  }

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    startTransition(async () => {
      const res = await saveSystemSettings({
        orgName,
        orgShortName,
        isoScope,
        riskAcceptableMaxScore: Number(riskAcceptableMaxScore),
        documentReviewCycleDays: Number(documentReviewCycleDays),
        ncDefaultDueDays: Number(ncDefaultDueDays),
      });
      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        else toast.error(t.errors.forbidden);
        return;
      }
      toast.success("บันทึกการตั้งค่าระบบเรียบร้อยแล้ว");
    });
  }

  function handleResetDemo() {
    startTransition(async () => {
      const res = await resetDemoData();
      setConfirmReset(false);
      if (!res.ok) {
        toast.error(t.errors.forbidden);
        return;
      }
      toast.success("รีเซ็ตข้อมูลทดลองกลับสู่ค่าเริ่มต้นเรียบร้อยแล้ว");
    });
  }

  const userColumns: Column<User>[] = [
    {
      key: "name",
      header: "ชื่อผู้ใช้งาน",
      render: (u) => (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-text">{u.name}</span>
            {DEMO_USER_IDS.has(u.id) && <Badge tone="neutral">Demo</Badge>}
            {u.id === currentUser.id && <Badge tone="primary">คุณ</Badge>}
          </div>
          <p className="text-xs text-text-muted">{u.nameEn}</p>
        </div>
      ),
    },
    {
      key: "position",
      header: "ตำแหน่ง",
      render: (u) => <span className="text-xs text-text">{u.position}</span>,
    },
    {
      key: "department",
      header: "แผนก",
      render: (u) => <span className="text-xs text-text-muted">{departmentName(u.departmentId, lang)}</span>,
    },
    {
      key: "role",
      header: "สิทธิ์การใช้งาน",
      render: (u) => <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>,
    },
    {
      key: "active",
      header: "สถานะ",
      render: (u) => (
        <Badge tone={u.active === false ? "danger" : "success"}>
          {u.active === false ? "ระงับใช้งาน" : "ใช้งานอยู่"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-px text-right",
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setModalUser(u)}
            className="rounded-control p-2 text-text-muted hover:bg-page hover:text-primary cursor-pointer"
            aria-label={`แก้ไข ${u.name}`}
          >
            <EditIcon className="h-4 w-4" />
          </button>
          {!DEMO_USER_IDS.has(u.id) && u.id !== currentUser.id && (
            <button
              type="button"
              onClick={() => setDeletingUser(u)}
              className="rounded-control p-2 text-text-muted hover:bg-page hover:text-danger cursor-pointer"
              aria-label={`ลบ ${u.name}`}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const err = (k: string) => (fieldErrors[k] ? t.errors[fieldErrors[k]] : undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title="จัดการผู้ใช้งานและตั้งค่าระบบ"
        description="กำหนดสิทธิ์ผู้ใช้งาน ข้อมูลองค์กร และเกณฑ์มาตรฐานของระบบ ISO"
        actions={
          tab === "users" ? (
            <Button onClick={() => setModalUser(null)}>
              <PlusIcon className="h-4 w-4" /> เพิ่มผู้ใช้งาน
            </Button>
          ) : undefined
        }
      />

      {/* แถบเลือกหมวด */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("users")}
          className={cn(
            "rounded-control border px-4 py-2 text-sm font-semibold transition-colors cursor-pointer",
            tab === "users"
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface text-text-muted hover:text-text",
          )}
        >
          ผู้ใช้งานและสิทธิ์ ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("system")}
          className={cn(
            "rounded-control border px-4 py-2 text-sm font-semibold transition-colors cursor-pointer",
            tab === "system"
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface text-text-muted hover:text-text",
          )}
        >
          ตั้งค่าองค์กรและเกณฑ์ระบบ
        </button>
      </div>

      {tab === "users" ? (
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ, ตำแหน่ง หรือแผนก..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(["all", "admin", "qe", "iso", "employee"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                    roleFilter === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-text-muted hover:text-text",
                  )}
                >
                  {r === "all" ? "ทั้งหมด" : ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          <DataTable
            rows={filteredUsers}
            columns={userColumns}
            rowKey={(u) => u.id}
            emptyTitle="ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข"
            defaultPageSize={10}
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="text-base font-bold text-text">ข้อมูลองค์กรและเกณฑ์มาตรฐาน ISO</h2>
            <p className="mt-0.5 text-xs text-text-muted">ค่าที่ตั้งไว้จะนำไปแสดงในรายงานและใช้เป็นเกณฑ์อ้างอิงของระบบ</p>

            <form onSubmit={handleSaveSettings} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field htmlFor="set-org" label="ชื่อองค์กร" required error={err("orgName")}>
                  <Input
                    id="set-org"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    invalid={!!fieldErrors.orgName}
                  />
                </Field>
                <Field htmlFor="set-short" label="ชื่อย่อระบบ" required error={err("orgShortName")}>
                  <Input
                    id="set-short"
                    value={orgShortName}
                    onChange={(e) => setOrgShortName(e.target.value)}
                    invalid={!!fieldErrors.orgShortName}
                  />
                </Field>
              </div>

              <Field htmlFor="set-scope" label="ขอบเขตการรับรองระบบ ISO" required error={err("isoScope")}>
                <Textarea
                  id="set-scope"
                  rows={2}
                  value={isoScope}
                  onChange={(e) => setIsoScope(e.target.value)}
                  invalid={!!fieldErrors.isoScope}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  htmlFor="set-risk"
                  label="คะแนนความเสี่ยงที่ยอมรับได้สูงสุด"
                  hint="ค่ามาตรฐานคือ 9 (ต่ำกว่า 10 ปิดเรื่องได้)"
                >
                  <Input
                    id="set-risk"
                    type="number"
                    min={1}
                    max={24}
                    value={riskAcceptableMaxScore}
                    onChange={(e) => setRiskAcceptableMaxScore(e.target.value)}
                  />
                </Field>
                <Field htmlFor="set-doc" label="รอบทบทวนเอกสาร (วัน)" hint="ค่ามาตรฐาน 365 วัน">
                  <Input
                    id="set-doc"
                    type="number"
                    min={30}
                    max={1825}
                    value={documentReviewCycleDays}
                    onChange={(e) => setDocumentReviewCycleDays(e.target.value)}
                  />
                </Field>
                <Field htmlFor="set-nc" label="กำหนดปิด NC เริ่มต้น (วัน)" hint="ค่ามาตรฐาน 14 วัน">
                  <Input
                    id="set-nc"
                    type="number"
                    min={1}
                    max={365}
                    value={ncDefaultDueDays}
                    onChange={(e) => setNcDefaultDueDays(e.target.value)}
                  />
                </Field>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={pending}>
                  {pending ? t.common.saving : "บันทึกการตั้งค่า"}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-base font-bold text-text">รีเซ็ตข้อมูลทดลอง (Demo Reset)</h2>
              <p className="text-xs leading-relaxed text-text-muted">
                ใช้สำหรับล้างข้อมูลที่ทดลองแก้ไขทั้งหมด (มาตรฐาน, เอกสาร, NC, ความเสี่ยง, KPI, อบรม และผู้ใช้งาน)
                ให้กลับไปเป็นข้อมูลตัวอย่างเริ่มต้นของระบบ
              </p>
            </div>
            <Button variant="danger" onClick={() => setConfirmReset(true)} disabled={pending}>
              รีเซ็ตข้อมูลกลับค่าเริ่มต้น
            </Button>
          </Card>
        </div>
      )}

      <UserFormModal
        open={modalUser !== undefined}
        user={modalUser ?? null}
        onClose={() => setModalUser(undefined)}
      />

      <ConfirmDialog
        open={!!deletingUser}
        title="ยืนยันการลบผู้ใช้งาน"
        message={`ต้องการลบผู้ใช้งาน "${deletingUser?.name ?? ""}" ออกจากระบบใช่หรือไม่?`}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        pending={pending}
        onCancel={() => setDeletingUser(null)}
        onConfirm={handleDeleteUser}
      />

      <ConfirmDialog
        open={confirmReset}
        title="ยืนยันการรีเซ็ตข้อมูลทดลอง"
        message="ข้อมูลที่แก้ไขไว้ทั้งหมดจะถูกล้างกลับเป็นข้อมูลตัวอย่างเริ่มต้น ยืนยันดำเนินการต่อหรือไม่?"
        confirmLabel="ยืนยันรีเซ็ต"
        cancelLabel={t.common.cancel}
        pending={pending}
        onCancel={() => setConfirmReset(false)}
        onConfirm={handleResetDemo}
      />
    </div>
  );
}
