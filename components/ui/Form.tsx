import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-control border bg-page px-4 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60";
const selectArrow =
  "appearance-none bg-no-repeat bg-[position:right_0.75rem_center] bg-[size:16px_16px] bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] pr-9";

/** Label + control + error message. */
export function Field({
  label,
  htmlFor,
  error,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={htmlFor} className="mb-1.5 sm:mb-2 block text-sm font-semibold">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-semibold text-danger">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-text-muted">{hint}</p>
      )}
    </div>
  );
}

export function Input({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(control, "h-10 sm:h-11", invalid ? "border-danger" : "border-border", className)}
      {...props}
    />
  );
}

export function Select({ className, invalid, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        control,
        selectArrow,
        "h-10 sm:h-11 py-0 whitespace-nowrap truncate leading-normal",
        invalid ? "border-danger" : "border-border",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, invalid, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(control, "py-3", invalid ? "border-danger" : "border-border", className)}
      {...props}
    />
  );
}
