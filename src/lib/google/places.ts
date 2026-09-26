import "server-only";
import { envValue } from "@/lib/env";

// Places API (New), called server-side only. The state for any address always
// comes from administrative_area_level_1 here, never from user-typed text.

const API = "https://places.googleapis.com/v1";

function apiKey(): string {
  const key = envValue("GOOGLE_MAPS_SERVER_API_KEY");
  if (!key) throw new Error("GOOGLE_MAPS_SERVER_API_KEY is not set");
  return key;
}

export type PlaceSuggestion = { placeId: string; text: string };

export async function autocompleteAddress(input: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
  const res = await fetch(`${API}/places:autocomplete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey() },
    body: JSON.stringify({ input, includedRegionCodes: ["us"], sessionToken }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Places autocomplete failed: ${res.status}`);
  const body = (await res.json()) as {
    suggestions?: { placePrediction?: { placeId: string; text: { text: string } } }[];
  };
  return (body.suggestions ?? [])
    .flatMap((s) => (s.placePrediction ? [s.placePrediction] : []))
    .map((p) => ({ placeId: p.placeId, text: p.text.text }));
}

export type ResolvedPlace = {
  formattedAddress: string;
  state: string | null; // administrative_area_level_1 short name, e.g. "NJ"
  country: string | null;
  lat: number;
  lng: number;
};

export async function resolvePlace(placeId: string, sessionToken?: string): Promise<ResolvedPlace> {
  if (!/^[A-Za-z0-9_-]+$/.test(placeId)) throw new Error("Invalid place id");
  const url = new URL(`${API}/places/${placeId}`);
  if (sessionToken) url.searchParams.set("sessionToken", sessionToken);
  const res = await fetch(url, {
    headers: { "X-Goog-Api-Key": apiKey(), "X-Goog-FieldMask": "formattedAddress,addressComponents,location" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Place details failed: ${res.status}`);
  const body = (await res.json()) as {
    formattedAddress: string;
    addressComponents?: { shortText: string; types: string[] }[];
    location: { latitude: number; longitude: number };
  };
  const component = (type: string) => body.addressComponents?.find((c) => c.types.includes(type))?.shortText ?? null;
  return {
    formattedAddress: body.formattedAddress,
    state: component("administrative_area_level_1"),
    country: component("country"),
    lat: body.location.latitude,
    lng: body.location.longitude,
  };
}
