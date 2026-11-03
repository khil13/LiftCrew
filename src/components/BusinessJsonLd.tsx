import { SITE_URL, SUPPORT_EMAIL } from "@/lib/legal";
import type { BusinessPhone } from "@/lib/contact";
import { TOWNS } from "@/lib/towns";

/**
 * schema.org data for search engines. LiftCrew is a service-area business, so
 * it lists the towns it serves (areaServed) and never a street address.
 */
export default function BusinessJsonLd({ phone, town }: { phone: BusinessPhone | null; town?: string }) {
  const business = {
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#business`,
    name: "LiftCrew",
    description:
      "Labor-only moving help in New Jersey: local helpers load and unload trucks, pack, and move heavy furniture. Customers provide the truck.",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}/icon-512.png`,
    email: SUPPORT_EMAIL,
    ...(phone ? { telephone: phone.e164 } : {}),
    areaServed: [
      ...TOWNS.map((t) => ({ "@type": "City", name: `${t.name}, NJ` })),
      { "@type": "State", name: "New Jersey" },
    ],
  };
  const data = town
    ? {
        "@context": "https://schema.org",
        "@graph": [
          business,
          {
            "@type": "Service",
            name: `Moving labor in ${town}, NJ`,
            serviceType: "Moving labor (loading, unloading, packing)",
            provider: { "@id": `${SITE_URL}/#business` },
            areaServed: { "@type": "City", name: `${town}, NJ` },
          },
        ],
      }
    : { "@context": "https://schema.org", ...business };
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here except for "<", which we escape.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
