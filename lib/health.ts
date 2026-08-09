/**
 * Datos de salud de ejemplo.
 *
 * Apple Health y Samsung Health no exponen sus datos a una web: hace falta una
 * app nativa. Los tres botones de importacion cargan esta serie y la pantalla
 * lo dice de frente, en vez de simular una conexion que no existe.
 */

import type { HealthDay } from "./store";

/** Generador con semilla: mismo resultado en servidor y cliente. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function sampleHealth(days = 60, from = new Date()): HealthDay[] {
  const rand = rng(20260808);
  const out: HealthDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(from);
    d.setDate(d.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    out.push({
      date: d.toISOString().slice(0, 10),
      sleepHours: Math.round((weekend ? 7.4 : 6.3) * 10 + rand() * 22 - 11) / 10,
      steps: Math.round((weekend ? 4200 : 7100) + rand() * 4500),
      restingHr: Math.round(58 + rand() * 12),
    });
  }
  return out;
}

export const HEALTH_SOURCES = [
  { id: "apple", label: "Apple Health" },
  { id: "samsung", label: "Samsung Health" },
  { id: "csv", label: "Archivo CSV" },
] as const;
