"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "iso_active_department";
const EVENT_NAME = "iso-active-department-change";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT_NAME, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT_NAME, callback);
  };
}

function getSnapshot(): string {
  if (typeof window === "undefined") return "all";
  return window.localStorage.getItem(STORAGE_KEY) || "all";
}

function getServerSnapshot(): string {
  return "all";
}

/**
 * Syncs the selected department filter with localStorage without causing
 * Next.js SSR/client hydration mismatches.
 * If `lockedDept` is provided (e.g. for employee role), always returns `lockedDept`.
 */
export function useActiveDepartment(lockedDept?: string): [string, (deptId: string) => void] {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setDepartment = useCallback((deptId: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, deptId);
      window.dispatchEvent(new Event(EVENT_NAME));
    }
  }, []);

  if (lockedDept) {
    return [lockedDept, setDepartment];
  }

  return [stored, setDepartment];
}
