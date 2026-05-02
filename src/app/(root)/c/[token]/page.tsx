import { Metadata } from "next";
import { ClientPageLayout } from "@/features/client-view/client-page-layout";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "PeraPixel Production | Secure Delivery",
    description: "Bringing your vision to life",
    icons: {
      icon: "/logo.png",
    },
  };
}

export default async function ClientTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ClientPageLayout token={token} />;
}

