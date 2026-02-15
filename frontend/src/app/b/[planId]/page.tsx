import { redirect } from "next/navigation";

export default function ShortBoxLinkPage({
  params,
}: {
  params: { planId: string };
}) {
  redirect(`/boxes/${params.planId}`);
}

