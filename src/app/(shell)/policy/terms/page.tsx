import { PolicyDocument } from "@/features/policy/PolicyDocument";
import { getPolicyContent } from "@/features/policy/policyContent";

export default function TermsPolicyPage() {
  const { title, body } = getPolicyContent("terms");
  return <PolicyDocument title={title} body={body} />;
}
