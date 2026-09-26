"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

type Status = "loading" | "unsupported" | "blocked" | "off" | "on";

/** Turns push notifications on or off for this device. */
export default function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("blocked");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  async function turnOn() {
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setStatus(permission === "denied" ? "blocked" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
        }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("save failed");
      setStatus("on");
    } catch {
      setError("Couldn't turn on notifications on this device.");
    }
  }

  async function turnOff() {
    setError(null);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setStatus("off");
  }

  if (status === "loading") return null;
  return (
    <div className="card space-y-2 text-sm">
      <p className="font-semibold">Push notifications</p>
      {status === "unsupported" && (
        <p className="text-slate-600">
          This browser doesn&apos;t support push notifications. On iPhone, add LiftCrew to your Home Screen first.
        </p>
      )}
      {status === "blocked" && (
        <p className="text-slate-600">Notifications are blocked. Allow them for this site in your browser settings.</p>
      )}
      {status === "off" && (
        <>
          <p className="text-slate-600">Get bookings, invites, and reminders on this device.</p>
          <button className="btn-primary py-2 text-sm" onClick={turnOn}>
            Turn on notifications
          </button>
        </>
      )}
      {status === "on" && (
        <>
          <p className="text-slate-600">On for this device.</p>
          <button className="btn-secondary py-2 text-sm" onClick={turnOff}>
            Turn off
          </button>
        </>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
