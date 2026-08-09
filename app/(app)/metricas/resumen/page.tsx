"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/config";
import { describe, dominant, moodScore } from "@/lib/emotions";
import { dayKey, todayKey, useStore } from "@/lib/store";

const SOCIAL_LABELS = ["nada", "poco", "algo", "bastante"];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayKey(d.toISOString());
}

export default function Resumen() {
  const { profile, checkIns, messages } = useStore();
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(todayKey());
  const [includeChat, setIncludeChat] = useState(false);

  const rows = checkIns.filter((c) => dayKey(c.at) >= from && dayKey(c.at) <= to);
  const scores = rows.map((c) => moodScore(c.angle, c.intensity));
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const counts = new Map<string, number>();
  for (const c of rows) {
    const label = dominant(c.angle).label;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="no-print space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Resumen para tu psicólogo</h1>
        <p className="text-sm text-muted-foreground">
          Elegí el período y tocá imprimir. En el diálogo del navegador podés elegir «Guardar como
          PDF».
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2">
            <span className="text-sm font-medium">Desde</span>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Hasta</span>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeChat}
            onChange={(e) => setIncludeChat(e.target.checked)}
            className="size-4"
          />
          Incluir también la conversación del chat
        </label>
        <p className="text-xs text-muted-foreground">
          Por defecto el chat queda afuera: suele ser lo más íntimo de la app.
        </p>
        <Button size="lg" className="w-full" onClick={() => window.print()}>
          <Printer /> Imprimir o guardar como PDF
        </Button>
      </div>

      <article className="space-y-6 text-sm">
        <header className="space-y-1 border-b pb-4">
          <h2 className="text-lg font-semibold">Registro emocional · {APP_NAME}</h2>
          <p>
            {profile?.nick}
            {profile?.age ? `, ${profile.age} años` : ""}
            {profile?.occupation ? ` · ${profile.occupation}` : ""}
          </p>
          <p className="text-muted-foreground">
            Período {from} a {to} · generado el {todayKey()}
          </p>
        </header>

        <section className="space-y-1">
          <h3 className="font-semibold">Resumen</h3>
          <p>{rows.length} registros en el período.</p>
          {avg !== null && (
            <p>
              Ánimo promedio {avg} sobre 100 (50 es neutro; 0 el peor estado posible y 100 el
              mejor).
            </p>
          )}
          {top.length > 0 && (
            <p>Emociones más frecuentes: {top.map(([l, n]) => `${l} (${n})`).join(", ")}.</p>
          )}
        </section>

        {rows.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-semibold">Registros</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-3 font-medium">Fecha</th>
                    <th className="py-2 pr-3 font-medium">Estado</th>
                    <th className="py-2 pr-3 font-medium">Ánimo</th>
                    <th className="py-2 pr-3 font-medium">Sueño</th>
                    <th className="py-2 pr-3 font-medium">Ejercicio</th>
                    <th className="py-2 pr-3 font-medium">Contacto</th>
                    <th className="py-2 font-medium">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="border-b align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {new Date(c.at).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </td>
                      <td className="py-2 pr-3">
                        {describe(c.angle, c.intensity)}
                        {c.nuances.length > 0 && ` (${c.nuances.join(", ")})`}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{moodScore(c.angle, c.intensity)}</td>
                      <td className="py-2 pr-3">{c.sleepHours ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {c.exerciseMin === null ? "—" : `${c.exerciseMin} min`}
                      </td>
                      <td className="py-2 pr-3">
                        {c.social === null ? "—" : SOCIAL_LABELS[c.social]}
                      </td>
                      <td className="py-2">{[c.why, c.followUp, c.activity].filter(Boolean).join(" · ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {includeChat && messages.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-semibold">Conversación</h3>
            <ul className="space-y-1">
              {messages.map((m, i) => (
                <li key={`${m.at}-${i}`}>
                  <strong>{m.role === "user" ? profile?.nick || "Yo" : "App"}:</strong> {m.text}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="border-t pt-4 text-xs text-muted-foreground">
          Estos datos son autorreportados por la persona usuaria de {APP_NAME}. No constituyen una
          evaluación clínica ni un diagnóstico.
        </footer>
      </article>
    </div>
  );
}
