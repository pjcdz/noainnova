"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Chip } from "@/components/chip";
import { EmotionWheel, type WheelValue } from "@/components/emotion-wheel";
import { HelpSheet } from "@/components/help-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RISK_REPLY, respond } from "@/lib/chat";
import { detectRisk } from "@/lib/risk";
import { APP_NAME, APP_TAGLINE, HELPLINES, HELPLINE_NAME, PRIVACY_NOTE } from "@/lib/config";
import { dominant, nuancesFor } from "@/lib/emotions";
import { EMPTY_PROFILE, addCheckIn, addRiskSignal, update, useStore, type Profile } from "@/lib/store";

const REASONS = [
  "Entender por qué me siento así",
  "Llevar un registro de cómo vengo",
  "Estoy pasando un mal momento",
  "Prepararme para ir a terapia",
  "Me lo recomendó alguien",
  "Curiosidad",
];

const LAST_STEP = 9;

export default function Bienvenida() {
  const router = useRouter();
  const { hydrated, onboarded } = useStore();

  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [skipContact, setSkipContact] = useState(false);
  const [wheel, setWheel] = useState<WheelValue>({ angle: 0, intensity: 0 });
  const [nuances, setNuances] = useState<string[]>([]);
  const [why, setWhy] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [showTools, setShowTools] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (hydrated && onboarded) router.replace("/hoy");
  }, [hydrated, onboarded, router]);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const hasContact = !!profile.emergencyContact?.phone.trim();
  const emotion = dominant(wheel.angle).key;
  const reply = respond(why || "no sé bien", { emotion, turn: 1 });
  const closing = respond(followUpAnswer || why || "", { emotion, turn: 2 });

  /** El riesgo se atiende apenas aparece, tambien durante el onboarding: se
   *  chequea al confirmar cada texto, no mientras la persona escribe. */
  function flagRisk(text: string) {
    if (!detectRisk(text)) return false;
    addRiskSignal("chat-risk");
    setHelpOpen(true);
    return true;
  }

  function finish() {
    // Un contacto a medio cargar no sirve para llamar: se guarda vacio.
    const clean: Profile = { ...profile, emergencyContact: hasContact ? profile.emergencyContact : null };
    update((s) => ({
      onboarded: true,
      profile: clean,
      riskSignals: hasContact ? s.riskSignals : [...s.riskSignals, "no-emergency-contact"],
    }));
    addCheckIn({
      angle: wheel.angle,
      intensity: wheel.intensity,
      nuances,
      why,
      followUp: followUpAnswer,
      activity: "",
      sleepHours: null,
      exerciseMin: null,
      social: null,
    });
    router.replace("/hoy");
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-10">
      {step > 0 && (
        <div className="flex items-center gap-3 py-4">
          <Button variant="ghost" size="icon" aria-label="Volver" onClick={() => setStep(step - 1)}>
            <ArrowLeft />
          </Button>
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={0}
            aria-valuemax={LAST_STEP}
            aria-label="Progreso"
          >
            <div
              className="h-full rounded-full bg-primary motion-safe:transition-all"
              style={{ width: `${(step / LAST_STEP) * 100}%` }}
            />
          </div>
        </div>
      )}

      {step === 0 && (
        <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div
            aria-hidden
            className="size-24 rounded-full"
            style={{
              background:
                "conic-gradient(var(--emo-alegria), var(--emo-confianza), var(--emo-calma), var(--emo-sorpresa), var(--emo-tristeza), var(--emo-miedo), var(--emo-enojo), var(--emo-verguenza), var(--emo-alegria))",
            }}
          />
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight">{APP_NAME}</h1>
            <p className="text-lg text-balance text-muted-foreground">{APP_TAGLINE}</p>
          </div>
          <Button size="lg" className="w-full" onClick={() => setStep(1)}>
            Empezar
          </Button>
          <p className="text-xs text-muted-foreground">{PRIVACY_NOTE}</p>
        </section>
      )}

      {step === 1 && (
        <Step
          title="¿Cómo querés que te llame?"
          hint="Puede ser tu nombre, un apodo o cualquier cosa."
          onNext={() => setStep(2)}
          nextDisabled={!profile.nick.trim()}
        >
          <Input
            autoFocus
            value={profile.nick}
            onChange={(e) => set("nick", e.target.value)}
            placeholder="Tu nombre o apodo"
            className="h-12 text-lg"
          />
        </Step>
      )}

      {step === 2 && (
        <Step title={`Contame un poco de vos, ${profile.nick}`} onNext={() => setStep(3)}>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Género</span>
            <Input
              list="generos"
              value={profile.gender}
              onChange={(e) => set("gender", e.target.value)}
              placeholder="Escribí lo que te represente"
            />
            <datalist id="generos">
              <option value="Mujer" />
              <option value="Varón" />
              <option value="No binarie" />
              <option value="Prefiero no decirlo" />
            </datalist>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Edad</span>
            <Input
              type="number"
              inputMode="numeric"
              min={10}
              max={110}
              value={profile.age ?? ""}
              onChange={(e) => set("age", e.target.value ? Number(e.target.value) : null)}
            />
          </label>
        </Step>
      )}

      {step === 3 && (
        <Step
          title="Altura y peso"
          hint="Los dos son opcionales. Sirven solo para leer mejor los datos de actividad, si después los conectás."
          onNext={() => setStep(4)}
          nextLabel={profile.heightCm || profile.weightKg ? "Seguir" : "Prefiero no decirlo"}
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2">
              <span className="text-sm font-medium">Altura (cm)</span>
              <Input
                type="number"
                inputMode="numeric"
                value={profile.heightCm ?? ""}
                onChange={(e) => set("heightCm", e.target.value ? Number(e.target.value) : null)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Peso (kg)</span>
              <Input
                type="number"
                inputMode="numeric"
                value={profile.weightKg ?? ""}
                onChange={(e) => set("weightKg", e.target.value ? Number(e.target.value) : null)}
              />
            </label>
          </div>
        </Step>
      )}

      {step === 4 && (
        <Step
          title="¿Hay alguien a quien podrías llamar en un mal momento?"
          hint="Queda solo en tu teléfono. Aparece como primer botón cuando pedís ayuda."
          onNext={() => setStep(5)}
          nextLabel={hasContact ? "Seguir" : skipContact ? "Seguir así" : "No tengo a nadie ahora"}
          onNextClick={() => {
            if (hasContact || skipContact) return false;
            setSkipContact(true);
            return true;
          }}
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium">Nombre</span>
            <Input
              value={profile.emergencyContact?.name ?? ""}
              onChange={(e) =>
                set("emergencyContact", {
                  name: e.target.value,
                  phone: profile.emergencyContact?.phone ?? "",
                })
              }
              placeholder="Mamá, Sofi, Dr. Pérez…"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Teléfono</span>
            <Input
              type="tel"
              inputMode="tel"
              value={profile.emergencyContact?.phone ?? ""}
              onChange={(e) =>
                set("emergencyContact", {
                  name: profile.emergencyContact?.name ?? "",
                  phone: e.target.value,
                })
              }
              placeholder="11 5555 5555"
            />
          </label>

          {skipContact && !hasContact && (
            <div className="rounded-xl border border-[var(--emo-calma)] bg-[var(--emo-calma)]/15 p-4">
              <p className="text-sm">
                Está bien. Igual quiero que tengas esto a mano: <strong>{HELPLINE_NAME}</strong>{" "}
                atiende gratis las 24 horas, sin que tengas que explicar nada.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {HELPLINES.map((l) => (
                  <Button key={l.tel} asChild variant="outline" size="lg">
                    <a href={`tel:${l.tel}`}>{l.label}</a>
                  </Button>
                ))}
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() =>
                    set("emergencyContact", { name: HELPLINE_NAME, phone: HELPLINES[1].label })
                  }
                >
                  Guardarla como mi contacto
                </Button>
              </div>
            </div>
          )}
        </Step>
      )}

      {step === 5 && (
        <Step
          title="¿Por qué estás descargando la app?"
          hint="Podés elegir más de una."
          onNext={() => setStep(6)}
        >
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <Chip
                key={r}
                active={profile.reasons.includes(r)}
                onClick={() =>
                  set(
                    "reasons",
                    profile.reasons.includes(r)
                      ? profile.reasons.filter((x) => x !== r)
                      : [...profile.reasons, r],
                  )
                }
              >
                {r}
              </Chip>
            ))}
          </div>
          <Textarea
            value={profile.reasonNote}
            onChange={(e) => set("reasonNote", e.target.value)}
            placeholder="Si querés, contámelo con tus palabras"
            rows={3}
          />
        </Step>
      )}

      {step === 6 && (
        <Step
          title="¿Dónde te ubicás ahora?"
          hint="No hace falta elegir una sola emoción: podés quedarte entre dos. Cuanto más lejos del centro, más fuerte."
          onNext={() => setStep(7)}
          nextDisabled={wheel.intensity < 0.05}
        >
          <EmotionWheel value={wheel} onChange={setWheel} />
        </Step>
      )}

      {step === 7 && (
        <Step
          title="¿Algo de esto se parece a lo que sentís?"
          hint="Todos opcionales. Elegí los que quieras."
          onNext={() => setStep(8)}
          nextLabel={nuances.length ? "Seguir" : "Ninguno en particular"}
        >
          <p className="text-sm text-muted-foreground">{dominant(wheel.angle).gloss}</p>
          <div className="flex flex-wrap gap-2">
            {nuancesFor(wheel.angle).map((n) => (
              <Chip
                key={n}
                active={nuances.includes(n)}
                onClick={() =>
                  setNuances(
                    nuances.includes(n) ? nuances.filter((x) => x !== n) : [...nuances, n],
                  )
                }
              >
                {n}
              </Chip>
            ))}
          </div>
        </Step>
      )}

      {step === 8 && (
        <Step
          title={`¿Por qué creés que te sentís así?`}
          hint="Lo que se te ocurra. Nadie más lo lee."
          onNext={() => setStep(9)}
          onNextClick={() => {
            flagRisk(why);
            return false;
          }}
          nextLabel={why.trim() ? "Seguir" : "Saltear"}
        >
          <Textarea
            autoFocus
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            rows={5}
            placeholder="Hoy…"
          />
        </Step>
      )}

      {step === 9 && (
        <section className="flex flex-1 flex-col gap-5 py-4">
          {/* Si lo que escribio es una senal de riesgo, no hay tips ni
              repreguntas: solo las tres salidas de la hoja de ayuda. */}
          {reply.kind === "risk" && (
            <>
              <Bubble>{RISK_REPLY}</Bubble>
              <Button size="lg" onClick={() => setHelpOpen(true)}>
                Ver qué podés hacer ahora
              </Button>
            </>
          )}

          {reply.kind === "reply" && (
            <>
              <Bubble>{reply.empathy}</Bubble>
              {reply.followUp && (
                <>
                  <Bubble>{reply.followUp}</Bubble>
                  <Textarea
                    value={followUpAnswer}
                    onChange={(e) => setFollowUpAnswer(e.target.value)}
                    rows={3}
                    placeholder="Contestá si querés"
                  />
                </>
              )}
            </>
          )}

          {reply.kind === "reply" && !showTools && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                flagRisk(followUpAnswer);
                setShowTools(true);
              }}
            >
              {followUpAnswer.trim() ? "Listo" : "Prefiero no contestar"}
            </Button>
          )}

          {showTools && closing.kind === "reply" && closing.tools && (
            <div className="space-y-3 rounded-xl border p-4">
              <p className="font-medium">
                Estas son opciones, no indicaciones. ¿Cuál te parece posible hoy?
              </p>
              <ul className="space-y-2">
                {closing.tools.map((t) => (
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
              <p className="text-xs text-muted-foreground">
                Vos decidís qué hacer con esto, incluso nada.
              </p>
            </div>
          )}

          <Button size="lg" className="mt-auto w-full" onClick={finish}>
            Entrar a {APP_NAME}
          </Button>
        </section>
      )}

      <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </main>
  );
}

function Step({
  title,
  hint,
  children,
  onNext,
  onNextClick,
  nextLabel = "Seguir",
  nextDisabled,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  onNext: () => void;
  /** Devolver `true` para quedarse en el paso (el paso maneja el click). */
  onNextClick?: () => boolean;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <section className="flex flex-1 flex-col gap-5 py-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {hint && <p className="text-sm text-muted-foreground text-balance">{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
      <Button
        size="lg"
        className="mt-auto w-full"
        disabled={nextDisabled}
        onClick={() => {
          // Un paso puede querer reaccionar antes de avanzar (p. ej. ofrecer
          // la linea de ayuda cuando no hay contacto de confianza).
          if (onNextClick?.()) return;
          onNext();
        }}
      >
        {nextLabel}
      </Button>
    </section>
  );
}

function Bubble({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-balance">{children}</p>;
}
