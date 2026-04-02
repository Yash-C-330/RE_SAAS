import { SideNav } from "@/components/layout/side-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent lg:flex">
      <SideNav />
      <main className="flex-1 px-4 py-4 sm:px-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}

