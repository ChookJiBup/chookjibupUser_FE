import { ReviewWritePanel } from "@/features/reviews/ReviewWritePanel";

export default async function FestivalReviewPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return <ReviewWritePanel festivalId={festivalId} />;
}
