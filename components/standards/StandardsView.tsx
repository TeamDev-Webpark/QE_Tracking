"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, Pagination, useToast } from "@/components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { cn } from "@/lib/cn";
import { departmentName } from "@/lib/format";
import { deleteStandard } from "@/lib/standards/actions";
import type { IsoStandard } from "@/lib/types";
import { useActiveDepartment } from "@/lib/useActiveDepartment";
import { StandardFormModal } from "./StandardFormModal";

export type StandardWithStats = IsoStandard & { total: number; passed: number; failed: number };

export function StandardsView({ standards }: { standards: StandardWithStats[] }) {
  const { lang, t } = useI18n();
  const toast = useToast();
  const user = useSessionUser();
  const role = user.role;
  const isPrivileged = role === "admin" || role === "qe" || role === "iso";
  const canManage = role === "admin" || role === "qe";
  // undefined = closed, null = add, IsoStandard = edit
  const [editing, setEditing] = useState<IsoStandard | null>();
  const [deleting, setDeleting] = useState<StandardWithStats>();
  const [deletePending, startDelete] = useTransition();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeDept, setActiveDept] = useActiveDepartment(isPrivileged ? undefined : user.departmentId);

  const confirmDelete = () => {
    if (!deleting) return;
    startDelete(async () => {
      const res = await deleteStandard(deleting.id);
      setDeleting(undefined);
      if (res.ok) {
        toast.success(t.standards.deleted);
      } else if (res.error) {
        toast.error(t.errors[res.error]);
      }
    });
  };

  const filteredStandards = standards.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.version.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredStandards.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedStandards = filteredStandards.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <>
      <PageHeader
        title={t.nav.standards}
        description={t.pages.standards}
        actions={
          canManage && (
            <Button onClick={() => setEditing(null)}>
              <PlusIcon width={18} height={18} />
              {t.standards.add}
            </Button>
          )
        }
      />

      {standards.length > 0 && (
        <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2.5 sm:gap-3">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <div className="relative sm:max-w-sm flex-1 min-w-0 sm:min-w-[240px] w-full sm:w-auto">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
                placeholder="ค้นหามาตรฐาน ISO (เช่น 9001, 14001, คุณภาพ)..."
                className="h-9 w-full rounded-lg border border-border/80 bg-surface pl-8 pr-7 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-hidden transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text"
                  title="ล้างคำค้นหา"
                >
                  ✕
                </button>
              )}
            </div>

            {isPrivileged && activeDept && activeDept !== "all" && (
              <div className="flex items-center justify-between sm:justify-start gap-1.5 rounded-lg border border-primary/30 bg-primary-soft/60 px-2.5 py-1.5 text-xs text-primary font-semibold">
                <span>🏢 แผนกที่เลือก: {departmentName(activeDept, lang)}</span>
                <button
                  type="button"
                  onClick={() => setActiveDept("all")}
                  className="ml-1 rounded px-1 text-primary/70 hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer"
                  title="ล้างการเลือกแผนก"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {search && (
            <span className="text-xs text-text-muted">
              พบ {filteredStandards.length} จาก {standards.length} มาตรฐาน
            </span>
          )}
        </div>
      )}

      {standards.length === 0 ? (
        <Card>
          <EmptyState title={t.standards.empty} />
        </Card>
      ) : filteredStandards.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-sm text-text-muted">
            ไม่พบมาตรฐานที่ตรงกับ &ldquo;{search}&rdquo;
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="ml-2 font-bold text-primary hover:underline"
            >
              ล้างคำค้นหา
            </button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
          {pagedStandards.map((s) => (
            <Card key={s.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{s.code}</h2>
                    <Badge tone="primary">{s.version}</Badge>
                  </div>
                  <p className="mt-1 font-semibold">{s.name}</p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(s)}
                      className="rounded-control p-2 text-text-muted hover:bg-page hover:text-primary cursor-pointer"
                      aria-label={`${t.common.edit} ${s.code}`}
                      title={t.common.edit}
                    >
                      <EditIcon width={18} height={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(s)}
                      className="rounded-control p-2 text-text-muted hover:bg-page hover:text-danger cursor-pointer"
                      aria-label={`${t.common.delete} ${s.code}`}
                      title={t.common.delete}
                    >
                      <TrashIcon width={18} height={18} />
                    </button>
                  </div>
                )}
              </div>
              {s.description && <p className="mt-2 text-sm text-text-muted">{s.description}</p>}

              <dl className="mt-5 grid grid-cols-4 gap-2 rounded-control bg-page p-3 text-center">
                <Stat label={t.standards.checklistCount} value={s.total} />
                <Stat label={t.standards.passed} value={s.passed} className="text-success" />
                <Stat label={t.standards.failed} value={s.failed} className="text-danger" />
                <Stat label={t.standards.notChecked} value={s.total - s.passed - s.failed} className="text-text-muted" />
              </dl>

              <Link
                href={activeDept && activeDept !== "all" ? `/standards/${s.id}?dept=${activeDept}` : `/standards/${s.id}`}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-control border border-primary text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
              >
                {t.standards.viewChecklist}
              </Link>
            </Card>
          ))}
        </div>
        <div className="mt-5">
          <Pagination
            totalItems={filteredStandards.length}
            page={safePage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        </div>
      </>
      )}

      {editing !== undefined && (
        <StandardFormModal standard={editing ?? undefined} onClose={() => setEditing(undefined)} />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={t.standards.deleteTitle}
        message={t.standards.deleteMessage
          .replace("{name}", deleting ? `${deleting.code}:${deleting.version}` : "")
          .replace("{checklists}", String(deleting?.total ?? 0))}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        pending={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(undefined)}
      />
    </>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className={cn("text-2xl font-bold", className)}>{value}</dd>
    </div>
  );
}
