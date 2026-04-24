import { InfluencerDetailClient } from "@/components/InfluencerDetailClient";
import { buildSeedInfluencers } from "@/lib/mockData";

export function generateStaticParams() {
  return buildSeedInfluencers().map((influencer) => ({ id: influencer.id }));
}

export default function InfluencerDetailPage({ params }: { params: { id: string } }) {
  return <InfluencerDetailClient id={params.id} />;
}
