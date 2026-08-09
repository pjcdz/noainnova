"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { colorFor, describe, dominant, moodScore } from "@/lib/emotions";
import { dayKey, useStore, type CheckIn } from "@/lib/store";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split(" ");

/** Con menos de esto, cualquier "patron" seria ruido. */
const MIN_FOR_PATTERNS = 5;

export default function Metricas() {
  const { checkIns } = useStore();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, CheckIn[]>();
    for (const c of checkIns) {
      const k = dayKey(c.at);
      map.set(k, [...(map.get(k) ?? []), c]);
    }
    return map;
  }, [checkIns]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;

  const selectedEntries = selected ? (byDay.get(selected) ?? []) : [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Cómo venís</h1>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mes anterior"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronLeft />
          </Button>
          <h2 className="font-medium">
            {MONTHS[month]} {year}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mes siguiente"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="pb-1 text-center text-xs text-muted-foreground">
              {d}
            </div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const entries = byDay.get(key) ?? [];
            // El registro mas intenso es el que representa al dia.
            const main = entries.reduce<CheckIn | null>(
              (best, c) => (!best || c.intensity > best.intensity ? c : best),
              null,
            );
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(selected === key ? null : key)}
                aria-pressed={selected === key}
                aria-label={
                  main
                    ? `${day}: ${describe(main.angle, main.intensity)}`
                    : `${day}: sin registro`
                }
                className="aspect-square rounded-lg border text-center text-[11px] leading-tight aria-pressed:ring-2 aria-pressed:ring-ring"
                style={main ? { background: colorFor(main.angle, main.intensity) } : undefined}
              >
                <span className="block pt-1 font-medium">{day}</span>
                {/* El codigo de dos letras hace que el dia se lea sin depender del color. */}
                {main && <span className="block opacity-80">{dominant(main.angle).short}</span>}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="rounded-xl border p-4">
            <h3 className="mb-2 font-medium">
              {new Date(`${selected}T12:00:00`).toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
            {selectedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin registros ese día.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {selectedEntries.map((c) => (
                  <li key={c.id}>
                    <span className="font-medium">{describe(c.angle, c.intensity)}</span>
                    {c.nuances.length > 0 && (
                      <span className="text-muted-foreground"> · {c.nuances.join(", ")}</span>
                    )}
                    {c.why && <p className="text-muted-foreground">{c.why}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <Patterns checkIns={checkIns} />

      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href="/metricas/resumen">
          <FileDown /> Exportar resumen para mi psicólogo
        </Link>
      </Button>
    </div>
  );
}

type Group = { label: string; scores: number[] };

function group(checkIns: CheckIn[], pick: (c: CheckIn) => string | null): Group[] {
  const map = new Map<string, number[]>();
  for (const c of checkIns) {
    const k = pick(c);
    if (k === null) continue;
    map.set(k, [...(map.get(k) ?? []), moodScore(c.angle, c.intensity)]);
  }
  return [...map].map(([label, scores]) => ({ label, scores }));
}

const SOCIAL_LABELS = ["Sin contacto", "Poco contacto", "Algo de contacto", "Bastante contacto"];

function Patterns({ checkIns }: { checkIns: CheckIn[] }) {
  if (checkIns.length < MIN_FOR_PATTERNS) {
    return (
      <section className="rounded-xl border border-dashed p-5 text-center">
        <p className="font-medium">Todavía no hay suficiente para ver patrones</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Van {checkIns.length} de {MIN_FOR_PATTERNS} registros. Con menos que eso, cualquier
          conclusión sería inventada.
        </p>
      </section>
    );
  }

  const blocks = [
    {
      title: "Ánimo según cuánto dormiste",
      order: ["Menos de 6 h", "Entre 6 y 8 h", "Más de 8 h"],
      groups: group(checkIns, (c) =>
        c.sleepHours === null
          ? null
          : c.sleepHours < 6
            ? "Menos de 6 h"
            : c.sleepHours <= 8
              ? "Entre 6 y 8 h"
              : "Más de 8 h",
      ),
    },
    {
      title: "Ánimo según si te moviste",
      order: ["Sin moverte", "Hasta 30 min", "Más de 30 min"],
      groups: group(checkIns, (c) =>
        c.exerciseMin === null
          ? null
          : c.exerciseMin === 0
            ? "Sin moverte"
            : c.exerciseMin <= 30
              ? "Hasta 30 min"
              : "Más de 30 min",
      ),
    },
    {
      title: "Ánimo según el contacto con otra gente",
      order: SOCIAL_LABELS,
      groups: group(checkIns, (c) => (c.social === null ? null : SOCIAL_LABELS[c.social])),
    },
  ];

  return (
    <div className="space-y-7">
      {blocks.map((b) => {
        const rows = b.order
          .map((label) => b.groups.find((g) => g.label === label))
          .filter((g): g is Group => !!g);
        if (rows.length < 2) return null;
        return (
          <section key={b.title} className="space-y-3">
            <h2 className="font-medium">{b.title}</h2>
            <div className="space-y-2.5">
              {rows.map((r) => (
                <Bar
                  key={r.label}
                  label={r.label}
                  value={Math.round(r.scores.reduce((a, x) => a + x, 0) / r.scores.length)}
                  n={r.scores.length}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              0 es el peor ánimo posible, 100 el mejor, 50 es neutro. Entre paréntesis, cuántos
              registros hay en cada grupo.
            </p>
          </section>
        );
      })}
    </div>
  );
}

/** Barra 0-100 con marca de neutro en 50. Un solo tono, deliberadamente
 *  distinto de los colores de las emociones: aca la magnitud es el dato. */
function Bar({ label, value, n }: { label: string; value: number; n: number }) {
  return (
    <div className="grid grid-cols-[9rem_1fr_3.5rem] items-center gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="relative h-3.5 rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: `${value}%` }}
        />
        <div
          aria-hidden
          className="absolute inset-y-[-3px] left-1/2 w-px bg-foreground/35"
          title="neutro"
        />
      </div>
      <span className="tabular-nums">
        {value} <span className="text-xs text-muted-foreground">({n})</span>
      </span>
    </div>
  );
}
