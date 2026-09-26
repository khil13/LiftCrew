"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "liftcrew-install-dismissed";

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Registers the service worker and offers "Add to home screen". */
export default function PwaSetup() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => console.error("Service worker failed", err));
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || dismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari has no install prompt; show instructions instead.
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios/i.test(ua)) {
      setIosHint(true);
      setHidden(false);
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // private mode: the banner just comes back next visit
    }
  }

  if (hidden) return null;
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-md px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-3 rounded-xl bg-slate-900 p-3 text-sm text-white shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-lg" />
        <p className="flex-1">
          {iosHint && !installEvent ? (
            <>
              Install LiftCrew: tap <span className="font-semibold">Share</span>, then{" "}
              <span className="font-semibold">Add to Home Screen</span>.
            </>
          ) : (
            "Install LiftCrew for faster access and job alerts."
          )}
        </p>
        {installEvent && (
          <button
            className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-900"
            onClick={async () => {
              await installEvent.prompt();
              await installEvent.userChoice;
              dismiss();
            }}
          >
            Install
          </button>
        )}
        <button aria-label="Dismiss" className="px-1 text-slate-300" onClick={dismiss}>
          ✕
        </button>
      </div>
    </div>
  );
}
