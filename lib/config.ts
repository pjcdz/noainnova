export const APP_NAME = "Ánima";
export const APP_TAGLINE = "Un espacio para entender cómo te sentís, día a día";

/** Centro de Asistencia al Suicida (Argentina). Dos números, misma línea, 24 h, gratis. */
export const HELPLINES = [
  { label: "135", tel: "135", note: "desde CABA y GBA, gratis" },
  { label: "0800 345 1435", tel: "08003451435", note: "desde todo el país" },
] as const;

export const HELPLINE_NAME = "Centro de Asistencia al Suicida";

/** Se muestra donde se piden datos sensibles. */
export const PRIVACY_NOTE =
  "Todo lo que escribís queda guardado solo en este dispositivo. No se envía a ningún servidor.";
