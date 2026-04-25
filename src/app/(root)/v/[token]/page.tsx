import { VideoViewer } from "@/features/viewer/video-viewer";

export default async function VideoTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <VideoViewer token={token} />;
}

