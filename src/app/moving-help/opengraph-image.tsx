import { OG_SIZE, ogCard } from "@/lib/og/card";

export const alt = "LiftCrew: moving help across Essex and Union County, NJ";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ eyebrow: "Essex & Union County, NJ", headline: "Moving help near you" });
}
