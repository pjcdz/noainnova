"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRIVACY_NOTE } from "@/lib/config";
import { HEALTH_SOURCES, sampleHealth } from "@/lib/health";
import { EMPTY_PROFILE, reset, update, useStore, type Profile } from "@/lib/store";

export default function Perfil() {
  const router = useRouter();
  const { profile, health, checkIns } = useStore();
  const [draft, setDraft] = useState<Profile>(profile ?? EMPTY_PROFILE);
  const [saved, setSaved] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setDraft((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  function save() {
    const phone = draft.emergencyContact?.phone.trim();
    update({
      profile: { ...draft, emergencyContact: phone ? draft.emergencyContact : null },
    });
    setSaved(true);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Tu perfil</h1>

      <section className="space-y-4">
        <Labelled label="¿Cómo querés que te llame?">
          <Input value={draft.nick} onChange={(e) => set("nick", e.target.value)} />
        </Labelled>
        <Labelled label="¿A qué te dedicás?">
          <Input
            value={draft.occupation}
            onChange={(e) => set("occupation", e.target.value)}
            placeholder="Trabajo, estudio, cuidados, buscando…"
          />
        </Labelled>
        <div className="grid grid-cols-3 gap-3">
          <Labelled label="Edad">
            <Input
              type="number"
              inputMode="numeric"
              value={draft.age ?? ""}
              onChange={(e) => set("age", e.target.value ? Number(e.target.value) : null)}
            />
          </Labelled>
          <Labelled label="Altura (cm)">
            <Input
              type="number"
              inputMode="numeric"
              value={draft.heightCm ?? ""}
              onChange={(e) => set("heightCm", e.target.value ? Number(e.target.value) : null)}
            />
          </Labelled>
          <Labelled label="Peso (kg)">
            <Input
              type="number"
              inputMode="numeric"
              value={draft.weightKg ?? ""}
              onChange={(e) => set("weightKg", e.target.value ? Number(e.target.value) : null)}
            />
          </Labelled>
        </div>
        <Labelled label="Género">
          <Input value={draft.gender} onChange={(e) => set("gender", e.target.value)} />
        </Labelled>
      </section>

      <section id="contacto" className="space-y-4 scroll-mt-20">
        <div>
          <h2 className="font-medium">Contacto de confianza</h2>
          <p className="text-sm text-muted-foreground">
            Es el primer botón que aparece cuando pedís ayuda.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Labelled label="Nombre">
            <Input
              value={draft.emergencyContact?.name ?? ""}
              onChange={(e) =>
                set("emergencyContact", {
                  name: e.target.value,
                  phone: draft.emergencyContact?.phone ?? "",
                })
              }
            />
          </Labelled>
          <Labelled label="Teléfono">
            <Input
              type="tel"
              inputMode="tel"
              value={draft.emergencyContact?.phone ?? ""}
              onChange={(e) =>
                set("emergencyContact", {
                  name: draft.emergencyContact?.name ?? "",
                  phone: e.target.value,
                })
              }
            />
          </Labelled>
        </div>
      </section>

      <Button size="lg" className="w-full" onClick={save}>
        {saved ? (
          <>
            <Check /> Guardado
          </>
        ) : (
          "Guardar cambios"
        )}
      </Button>

      <section className="space-y-4">
        <div>
          <h2 className="font-medium">Datos de actividad</h2>
          <p className="text-sm text-muted-foreground">
            {health
              ? `${health.length} días cargados.`
              : "Todavía no conectaste nada. También podés saltearlo."}
          </p>
        </div>

        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer font-medium">
            ¿Por qué es importante que conectes?
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Dormir, moverse y ver gente son las tres cosas que más mueven el ánimo. Si esos datos
            entran solos, podés ver el patrón sin tener que anotar nada a mano.
          </p>
        </details>

        <div className="flex flex-wrap gap-2">
          {HEALTH_SOURCES.map((s) => (
            <Button key={s.id} variant="outline" onClick={() => update({ health: sampleHealth() })}>
              {s.label}
            </Button>
          ))}
          {health && (
            <Button variant="ghost" onClick={() => update({ health: null })}>
              Quitar
            </Button>
          )}
        </div>
        <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          Aviso honesto: esta versión es solo front-end. Apple Health y Samsung Health no le dan
          sus datos a una web, así que los tres botones cargan una serie de ejemplo para que veas
          cómo se vería.
        </p>
      </section>

      <section className="space-y-3 border-t pt-6">
        <p className="text-xs text-muted-foreground">{PRIVACY_NOTE}</p>
        {confirmWipe ? (
          <div className="space-y-3 rounded-xl border border-destructive p-4">
            <p className="text-sm">
              Se van a borrar tu perfil, tus {checkIns.length} registros y la conversación. No se
              puede deshacer.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  reset();
                  router.replace("/bienvenida");
                }}
              >
                Sí, borrar todo
              </Button>
              <Button variant="ghost" onClick={() => setConfirmWipe(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="text-destructive" onClick={() => setConfirmWipe(true)}>
            <Trash2 /> Borrar todos mis datos
          </Button>
        )}
      </section>
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
