"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import { checkIn } from "./actions";

/** Checks in with the phone's location when the helper allows it (optional GPS check). */
export default function CheckInButton({ jobId }: { jobId: string }) {
  const [state, action] = useFormState(checkIn, {});
  const form = useRef<HTMLFormElement>(null);
  const [coords, setCoords] = useState<{ lat: string; lng: string }>({ lat: "", lng: "" });
  const [locating, setLocating] = useState(false);

  function start() {
    const submit = () => {
      setLocating(false);
      // Let React flush the coordinates into the hidden inputs first.
      setTimeout(() => form.current?.requestSubmit(), 0);
    };
    if (!("geolocation" in navigator)) return submit();
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) });
        submit();
      },
      submit,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }

  return (
    <form ref={form} action={action} className="space-y-2">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="lat" value={coords.lat} />
      <input type="hidden" name="lng" value={coords.lng} />
      <button type="button" className="btn-primary" onClick={start} disabled={locating}>
        {locating ? "Getting your location…" : "Check in"}
      </button>
      <p className="text-xs text-slate-500">We record your location at check-in if you allow it.</p>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
