"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "active" | "discharged" | "deceased" | "stopped" | "default";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    active: "badge-active",
    discharged: "badge-discharged",
    deceased: "badge-deceased",
    stopped: "badge-stopped",
    default: "bg-gray-100 text-gray-800",
  };

  return (
    <span className={cn("badge", variants[variant], className)}>
      {children}
    </span>
  );
}

