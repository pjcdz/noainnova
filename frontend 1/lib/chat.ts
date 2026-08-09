/**
 * Motor de acompanamiento, por reglas. Corre entero en el dispositivo.
 *
 * Cada turno tiene hasta tres capas:
 *   1. reflejo empatico  — devolver lo que dijo sin evaluarlo
 *   2. repregunta        — una sola, del tema detectado
 *   3. herramientas      — 2-3 opciones, siempre a eleccion de la persona
 *
 * Regla de tono: nunca "deberias", nunca "tenes que". La decision es suya.
 */

import { BY_KEY, type EmotionKey } from "./emotions";
import { detectRisk, normalize } from "./risk";

export type Topic =
  | "trabajo"
  | "vinculos"
  | "soledad"
  | "sueno"
  | "cuerpo"
  | "dinero"
  | "estudio"
  | "general";

const TOPIC_WORDS: Record<Exclude<Topic, "general">, string[]> = {
  trabajo: ["trabajo", "laburo", "jefe", "jefa", "oficina", "renuncia", "despido", "curro", "turno", "cliente", "reunion"],
  vinculos: ["pareja", "novio", "novia", "esposa", "marido", "mama", "papa", "madre", "padre", "familia", "amigo", "amiga", "hermano", "hermana", "hijo", "hija", "discusion", "pelea", "separacion", "divorcio"],
  soledad: ["solo", "sola", "soledad", "nadie", "aislado", "aislada", "vacio", "abandonado", "abandonada"],
  sueno: ["dormir", "sueno", "insomnio", "desvelo", "cansado", "cansada", "agotado", "agotada", "despierto", "madrugada"],
  cuerpo: ["cuerpo", "dolor", "enfermo", "enferma", "salud", "medico", "medica", "panico", "taquicardia", "pecho", "estomago", "comer"],
  dinero: ["plata", "guita", "dinero", "deuda", "alquiler", "sueldo", "cuentas", "llegar a fin de mes", "gastos"],
  estudio: ["facultad", "universidad", "examen", "final", "estudiar", "cursada", "materia", "tesis", "colegio", "escuela"],
};

export function detectTopic(text: string): Topic {
  const t = normalize(text);
  let best: Topic = "general";
  let bestHits = 0;
  for (const [topic, words] of Object.entries(TOPIC_WORDS)) {
    const hits = words.filter((w) => t.includes(w)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = topic as Topic;
    }
  }
  return best;
}

/** Elige de forma determinista: mismo texto, misma respuesta. Nada de
 *  Math.random, que rompe SSR y hace los tests irrepetibles. */
function pick<T>(options: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return options[Math.abs(h) % options.length];
}

const EMPATHY: Record<Topic, string[]> = {
  trabajo: [
    "Que el trabajo te siga ocupando la cabeza fuera del horario cansa de una forma que no se ve.",
    "Sostener algo así todos los días desgasta, aunque de afuera parezca que funciona.",
  ],
  vinculos: [
    "Cuando el roce es con alguien que te importa, duele distinto.",
    "Los vínculos cercanos son los que más nos mueven, para bien y para mal.",
  ],
  soledad: [
    "Sentirse sin nadie a mano es de las cosas más pesadas que hay, y no se arregla con estar rodeado de gente.",
    "Estar solo con esto lo hace más grande de lo que ya es.",
  ],
  sueno: [
    "Dormir mal deja todo lo demás más difícil de sostener. No es que estés flojo, es que venís sin combustible.",
    "El cansancio acumulado tiñe todo. Cuesta separar qué es la situación y qué es no haber descansado.",
  ],
  cuerpo: [
    "Cuando el cuerpo aprieta, la cabeza va atrás. Hacen equipo.",
    "El cuerpo también avisa cosas, aunque a veces lo haga de la peor manera.",
  ],
  dinero: [
    "La preocupación por la plata no se apaga nunca del todo, está de fondo todo el día.",
    "Ese tipo de presión ocupa lugar aunque no estés pensando en eso activamente.",
  ],
  estudio: [
    "La exigencia del estudio tiene ese tema: nunca sentís que alcanza.",
    "Estar midiéndose todo el tiempo agota más que el contenido en sí.",
  ],
  general: [
    "Gracias por escribirlo. Ponerlo en palabras ya es hacer algo con eso.",
    "Te leo. No hace falta que tenga sentido ordenado para que sea real.",
    "Lo que contás tiene peso propio, no hace falta justificarlo.",
  ],
};

const FOLLOW_UP: Record<Topic, string[]> = {
  trabajo: [
    "¿Hay algo puntual del trabajo que se repite, o es más el conjunto?",
    "¿En qué momento del día se te hace más cuesta arriba?",
  ],
  vinculos: [
    "¿Qué te gustaría que esa persona entendiera y todavía no dijiste?",
    "¿Esto que pasó es nuevo o se viene repitiendo?",
  ],
  soledad: [
    "¿Hay alguien con quien alguna vez te resultó fácil hablar, aunque hoy esté lejos?",
    "¿Preferirías compañía ahora, o más bien que alguien sepa cómo estás?",
  ],
  sueno: [
    "¿Qué pasa cuando apagás la luz: no llega el sueño, o te despertás en el medio?",
    "¿Hace cuánto que venís durmiendo así?",
  ],
  cuerpo: [
    "¿Dónde lo sentís exactamente ahora mismo?",
    "¿Aparece en momentos particulares o está bastante todo el tiempo?",
  ],
  dinero: [
    "¿Es una fecha concreta la que te aprieta, o la incertidumbre en general?",
    "¿Hay algo de esto que dependa de una decisión tuya, aunque sea chica?",
  ],
  estudio: [
    "¿Qué pasaría si esta vez no saliera como esperás?",
    "¿Estás midiendo el esfuerzo o solo el resultado?",
  ],
  general: [
    "¿Desde cuándo venís sintiéndolo así?",
    "¿Hay algo que hoy lo hizo más fuerte que otros días?",
    "Si tuvieras que ponerle un nombre a lo que más pesa, ¿cuál sería?",
  ],
};

/** Herramientas por emocion. Concretas, chicas, y planteadas como opciones. */
const TOOLS: Record<EmotionKey, string[]> = {
  alegria: [
    "Anotá en una línea qué lo hizo posible. Sirve para volver a leerlo en un día flojo.",
    "Si hay alguien que tuvo que ver, contárselo suele multiplicarlo.",
    "Fijate si podés dejar algo listo hoy para tu vos de mañana, mientras tenés impulso.",
  ],
  confianza: [
    "Aprovechá el envión para una cosa que venías postergando. Una sola, la más chica.",
    "Escribí qué hiciste vos para llegar acá. No fue casualidad y conviene tenerlo por escrito.",
    "Si hay una conversación pendiente que te da nervios, este puede ser el día.",
  ],
  calma: [
    "Quedate un rato más acá sin llenarlo de tareas. La calma también se entrena.",
    "Fijate qué de hoy te trajo a este estado, para poder repetirlo a propósito.",
    "Buen momento para decidir algo que en caliente no podías pensar.",
  ],
  sorpresa: [
    "Antes de responder, dale un rato. Lo inesperado necesita asentarse.",
    "Separá en dos columnas: qué sabés con certeza y qué estás suponiendo.",
    "Contáselo a alguien en voz alta. Ordena más rápido que pensarlo solo.",
  ],
  tristeza: [
    "Bajá la vara del día a una sola cosa. Que esa cuente como suficiente.",
    "Movete diez minutos, aunque sea caminar hasta la esquina. No arregla nada, pero corre un poco el peso.",
    "Escribile a una persona, sin explicar todo. Alcanza con «hoy ando bajón».",
  ],
  miedo: [
    "Respiración 4-7-8: inhalar 4, sostener 7, soltar 8. Cuatro rondas. Le avisa al cuerpo que puede bajar.",
    "Escribí lo que temés que pase y al lado qué harías si pasara. El plan achica el monstruo.",
    "Anclate en lo que hay ahora: cinco cosas que ves, cuatro que tocás, tres que escuchás.",
  ],
  enojo: [
    "Gastá la energía en el cuerpo antes de usarla en palabras: caminar rápido, subir escaleras, apretar algo.",
    "Escribí el mensaje que querés mandar y no lo mandes hoy. Releelo mañana y decidís.",
    "Preguntate qué límite se cruzó. El enojo casi siempre marca uno.",
  ],
  verguenza: [
    "Contáselo a una sola persona de confianza. La vergüenza se achica cuando sale del encierro.",
    "Escribí qué le dirías a un amigo en tu misma situación, y leelo como si te lo dijeran a vos.",
    "Separá lo que hiciste de lo que sos. Son cosas distintas aunque hoy no lo parezcan.",
  ],
};

/** Lo unico que se dice cuando aparece una senal de riesgo. */
export const RISK_REPLY =
  "Paro acá con lo demás. Lo que acabás de escribir importa más que cualquier otra cosa que estemos hablando, y no quiero que lo atravieses solo. Estas son las tres cosas que podés hacer ahora mismo.";

export type Reply =
  | { kind: "risk" }
  | { kind: "reply"; empathy: string; followUp?: string; tools?: string[]; topic: Topic };

/**
 * @param turn cantidad de mensajes que ya escribio la persona en esta charla.
 *   Turno 1 pregunta; del 2 en adelante ademas ofrece herramientas.
 */
export function respond(
  text: string,
  opts: { emotion?: EmotionKey | null; turn: number },
): Reply {
  if (detectRisk(text)) return { kind: "risk" };

  const topic = detectTopic(text);
  const empathy = pick(EMPATHY[topic], text);
  const emotion = opts.emotion ?? null;

  if (opts.turn <= 1) {
    return { kind: "reply", empathy, followUp: pick(FOLLOW_UP[topic], text), topic };
  }

  const tools = emotion ? TOOLS[emotion] : TOOLS.tristeza;
  return {
    kind: "reply",
    empathy,
    followUp: opts.turn === 2 ? undefined : pick(FOLLOW_UP[topic], text + opts.turn),
    tools: tools.slice(0, 3),
    topic,
  };
}

/** Lo que se ofrece al cerrar un check-in, sin que medie una charla. */
export function toolsFor(emotion: EmotionKey): string[] {
  return TOOLS[emotion];
}

export function openingFor(emotion: EmotionKey, nick: string): string {
  const e = BY_KEY[emotion];
  return `Anotaste ${e.label.toLowerCase()}. ${e.gloss} ¿Querés contarme un poco más, ${nick || "che"}?`;
}
