"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Suggestion = { placeId: string; text: string };

/**
 * US address picker backed by /api/places/autocomplete. Submits only the
 * Google place id (and a session token); the server resolves the state from
 * Places, so a typed state is never trusted.
 */
export default function AddressAutocomplete({
  name,
  label,
  defaultText = "",
  required,
}: {
  name: string;
  label: string;
  defaultText?: string;
  required?: boolean;
}) {
  const sessionToken = useMemo(() => crypto.randomUUID(), []);
  const [text, setText] = useState(defaultText);
  const [placeId, setPlaceId] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const skipNext = useRef(true);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/places/autocomplete?q=${encodeURIComponent(text)}&session=${sessionToken}`,
          { signal: controller.signal },
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Address lookup failed");
        setSuggestions(body.suggestions);
        setError(null);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Address lookup failed");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, sessionToken]);

  return (
    <div className="relative">
      <label htmlFor={`${name}-text`} className="label">
        {label}
      </label>
      <input
        id={`${name}-text`}
        className="input"
        autoComplete="off"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPlaceId("");
        }}
        placeholder="Start typing an address"
        required={required}
      />
      <input type="hidden" name={`${name}_place_id`} value={placeId} />
      <input type="hidden" name={`${name}_session`} value={sessionToken} />
      {suggestions.length > 0 && !placeId && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                className="block w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  skipNext.current = true;
                  setText(s.text);
                  setPlaceId(s.placeId);
                  setSuggestions([]);
                }}
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {text && !placeId && !error && suggestions.length === 0 && text !== defaultText && (
        <p className="mt-1 text-xs text-slate-500">Pick an address from the list.</p>
      )}
    </div>
  );
}
