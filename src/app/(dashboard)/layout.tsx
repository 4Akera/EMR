import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100">
      <Header />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

