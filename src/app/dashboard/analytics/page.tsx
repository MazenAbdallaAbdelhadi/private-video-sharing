import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BarChart as BarChartIcon } from "lucide-react";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { LinkAnalytics } from "@/features/dashboard/analytics/link-analytics";

export default async function AnalyticsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const links = await prisma.clientLink.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      token: true,
      clientName: true,
      clientEmail: true,
      clientPage: { select: { clientName: true, heroTitle: true } },
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">
          Track engagement and view activity logs for your shared links.
        </p>
      </div>

      {links.length === 0 ? (
        <div className="text-center p-12 border rounded-lg bg-card text-muted-foreground border-dashed flex flex-col items-center gap-4">
          <BarChartIcon size={48} className="opacity-20" />
          <p>No links generated yet. Generate a link to see analytics.</p>
        </div>
      ) : (
        <LinkAnalytics initialLinks={links} />
      )}
    </div>
  );
}
