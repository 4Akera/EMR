import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateForInput(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

export function formatDateTimeForInput(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().slice(0, 16);
}

export function calculateAge(birthDate: string | null | undefined): string {
  if (!birthDate) return "—";
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return `${age} years`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "badge-active";
    case "DISCHARGED":
      return "badge-discharged";
    case "DECEASED":
      return "badge-deceased";
    case "STOPPED":
      return "badge-stopped";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getSexLabel(sex: string | null | undefined): string {
  switch (sex) {
    case "M":
      return "Male";
    case "F":
      return "Female";
    case "U":
      return "Unknown";
    default:
      return "—";
  }
}

export function getActionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    TX: "Treatment",
    INV: "Investigation",
    EXAM: "Examination",
    REASONING: "Clinical Reasoning",
    VITALS: "Vitals",
    NOTE: "Note",
    TRANSFER: "Transfer",
  };
  return labels[type] || type;
}

export function getActionTypeColor(type: string): string {
  const colors: Record<string, string> = {
    TX: "bg-emerald-100 text-emerald-800",
    INV: "bg-purple-100 text-purple-800",
    EXAM: "bg-blue-100 text-blue-800",
    REASONING: "bg-amber-100 text-amber-800",
    VITALS: "bg-rose-100 text-rose-800",
    NOTE: "bg-slate-100 text-slate-800",
    TRANSFER: "bg-cyan-100 text-cyan-800",
  };
  return colors[type] || "bg-gray-100 text-gray-800";
}

export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateTime(dateString);
}

