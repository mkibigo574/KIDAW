"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  style?: React.CSSProperties;
};

// Address input with Australian address suggestions, and a manual fallback for
// addresses the geocoder does not know (new estates, rural properties).
export default function AddressField({
  id,
  label,
  hint,
  value,
  onChange,
  required,
  style,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrap = useRef<HTMLDivElement>(null);
  // Set when a suggestion is chosen, so picking one does not immediately
  // trigger another lookup for the text we just inserted.
  const justPicked = useRef(false);

  useEffect(() => {
    if (manual) return;
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setOpen(true);
        setHighlight(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      setLoading(false);
    };
  }, [value, manual]);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  function pick(address: string) {
    justPicked.current = true;
    onChange(address);
    setOpen(false);
    setSuggestions([]);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="field" style={style} ref={wrap}>
      <label htmlFor={id}>{label}</label>
      {hint && <div className="address-hint">{hint}</div>}
      <div className="address-wrap">
        <input
          id={id}
          className="input"
          required={required}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
        />
        {loading && !manual && <span className="address-spinner">Searching…</span>}

        {open && !manual && (
          <ul className="address-list" id={`${id}-listbox`} role="listbox">
            {suggestions.map((s, i) => (
              <li key={s} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  className={i === highlight ? "address-option is-active" : "address-option"}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(s)}
                >
                  {s}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="address-option address-manual"
                onClick={() => {
                  setManual(true);
                  setOpen(false);
                }}
              >
                Can&apos;t find your address? Click here
              </button>
            </li>
          </ul>
        )}
      </div>
      {manual && (
        <div className="address-hint" style={{ marginTop: 6 }}>
          Type your address in full — suggestions are off.{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => setManual(false)}
          >
            Turn suggestions back on
          </button>
        </div>
      )}
    </div>
  );
}
