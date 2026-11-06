import { OG_ALT, OG_SIZE, ogCard } from "@/lib/og/card";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ eyebrow: "Irvington · Newark · Union · Maplewood", headline: "Moving help in North Jersey" });
}
