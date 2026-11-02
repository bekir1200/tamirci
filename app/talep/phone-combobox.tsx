"use client";

import { useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type Props = { label: string; name: string; value: string; onChange: (value: string) => void; options: string[]; placeholder: string; maxLength: number };

export function PhoneCombobox({ label, name, value, onChange, options, placeholder, maxLength }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const filtered = options.filter((option) => option.toLocaleLowerCase("tr-TR").includes(value.trim().toLocaleLowerCase("tr-TR"))).slice(0, 30);
  function choose(option: string) { onChange(option); setOpen(false); setActive(-1); }

  return <div className="request-field">
    <label htmlFor={id}>{label}</label>
    <div className="phone-combobox" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActive(-1); } }}>
      <input id={id} name={name} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && active >= 0 && active < filtered.length ? `${id}-option-${active}` : undefined} value={value} onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onKeyDown={(event) => {
        if (event.key === "ArrowDown" && filtered.length) { event.preventDefault(); setOpen(true); setActive((current) => Math.min(current + 1, filtered.length - 1)); }
        else if (event.key === "ArrowUp" && filtered.length) { event.preventDefault(); setOpen(true); setActive((current) => Math.max(current - 1, 0)); }
        else if (event.key === "Enter" && open && active >= 0 && filtered[active]) { event.preventDefault(); choose(filtered[active]); }
        else if (event.key === "Escape") { setOpen(false); setActive(-1); }
      }} placeholder={placeholder} autoComplete="off" maxLength={maxLength} required />
      <button type="button" className="phone-combobox-toggle" aria-label={`${label} listesini ${open ? "kapat" : "aç"}`} tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={(event) => { const input = event.currentTarget.parentElement?.querySelector("input"); input?.focus(); setOpen(!open); setActive(-1); }}><ChevronDown size={19} aria-hidden="true" /></button>
      {open && <div className="phone-combobox-menu"><ul id={`${id}-list`} role="listbox" aria-label={`${label} önerileri`}>{filtered.map((option, index) => <li key={option} id={`${id}-option-${index}`} role="option" aria-selected={option === value} className={index === active ? "is-active" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}><span>{option}</span>{option === value && <Check size={17} aria-hidden="true" />}</li>)}</ul>{filtered.length === 0 && <p className="phone-combobox-empty">Listede yoksa yazmaya devam edebilirsin.</p>}</div>}
    </div>
  </div>;
}
