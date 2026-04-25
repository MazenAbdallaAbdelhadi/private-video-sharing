import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarNav } from "@/features/dashboard/sidebar-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login?returnTo=/dashboard");
  }

  return (
    <SidebarProvider>
      <SidebarNav />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-4 lg:h-16">
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-4 lg:p-6 bg-muted/20">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
