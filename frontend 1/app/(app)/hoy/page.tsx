"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Chip } from "@/components/chip";
import { EmotionWheel, type WheelValue } from "@/components/emotion-wheel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toolsFor } from "@/lib/chat";
import { colorFor, describe, dominant, nuancesFor } from "@/lib/emotions";
import {
  addCheckIn,
  checkInsOn,
  replaceCheckIn,
  todayKey,
  useStore,
  type CheckIn,
} from "@/lib/store";

const EXERCISE = [
  { label: "Nada", value: 0 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 h o más", value: 60 },
];

const SOCIAL = ["Nada", "Poco", "Algo", "Bastante"];

type Draft = Omit<CheckIn, "id" | "at">;

const BLANK: Draft = {
  angle: 0,
  intensity: 0,
  nuances: [],
  why: "",
  followUp: "",
  activity: "",
  sleepHours: null,
  exerciseMin: null,
  social: null,
};

export default function Hoy() {
  const { profile, checkIns } = useStore();
  const today = checkInsOn(checkIns, todayKey());

  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(
    today.length ? null : { id: null, draft: BLANK },
  );
  const [justSaved, setJustSaved] = useState<Draft | null>(null);

  if (!editing) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Ya registraste {today.length === 1 ? "un momento" : `${today.length} momentos`} hoy
        </h1>

        {justSaved && <Tools draft={justSaved} />}

        <ul className="space-y-3">
          {today.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-xl border p-4">
              <span
                aria-hidden
                className="mt-1 size-4 shrink-0 rounded-full"
                style={{ background: colorFor(c.angle, c.intensity) }}
              />
              <div className="flex-1">
                <p className="font-medium">{describe(c.angle, c.intensity)}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(c.at).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {c.nuances.length > 0 && ` · ${c.nuances.join(", ")}`}
                </p>
                {c.why && <p className="mt-2 text-sm">{c.why}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Editar este registro"
                onClick={() => setEditing({ id: c.id, draft: { ...c } })}
              >
                <Pencil />
              </Button>
            </li>
          ))}
        </ul>

        <Button
          variant="outline"
          className="w-full"
          size="lg"
          onClick={() => {
            setJustSaved(null);
            setEditing({ id: null, draft: BLANK });
          }}
        >
          <Plus /> Registrar otro momento
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Lo que sentís cambia durante el día. Podés anotar todas las veces que quieras.
        </p>
      </div>
    );
  }

  const { id, draft } = editing;
  const setDraft = (patch: Partial<Draft>) =>
    setEditing({ id, draft: { ...draft, ...patch } });
  const wheel: WheelValue = { angle: draft.angle, intensity: draft.intensity };

  function save() {
    if (id) replaceCheckIn(id, draft);
    else addCheckIn(draft);
    setJustSaved(draft);
    setEditing(null);
  }

  return (
    <div className="space-y-7">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">
        {id ? "Editar el registro" : `Hola${profile?.nick ? `, ${profile.nick}` : ""}. ¿Dónde te ubicás ahora?`}
      </h1>

      <EmotionWheel value={wheel} onChange={(v) => setDraft(v)} />

      {draft.intensity >= 0.05 && (
        <>
          <Field label="¿Algo de esto se parece?" hint={dominant(draft.angle).gloss}>
            <div className="flex flex-wrap gap-2">
              {nuancesFor(draft.angle).map((n) => (
                <Chip
                  key={n}
                  active={draft.nuances.includes(n)}
                  onClick={() =>
                    setDraft({
                      nuances: draft.nuances.includes(n)
                        ? draft.nuances.filter((x) => x !== n)
                        : [...draft.nuances, n],
                    })
                  }
                >
                  {n}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="¿Por qué creés que te sentís así?">
            <Textarea
              value={draft.why}
              onChange={(e) => setDraft({ why: e.target.value })}
              rows={3}
              placeholder="Opcional"
            />
          </Field>

          <Field label="¿Qué hiciste o qué vas a hacer hoy?">
            <Textarea
              value={draft.activity}
              onChange={(e) => setDraft({ activity: e.target.value })}
              rows={2}
              placeholder="Opcional"
            />
          </Field>

          <Field
            label="¿Cuánto dormiste?"
            hint={draft.sleepHours === null ? "Sin dato" : `${draft.sleepHours} h`}
          >
            <input
              type="range"
              min={0}
              max={12}
              step={0.5}
              value={draft.sleepHours ?? 7}
              onChange={(e) => setDraft({ sleepHours: Number(e.target.value) })}
              className="w-full accent-[var(--emo-calma)]"
              aria-label="Horas de sueño"
              aria-valuetext={draft.sleepHours === null ? "sin dato" : `${draft.sleepHours} horas`}
            />
            {draft.sleepHours !== null && (
              <Button variant="ghost" size="sm" onClick={() => setDraft({ sleepHours: null })}>
                No sé / no quiero anotarlo
              </Button>
            )}
          </Field>

          <Field label="¿Te moviste hoy?">
            <div className="flex flex-wrap gap-2">
              {EXERCISE.map((e) => (
                <Chip
                  key={e.value}
                  active={draft.exerciseMin === e.value}
                  onClick={() =>
                    setDraft({ exerciseMin: draft.exerciseMin === e.value ? null : e.value })
                  }
                >
                  {e.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="¿Cuánto contacto tuviste con otra gente?">
            <div className="flex flex-wrap gap-2">
              {SOCIAL.map((s, i) => (
                <Chip
                  key={s}
                  active={draft.social === i}
                  onClick={() => setDraft({ social: draft.social === i ? null : i })}
                >
                  {s}
                </Chip>
              ))}
            </div>
          </Field>
        </>
      )}

      <div className="flex gap-3">
        {today.length > 0 && (
          <Button variant="ghost" size="lg" onClick={() => setEditing(null)}>
            Cancelar
          </Button>
        )}
        <Button
          size="lg"
          className="flex-1"
          disabled={draft.intensity < 0.05}
          onClick={save}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-medium">{label}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Tools({ draft }: { draft: Draft }) {
  const emotion = dominant(draft.angle).key;
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="font-medium">Por si te sirve, algunas opciones para hoy</p>
      <ul className="space-y-2">
        {toolsFor(emotion).map((t) => (
          <li key={t} className="flex gap-2 text-sm">
            <span
              aria-hidden
              className="mt-2 size-1.5 shrink-0 rounded-full"
              style={{ background: `var(--emo-${emotion})` }}
            />
            {t}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Elegís vos. También está bien no hacer nada.</p>
    </div>
  );
}
