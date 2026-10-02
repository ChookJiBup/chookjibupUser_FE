import { PolicyDocument } from "@/features/policy/PolicyDocument";
import { getPolicyContent } from "@/features/policy/policyContent";

export default function PrivacyPolicyPage() {
  const { title, body } = getPolicyContent("privacy");
  return <PolicyDocument title={title} body={body} />;
}
