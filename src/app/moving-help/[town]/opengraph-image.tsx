import { OG_SIZE, ogCard } from "@/lib/og/card";
import { TOWNS, getTown } from "@/lib/towns";

export const size = OG_SIZE;
export const dynamicParams = false;
export const contentType = "image/png";
export const alt = "LiftCrew moving help";

export function generateStaticParams() {
  return TOWNS.map((t) => ({ town: t.slug }));
}

export default function Image({ params }: { params: { town: string } }) {
  const town = getTown(params.town);
  const name = town?.name ?? "New Jersey";
  return ogCard({
    eyebrow: town ? `${town.name}, ${town.county} County, NJ` : "New Jersey",
    headline: `Moving help in ${name}, NJ`,
  });
}
