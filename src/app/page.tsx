import { FestivalListPanel } from "@/features/festivals/FestivalListPanel";

export default function Home() {
  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <h1 className="heading-small text-zinc-950">축제 목록</h1>
      </div>
      <FestivalListPanel />
    </div>
  );
}
