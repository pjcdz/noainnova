"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const PHASES = [
  { label: "Inhalá por la nariz", seconds: 4, scale: 1 },
  { label: "Sostené el aire", seconds: 7, scale: 1 },
  { label: "Soltá por la boca, despacio", seconds: 8, scale: 0.55 },
] as const;

const GROUNDING = [
  "5 cosas que ves",
  "4 cosas que podés tocar",
  "3 cosas que escuchás",
  "2 cosas que olés",
  "1 cosa que podés saborear",
];

/** Respiracion 4-7-8 y anclaje 5-4-3-2-1. La unica opcion de la hoja de ayuda
 *  que no requiere hablar con nadie. */
export function Breathing() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState<number>(PHASES[0].seconds);
  const [rounds, setRounds] = useState(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((t) => {
        if (t > 1) return t - 1;
        const next = (phaseRef.current + 1) % PHASES.length;
        phaseRef.current = next;
        setPhase(next);
        if (next === 0) setRounds((r) => r + 1);
        return PHASES[next].seconds;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const current = PHASES[phase];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-44 w-44 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full bg-[var(--emo-calma)] opacity-40 motion-safe:transition-transform motion-safe:duration-[3500ms] motion-safe:ease-in-out motion-reduce:scale-100"
          style={{ transform: `scale(${running ? current.scale : 0.8})` }}
        />
        <div className="relative text-center">
          <p className="text-4xl font-semibold tabular-nums">{running ? left : "4-7-8"}</p>
          {running && <p className="text-xs text-muted-foreground">ronda {rounds + 1}</p>}
        </div>
      </div>

      <p aria-live="polite" className="min-h-6 text-center font-medium">
        {running ? current.label : "Cuatro rondas alcanzan para que el cuerpo empiece a bajar."}
      </p>

      <Button
        variant={running ? "outline" : "default"}
        onClick={() => {
          if (running) {
            setRunning(false);
            setPhase(0);
            phaseRef.current = 0;
            setLeft(PHASES[0].seconds);
            setRounds(0);
          } else {
            setRunning(true);
          }
        }}
      >
        {running ? "Parar" : "Empezar a respirar"}
      </Button>

      <div className="w-full rounded-lg bg-muted/60 p-4">
        <p className="mb-2 text-sm font-medium">Si preferís anclarte en lo que hay acá:</p>
        <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          {GROUNDING.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
