import { PolicyMarkdown } from "@/features/policy/PolicyMarkdown";

interface PolicyDocumentProps {
  title: string;
  body: string;
}

export function PolicyDocument({ title, body }: PolicyDocumentProps) {
  return (
    <article className="flex flex-col gap-4 pb-8">
      <h1 className="heading-small text-zinc-950">{title}</h1>
      <PolicyMarkdown content={body} />
    </article>
  );
}
