/**
 * Deteccion de riesgo.
 *
 * Dos cosas distintas viven aca:
 *
 * 1. `detectRisk(text)` — deteccion inmediata sobre lo que la persona escribe.
 *    Si da positivo, el chat CORTA el flujo normal (nada de tips ni repreguntas)
 *    y abre la hoja de ayuda.
 *
 * 2. `riskLevel(state)` — una lectura acumulada, derivada de los datos, que solo
 *    decide que tan a mano esta el boton de ayuda. NUNCA se le muestra a la
 *    persona como puntaje ni como diagnostico: eso convertiria la app en algo
 *    clinico, que es exactamente lo que el producto quiere evitar.
 */

import { dominant } from "./emotions";
import type { State } from "./store";

/** Sin acentos y en minuscula: la gente escribe "no se" tanto como "no sé". */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Usos figurados del verbo morir/matar. Se BORRAN del texto antes de buscar
 * senales, en vez de descartar el mensaje entero: asi "me muero de verguenza,
 * la verdad me quiero matar" sigue dando positivo por la segunda parte.
 */
const FIGURATIVE =
  /\b(?:me\s+)?(?:quiero\s+)?(?:morir(?:me)?|muero|matar(?:me)?|mata|mato)\s+(?:de|por)\s+(?:la\s+|el\s+|los\s+|las\s+)?(?:verguenza|risa|hambre|sueno|frio|calor|amor|aburrimiento|nervios|ganas|envidia|sed|celos|intriga|curiosidad|emocion|orgullo)\b/g;

const RISK_PATTERNS: RegExp[] = [
  /\bme (?:quiero|voy a) (?:morir|matar)\b/,
  /\bquiero (?:morirme|matarme|desaparecer|dejar de existir)\b/,
  /\bganas de (?:morirme|matarme|desaparecer)\b/,
  /\bno quiero (?:vivir|estar aca|despertar(?:me)?)\b/,
  /\bno quiero seguir (?:vivo|viviendo|aca|mas|asi)\b/,
  /\bno quiero seguir\s*[.!]*$/,
  /\bsuicid/,
  /\bmatarme\b/,
  /\bquitarme la vida\b/,
  /\bterminar con (?:todo|mi vida)\b/,
  /\bacabar con (?:todo|mi vida)\b/,
  /\bno (?:vale la pena|tiene sentido) (?:seguir|vivir|nada)\b/,
  /\bestarian mejor sin mi\b/,
  /\bnadie me va a extranar\b/,
  /\bhacerme (?:dano|mierda)\b/,
  /\b(?:lastimarme|cortarme|autolesion)/,
  /\btomarme (?:todas )?(?:las )?pastillas\b/,
];

export function detectRisk(text: string): boolean {
  const cleaned = normalize(text).replace(FIGURATIVE, " ");
  return RISK_PATTERNS.some((re) => re.test(cleaned));
}

const HEAVY = new Set(["tristeza", "miedo", "verguenza"]);

/** 0 = nada visible · 1-2 = ayuda a mano · 3 = ayuda arriba de todo. */
export function riskLevel(state: State): 0 | 1 | 2 | 3 {
  if (state.riskSignals.includes("chat-risk")) return 3;

  let score = 0;
  const recent = state.checkIns.slice(-5);

  if (!state.profile?.emergencyContact) score += 1;

  const heavyStreak = state.checkIns
    .slice(-3)
    .filter((c) => HEAVY.has(dominant(c.angle).key) && c.intensity > 0.6);
  if (heavyStreak.length === 3) score += 1;

  const sleeps = recent.map((c) => c.sleepHours).filter((h): h is number => h !== null);
  if (sleeps.length >= 3 && sleeps.reduce((a, b) => a + b, 0) / sleeps.length < 5) score += 1;

  const socials = recent.map((c) => c.social).filter((s): s is number => s !== null);
  if (socials.length >= 3 && socials.every((s) => s === 0)) score += 1;

  return Math.min(3, score) as 0 | 1 | 2 | 3;
}
