"use client";

import { useRouter } from "next/navigation";

interface SaisonSelektorProps {
  saisons: number[];
  aktuellerScope: number | "all-time";
}

export function SaisonSelektor({ saisons, aktuellerScope }: SaisonSelektorProps) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === "all-time") {
      router.push("/?saison=all-time");
    } else {
      router.push(`/?saison=${value}`);
    }
  }

  const currentValue =
    aktuellerScope === "all-time" ? "all-time" : String(aktuellerScope);

  return (
    <select
      value={currentValue}
      onChange={handleChange}
      className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
      aria-label="Saison auswählen"
    >
      {saisons.map((jahr) => (
        <option key={jahr} value={String(jahr)}>
          Saison {jahr}
        </option>
      ))}
      <option value="all-time">Alle Zeiten</option>
    </select>
  );
}
