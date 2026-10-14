"use client";

import { Analytics } from "@vercel/analytics/next";

/** Cookieless page views (Vercel Web Analytics). Query strings are dropped so codes and ids never leave the page. */
export default function SiteAnalytics() {
  return <Analytics mode="production" beforeSend={(event) => ({ ...event, url: event.url.split("?")[0] })} />;
}
