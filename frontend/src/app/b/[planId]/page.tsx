import { redirect } from "next/navigation";

export default async function ShortBoxLinkPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  redirect(`/boxes/${planId}`);
}

