import type { ComponentType, SVGProps } from "react";
import {
  ActionIcon,
  AuditIcon,
  DashboardIcon,
  DocumentIcon,
  HistoryIcon,
  KpiIcon,
  ReportIcon,
  RequirementIcon,
  RiskIcon,
  SettingsIcon,
  StandardIcon,
  TrainingIcon,
} from "@/components/icons";
import type { Dictionary } from "@/i18n/dictionaries";

export { isActivePath } from "./access";

export type NavItem = {
  labelKey: keyof Dictionary["nav"];
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export type NavGroup = {
  titleKey?: keyof Dictionary["nav"];
  items: NavItem[];
};

/**
 * Sidebar menu structure. Which items each role sees is decided by
 * `routeAccess` in config/access.ts.
 */
export const navigation: NavGroup[] = [
  {
    items: [{ labelKey: "dashboard", href: "/", icon: DashboardIcon }],
  },
  {
    titleKey: "groupIso",
    items: [
      { labelKey: "standards", href: "/standards", icon: StandardIcon },
      { labelKey: "requirements", href: "/requirements", icon: RequirementIcon },
      { labelKey: "documents", href: "/documents", icon: DocumentIcon },
      { labelKey: "audits", href: "/audits", icon: AuditIcon },
      { labelKey: "correctiveActions", href: "/corrective-actions", icon: ActionIcon },
    ],
  },
  {
    titleKey: "groupSystem",
    items: [
      { labelKey: "risks", href: "/risks", icon: RiskIcon },
      { labelKey: "training", href: "/training", icon: TrainingIcon },
      { labelKey: "kpi", href: "/kpi", icon: KpiIcon },
      { labelKey: "reports", href: "/reports", icon: ReportIcon },
      { labelKey: "auditTrail", href: "/audit-trail", icon: HistoryIcon },
      { labelKey: "settings", href: "/settings", icon: SettingsIcon },
    ],
  },
];
