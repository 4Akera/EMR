"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Users, LogOut, Menu, X, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Logo } from "@/components/ui/Logo";
import { useState } from "react";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { href: "/patients", label: "Patients", icon: Users },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-surface-200 bg-white/95 backdrop-blur-md shadow-sm safe-area-inset-top ios-tap-highlight-none">
        <div className="container mx-auto px-4">
          <div className="flex h-14 md:h-16 items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4 lg:gap-8 flex-1 min-w-0">
              <Link href="/patients" className="flex items-center gap-2 group no-select touch-manipulation">
                <Logo className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 transition-transform group-hover:scale-105 group-active:scale-95" />
                <span className="text-base md:text-lg lg:text-xl font-bold text-surface-900 truncate">
                  <span className="hidden sm:inline">Hospital</span>
                  <span className="text-primary-600">EMR</span>
                </span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all native-transition touch-manipulation no-select",
                        isActive
                          ? "bg-primary-50 text-primary-700 ios-shadow"
                          : "text-surface-600 hover:bg-surface-100 hover:text-surface-900 active:bg-surface-200"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Desktop Sign Out */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="hidden md:flex text-surface-500 touch-manipulation no-select active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-surface-600 hover:bg-surface-100 active:bg-surface-200 touch-manipulation tap-target no-select transition-all"
                aria-label="Menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu - iOS Native Style */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-surface-100 bg-white ios-shadow animate-in slide-in-from-top duration-200">
            <div className="container mx-auto px-4 py-3 space-y-1 safe-bottom">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all native-transition touch-manipulation no-select tap-target",
                      isActive
                        ? "bg-primary-50 text-primary-700 ios-shadow"
                        : "text-surface-600 hover:bg-surface-100 active:bg-surface-200"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 w-full touch-manipulation no-select tap-target transition-all native-transition"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
