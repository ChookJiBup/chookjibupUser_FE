import { ReviewWritePanel } from "@/features/reviews/ReviewWritePanel";

export default async function FestivalReviewPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <div className="-mx-5 -my-4">
      <ReviewWritePanel festivalId={festivalId} />
    </div>
  );
}
