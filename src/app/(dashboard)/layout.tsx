import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100 ios-bounce-disable">
      <Header />
      <main className="container mx-auto px-4 py-6 safe-bottom">{children}</main>
    </div>
  );
}

