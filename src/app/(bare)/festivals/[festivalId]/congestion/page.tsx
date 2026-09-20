import { FestivalCongestionPanel } from "@/features/festivals/FestivalCongestionPanel";

export default async function FestivalCongestionPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return <FestivalCongestionPanel festivalId={festivalId} />;
}
