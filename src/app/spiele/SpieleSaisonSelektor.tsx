"use client";

import { useRouter } from "next/navigation";

interface SpieleSaisonSelektorProps {
  saisons: number[];
  aktuellesSaisonJahr: number;
}

export function SpieleSaisonSelektor({
  saisons,
  aktuellesSaisonJahr,
}: SpieleSaisonSelektorProps) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    router.push(`/spiele?saison=${value}`);
  }

  return (
    <select
      value={String(aktuellesSaisonJahr)}
      onChange={handleChange}
      className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
      aria-label="Saison auswählen"
    >
      {saisons.map((jahr) => (
        <option key={jahr} value={String(jahr)}>
          Saison {jahr}
        </option>
      ))}
    </select>
  );
}
