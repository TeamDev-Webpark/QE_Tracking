"use client";

import { useState, useTransition } from "react";
import type { Role } from "@/config/access";
import { Button, Field, Input, Modal, Select, useToast } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { departments } from "@/data/departments";
import { departmentName } from "@/lib/format";
import { saveUser } from "@/lib/settings/actions";
import type { FieldError } from "@/lib/standards/actions";
import type { User } from "@/lib/types";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "admin", label: "ผู้ดูแลระบบ (Admin)" },
  { value: "qe", label: "QE / QMR (จัดการระบบ ISO)" },
  { value: "iso", label: "ISO Auditor (ผู้ตรวจประเมิน)" },
  { value: "employee", label: "พนักงาน / หัวหน้าแผนก" },
];

export function UserFormModal({
  open,
  user,
  onClose,
}: {
  open: boolean;
  user: User | null;
  onClose: () => void;
}) {
  if (!open) return null;
  return <UserFormInner key={user?.id ?? "new"} user={user} onClose={onClose} />;
}

function UserFormInner({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(user?.name ?? "");
  const [nameEn, setNameEn] = useState(user?.nameEn ?? "");
  const [position, setPosition] = useState(user?.position ?? "");
  const [departmentId, setDepartmentId] = useState(user?.departmentId ?? departments[0]?.id ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "employee");
  const [active, setActive] = useState(user?.active ?? true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldError>>({});

  const err = (k: string) => (fieldErrors[k] ? t.errors[fieldErrors[k]] : undefined);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    startTransition(async () => {
      const res = await saveUser(user?.id ?? null, {
        name,
        nameEn,
        position,
        departmentId,
        role,
        active,
      });
      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        else toast.error(t.errors.forbidden);
        return;
      }
      toast.success("บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว");
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={pending ? () => {} : onClose}
      size="md"
      title={user ? "แก้ไขข้อมูลผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
      closeLabel={t.common.close}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="user-form" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="user-name" label="ชื่อ-นามสกุล (ภาษาไทย)" required error={err("name")}>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สมหญิง รักงาน"
              invalid={!!fieldErrors.name}
              autoFocus
            />
          </Field>
          <Field htmlFor="user-name-en" label="ชื่อ-นามสกุล (ภาษาอังกฤษ)">
            <Input
              id="user-name-en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="เช่น Somying Rakngan"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="user-pos" label="ตำแหน่ง" required error={err("position")}>
            <Input
              id="user-pos"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="เช่น Quality Engineer"
              invalid={!!fieldErrors.position}
            />
          </Field>
          <Field htmlFor="user-dept" label="แผนก" required error={err("departmentId")}>
            <Select
              id="user-dept"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              invalid={!!fieldErrors.departmentId}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {departmentName(d.id, lang)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="user-role" label="บทบาท / สิทธิ์การใช้งาน">
            <Select id="user-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor="user-active" label="สถานะบัญชี">
            <Select
              id="user-active"
              value={active ? "active" : "inactive"}
              onChange={(e) => setActive(e.target.value === "active")}
            >
              <option value="active">ใช้งานอยู่</option>
              <option value="inactive">ระงับการใช้งาน</option>
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
