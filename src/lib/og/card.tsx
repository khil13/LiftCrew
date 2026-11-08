import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { MIN_JOB_HOURS } from "@/lib/pricing";

// Shared 1200×630 link-preview card (Facebook, Instagram, iMessage, Google).
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = "LiftCrew: moving help in North Jersey. One price, pay when it's done.";

const BLUE = "#3154de";

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512">
      <rect width="512" height="512" rx="112" fill={BLUE} />
      <path d="M136 208 256 152l120 56v140l-120 56-120-56z" fill="#fff" />
      <path d="M136 208l120 56 120-56M256 264v140" fill="none" stroke={BLUE} strokeWidth="18" strokeLinejoin="round" />
      <path d="M196 180l120 56" fill="none" stroke={BLUE} strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

// Bundled Inter (OFL) so headlines render bold; the built-in font has no bold weight.
const fontDir = join(process.cwd(), "src/lib/og/fonts");

/** Renders the card. `eyebrow` is the small line above the headline, e.g. a town. */
export async function ogCard({ eyebrow, headline }: { eyebrow: string; headline: string }) {
  const chips = ["No deposit", "No hidden fees", "Free cancellation", `${MIN_JOB_HOURS}-hour minimum`];
  const [regular, bold] = await Promise.all([
    readFile(join(fontDir, "Inter-Regular.ttf")),
    readFile(join(fontDir, "Inter-Bold.ttf")),
  ]);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#ffffff",
        padding: "64px 72px",
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Mark size={72} />
          <div style={{ fontSize: 44, fontWeight: 700, color: BLUE, letterSpacing: -1 }}>LiftCrew</div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#5b6478" }}>liftcrewnj.com</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: 2 }}>
          {eyebrow}
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, color: "#202b45", lineHeight: 1.08, letterSpacing: -2 }}>
          {headline}
        </div>
        <div style={{ fontSize: 34, color: "#384157" }}>One price, pay when it&apos;s done. You bring the truck.</div>
      </div>
      <div style={{ display: "flex" }}>
        <div style={{ display: "flex", gap: 14 }}>
          {chips.map((c) => (
            <div
              key={c}
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#202b45",
                border: "2px solid #dfe4ef",
                borderRadius: 999,
                padding: "10px 22px",
              }}
            >
              {c}
            </div>
          ))}
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
