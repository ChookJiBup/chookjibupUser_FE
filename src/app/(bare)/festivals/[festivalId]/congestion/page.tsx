import { FestivalCongestionPanel } from "@/features/festivals/FestivalCongestionPanel";

export default async function FestivalCongestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ festivalId: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { festivalId } = await params;
  const { view } = await searchParams;
  return (
    <FestivalCongestionPanel
      festivalId={festivalId}
      initialView={view === "map" ? "MAP" : "LIST"}
    />
  );
}
