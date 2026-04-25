import { ClientPageLayout } from "@/features/client-view/client-page-layout";

export default async function ClientTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ClientPageLayout token={token} />;
}
