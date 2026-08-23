"use client";

import { useState } from "react";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  style?: React.CSSProperties;
};

// Password input with a show/hide toggle, so members can check what they typed.
export default function PasswordField({
  id,
  label,
  value,
  onChange,
  required,
  minLength,
  placeholder,
  style,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field" style={style}>
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className="input"
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={visible}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
