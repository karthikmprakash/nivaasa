import {
  BookUser, Building2, CalendarHeart, ChartNoAxesCombined, FileText, House,
  LayoutDashboard, Newspaper, Package, ScrollText, Settings, ShieldCheck,
  ShoppingBag, Truck, UserRoundCheck, UsersRound, Wallet, Wrench, Megaphone,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  roles?: readonly string[];
};
export type NavigationGroup = { label: string; items: NavigationItem[] };

export const residentNavigation: NavigationGroup[] = [
  { label: "Community", items: [
    { href: "/app", label: "Home", icon: House },
    { href: "/app/community", label: "Community", icon: Newspaper },
    { href: "/app/directory", label: "Directory", icon: BookUser },
    { href: "/app/documents", label: "Documents", icon: FileText },
  ] },
  { label: "Everyday services", items: [
    { href: "/app/visitors", label: "Visitors", icon: UserRoundCheck },
    { href: "/app/deliveries", label: "Deliveries", icon: Package },
    { href: "/app/helpdesk", label: "Helpdesk", icon: Wrench },
    { href: "/app/amenities", label: "Amenities", icon: CalendarHeart },
    { href: "/app/payments", label: "Payments", icon: Wallet },
  ] },
  { label: "Household", items: [
    { href: "/app/my-home", label: "My home", icon: House },
    { href: "/app/classifieds", label: "Buy & sell", icon: ShoppingBag },
    { href: "/app/settings", label: "Settings", icon: Settings },
  ] },
];

export const adminNavigation: NavigationGroup[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }] },
  { label: "People", items: [
    { href: "/admin/residents", label: "Residents & homes", icon: Building2, roles: ["admin", "manager", "committee", "security_manager", "auditor"] },
    { href: "/admin/staff", label: "Staff & attendance", icon: UsersRound, roles: ["admin", "manager", "committee", "security_manager"] },
    { href: "/admin/vendors", label: "Vendors & assets", icon: Truck, roles: ["admin", "manager", "accountant", "committee"] },
  ] },
  { label: "Operations", items: [
    { href: "/admin/security", label: "Security & gate", icon: ShieldCheck, roles: ["admin", "manager", "committee", "security_manager", "auditor"] },
    { href: "/admin/helpdesk", label: "Helpdesk", icon: Wrench, roles: ["admin", "manager", "committee", "helpdesk_manager"] },
    { href: "/admin/amenities", label: "Amenities", icon: CalendarHeart, roles: ["admin", "manager", "committee"] },
  ] },
  { label: "Finance", items: [
    { href: "/admin/billing", label: "Billing & accounts", icon: Wallet, roles: ["admin", "manager", "accountant", "committee", "auditor"] },
    { href: "/admin/reports", label: "Reports", icon: ChartNoAxesCombined, roles: ["admin", "manager", "accountant", "committee", "auditor"] },
  ] },
  { label: "Manage", items: [
    { href: "/admin/communications", label: "Communications", icon: Megaphone, roles: ["admin", "manager", "committee"] },
    { href: "/admin/audit", label: "Audit log", icon: ScrollText, roles: ["admin", "manager", "auditor"] },
    { href: "/admin/settings", label: "Society settings", icon: Settings, roles: ["admin", "manager"] },
  ] },
];

export function isNavigationActive(pathname: string, href: string, root: string) {
  return pathname === href || (href !== root && pathname.startsWith(`${href}/`));
}

export function navigationTitle(pathname: string, groups: NavigationGroup[], root: string) {
  const item = groups.flatMap((g) => g.items).find((i) => isNavigationActive(pathname, i.href, root));
  if (item) return item.label;
  const extra: Record<string, string> = { search: "Search", emergency: "Emergency", notifications: "Notifications" };
  return extra[pathname.split("/")[2]] ?? "Overview";
}
