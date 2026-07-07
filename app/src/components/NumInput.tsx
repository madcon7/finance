'use client';
import { useState, useEffect } from 'react';

interface Props {
  value: string | number;
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

function fmt(v: string | number): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(/,/g, '.'));
  if (!n && n !== 0) return '';
  return new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 2 }).format(n);
}

export default function NumInput({ value, onChange, placeholder = '0', className = '', required }: Props) {
  const [display, setDisplay] = useState(fmt(value));

  useEffect(() => {
    if (value === '' || value === 0) { setDisplay(''); return; }
    setDisplay(fmt(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\s/g, '').replace(/ /g, '');
    // Allow digits, dot, comma
    if (!/^[\d.,]*$/.test(raw)) return;
    const num = raw.replace(',', '.');
    setDisplay(e.target.value);
    onChange(num);
  }

  function handleBlur() {
    const num = String(value).replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(num);
    if (!isNaN(n)) setDisplay(fmt(n));
    else setDisplay('');
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      className={`input ${className}`}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
    />
  );
}
