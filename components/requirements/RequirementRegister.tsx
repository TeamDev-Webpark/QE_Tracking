"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { Button, Card, ConfirmDialog, DataTable, Input, Modal, PageHeader, Select, type Column, useToast } from "@/components/ui";
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { LinkedChecklistsPanel } from "./LinkedChecklistsPanel";
import { getUserById } from "@/data";
import { departments } from "@/data/departments";
import { departmentName } from "@/lib/format";
import { deleteRequirement } from "@/lib/requirements/actions";
import { filterRequirements, REQUIREMENT_STATUSES, type RequirementFilter } from "@/lib/requirements";
import type { ChecklistOption, RequirementRow, StandardOption } from "@/lib/requirements/queries";
import type { Requirement, RequirementStatus } from "@/lib/types";
import { displayName } from "@/lib/user";
import { RequirementFormModal } from "./RequirementFormModal";
import { RequirementStatusBadge } from "./RequirementStatusBadge";

const emptyFilter: RequirementFilter = { query: "", departmentId: "", status: "" };

export function RequirementRegister({
  rows,
  standards,
  checklists,
}: {
  rows: RequirementRow[];
  standards: StandardOption[];
  checklists: ChecklistOption[];
}) {
  const { lang, t } = useI18n();
  const toast = useToast();
  const user = useSessionUser();
  const role = user.role;
  const isPrivileged = role === "admin" || role === "qe" || role === "iso";
  const canManage = role === "admin" || role === "qe";
  const [filter, setFilter] = useState<RequirementFilter>(emptyFilter);
  const [standardFilter, setStandardFilter] = useState<string>("");
  const deferredQuery = useDeferredValue(filter.query);
  // undefined = closed, null = add new
  const [editing, setEditing] = useState<Requirement | null>();
  // Modal for viewing linked checklist items of a requirement
  const [viewing, setViewing] = useState<RequirementRow>();
  const [deleting, setDeleting] = useState<RequirementRow>();
  const [deletePending, startDelete] = useTransition();

  const confirmDelete = () => {
    if (!deleting) return;
    startDelete(async () => {
      const res = await deleteRequirement(deleting.id);
      setDeleting(undefined);
      if (res.ok) toast.success(t.requirements.deleted);
      else if (res.error) toast.error(t.errors[res.error]);
    });
  };

  const visible = useMemo(
    () =>
      filterRequirements(rows, { ...filter, query: deferredQuery }).filter(
        (r) => !standardFilter || r.standardId === standardFilter,
      ),
    [rows, filter, deferredQuery, standardFilter],
  );
  const filtered = filter.query !== "" || filter.departmentId !== "" || filter.status !== "" || standardFilter !== "";

  const columns: Column<RequirementRow>[] = [
    {
      key: "number",
      header: t.requirements.number,
      className: "w-32",
      render: (r) => (
        <>
          <p className="font-bold">{r.number}</p>
          <p className="text-xs whitespace-nowrap text-text-muted">{r.standardLabel}</p>
        </>
      ),
    },
    {
      key: "name",
      header: t.requirements.name,
      render: (r) => (
        <div>
          <button
            type="button"
            onClick={() => setViewing(r)}
            className="font-semibold text-left text-text hover:text-primary hover:underline cursor-pointer transition-colors"
          >
            {r.name}
          </button>
          {r.description && <p className="line-clamp-1 text-xs text-text-muted mt-0.5">{r.description}</p>}
        </div>
      ),
    },
    {
      key: "owner",
      header: `${t.requirements.department} / ${t.requirements.owner}`,
      render: (r) => {
        const owner = getUserById(r.ownerId);
        return (
          <>
            <p className="font-medium">{departmentName(r.departmentId, lang)}</p>
            <p className="text-xs text-text-muted">{owner ? displayName(owner, lang) : "-"}</p>
          </>
        );
      },
    },
    {
      key: "status",
      header: t.requirements.status,
      className: "whitespace-nowrap",
      render: (r) => (
        <div className="space-y-1">
          <RequirementStatusBadge status={r.status} />
          {r.summary.total > 0 && (
            <p className="text-[11px] text-text-muted tabular-nums">
              {r.summary.passed}/{r.summary.total} {t.standards.passed}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-px text-right whitespace-nowrap",
      render: (r: RequirementRow) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setViewing(r)}
            className="rounded-control border border-border/80 bg-surface px-2.5 py-1.5 text-xs font-semibold text-primary hover:border-primary/40 hover:bg-primary-soft transition-colors cursor-pointer"
          >
            ดูรายการตรวจ ({r.summary.total})
          </button>
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setEditing(r)}
                className="rounded-control p-2 text-text-muted hover:bg-page hover:text-primary cursor-pointer"
                aria-label={`${t.common.edit} ${r.number}`}
                title={t.common.edit}
              >
                <EditIcon width={18} height={18} />
              </button>
              <button
                type="button"
                onClick={() => setDeleting(r)}
                className="rounded-control p-2 text-text-muted hover:bg-page hover:text-danger cursor-pointer"
                aria-label={`${t.common.delete} ${r.number}`}
                title={t.common.delete}
              >
                <TrashIcon width={18} height={18} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const viewingChecklists = viewing
    ? checklists.filter((c) => viewing.checklistIds.includes(c.id))
    : [];

  return (
    <>
      <PageHeader
        title={t.nav.requirements}
        description={t.pages.requirements}
        actions={
          canManage && (
            <Button onClick={() => setEditing(null)}>
              <PlusIcon width={18} height={18} />
              {t.requirements.add}
            </Button>
          )
        }
      />

      <Card>
        {/* Search + filters */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">{t.common.search}</span>
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-muted"
              width={18}
              height={18}
            />
            <Input
              type="search"
              value={filter.query}
              onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
              placeholder={t.requirements.searchPlaceholder}
              className="pl-11"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:flex lg:items-center">
            <Select
              aria-label={t.requirements.standard}
              value={standardFilter}
              onChange={(e) => setStandardFilter(e.target.value)}
              className="lg:w-44"
            >
              <option value="">ทุกมาตรฐาน ISO</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Select
              aria-label={t.requirements.status}
              value={filter.status}
              onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value as RequirementStatus | "" }))}
              className="lg:w-48"
            >
              <option value="">{t.requirements.allStatuses}</option>
              {REQUIREMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t.requirementStatus[s]}
                </option>
              ))}
            </Select>
            {isPrivileged ? (
              <Select
                aria-label={t.requirements.department}
                value={filter.departmentId}
                onChange={(e) => setFilter((f) => ({ ...f, departmentId: e.target.value }))}
                className="lg:w-56"
              >
                <option value="">{t.requirements.allDepartments}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {lang === "en" ? d.nameEn : d.name}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft/40 px-3 py-2 text-xs font-semibold text-primary">
                <span>🏢 แผนกของคุณ: {departmentName(user.departmentId, lang)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between text-sm text-text-muted">
          <span aria-live="polite">
            {t.requirements.showing.replace("{shown}", String(visible.length)).replace("{total}", String(rows.length))}
          </span>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setFilter(emptyFilter);
                setStandardFilter("");
              }}
              className="font-semibold text-primary hover:underline"
            >
              {t.requirements.clearFilters}
            </button>
          )}
        </div>

        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(r) => r.id}
          emptyTitle={rows.length === 0 ? t.requirements.empty : t.requirements.noMatch}
        />
      </Card>

      {/* Detail Modal: Shows linked checklist items in this requirement */}
      {viewing && (
        <Modal
          open
          size="lg"
          onClose={() => setViewing(undefined)}
          closeLabel={t.common.close}
          title={`ข้อกำหนด ${viewing.number} · ${viewing.name}`}
          footer={
            <div className="flex w-full items-center justify-between gap-2">
              {canManage ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const target = viewing;
                    setViewing(undefined);
                    setEditing(target);
                  }}
                >
                  <EditIcon width={16} height={16} />
                  แก้ไข / ผูกรายการตรวจ
                </Button>
              ) : (
                <div />
              )}
              <Button variant="secondary" onClick={() => setViewing(undefined)}>
                {t.common.close}
              </Button>
            </div>
          }
        >
          <div className="space-y-5 text-sm">
            {/* Summary Info */}
            <div className="rounded-control bg-page p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-primary">{viewing.standardLabel} · ข้อ {viewing.number}</span>
                <RequirementStatusBadge status={viewing.status} />
              </div>
              {viewing.description && <p className="text-text">{viewing.description}</p>}
              <div className="grid gap-3 pt-2 border-t border-border/60 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-text-muted">แผนกที่รับผิดชอบ: </span>
                  <strong className="text-text">{departmentName(viewing.departmentId, lang)}</strong>
                </div>
                <div>
                  <span className="text-text-muted">ผู้รับผิดชอบหลัก: </span>
                  <strong className="text-text">
                    {(() => {
                      const owner = getUserById(viewing.ownerId);
                      return owner ? displayName(owner, lang) : "-";
                    })()}
                  </strong>
                </div>
              </div>
            </div>

            {/* Linked Checklists List */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="font-bold text-text">
                  รายการตรวจในหมวดนี้ ({viewingChecklists.length} ข้อ)
                </h3>
              </div>

              {viewingChecklists.length === 0 ? (
                <div className="rounded-control border border-dashed border-border p-6 text-center text-text-muted">
                  <p>ยังไม่ได้ผูกรายการตรวจเข้ากับหมวดข้อกำหนดนี้</p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewing;
                        setViewing(undefined);
                        setEditing(target);
                      }}
                      className="mt-2 text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      + คลิกเพื่อเลือกผูกรายการตรวจ
                    </button>
                  )}
                </div>
              ) : (
                <LinkedChecklistsPanel key={viewing.id} checklists={viewingChecklists} lang={lang} />
              )}
            </div>
          </div>
        </Modal>
      )}

      {editing !== undefined && (
        <RequirementFormModal
          requirement={editing ?? undefined}
          standards={standards}
          checklists={checklists}
          onClose={() => setEditing(undefined)}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={t.requirements.deleteTitle}
        message={t.requirements.deleteMessage.replace("{name}", deleting ? `${deleting.number} ${deleting.name}` : "")}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        pending={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(undefined)}
      />
    </>
  );
}
