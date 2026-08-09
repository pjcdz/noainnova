/**
 * Datos simulados del Observatorio de Salud Mental de Salta.
 *
 * Se expone como global (window.SALTA_DATA) y no como JSON + fetch para que
 * dashboard.html funcione abierto directamente con file:// sin servidor.
 *
 * La división por barrios es esquemática: una grilla deformada sobre la mancha
 * urbana de Salta Capital, con fines ilustrativos. No son límites oficiales.
 */
(function () {
  "use strict";

  // --- PRNG con semilla fija: los números no cambian entre recargas ---

  const mulberry32 = seed => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const hashTexto = texto => {
    let h = 2166136261;
    for (let i = 0; i < texto.length; i += 1) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  const azar = (semilla, indice) => mulberry32(hashTexto(semilla) + indice * 2654435761)();

  const clamp = (valor, min, max) => Math.min(max, Math.max(min, valor));

  const mediana = valores => {
    if (!valores.length) return 0;
    const orden = [...valores].sort((a, b) => a - b);
    const medio = Math.floor(orden.length / 2);
    return orden.length % 2 ? orden[medio] : (orden[medio - 1] + orden[medio]) / 2;
  };

  const percentil = (valores, p) => {
    if (!valores.length) return 0;
    const orden = [...valores].sort((a, b) => a - b);
    const pos = clamp(Math.round((orden.length - 1) * p), 0, orden.length - 1);
    return orden[pos];
  };

  const suma = valores => valores.reduce((total, valor) => total + valor, 0);

  // --- Escala de ánimo, misma que usa la app en index.html ---

  const MOOD_STOPS = [
    { at: 0, label: "Muy desagradable", color: "oklch(0.48 0.20 300)" },
    { at: 20, label: "Desagradable", color: "oklch(0.56 0.18 260)" },
    { at: 50, label: "Neutral", color: "oklch(0.68 0.10 220)" },
    { at: 65, label: "Algo agradable", color: "oklch(0.66 0.18 130)" },
    { at: 82, label: "Agradable", color: "oklch(0.72 0.16 92)" },
    { at: 100, label: "Muy agradable", color: "oklch(0.72 0.18 50)" }
  ];

  const ESTADOS = [
    { id: "muy-desagradable", label: "Muy desagradable", hasta: 14, color: "oklch(0.48 0.20 300)" },
    { id: "desagradable", label: "Desagradable", hasta: 34, color: "oklch(0.56 0.18 260)" },
    { id: "neutral", label: "Neutral", hasta: 55, color: "oklch(0.68 0.10 220)" },
    { id: "algo-agradable", label: "Algo agradable", hasta: 72, color: "oklch(0.66 0.18 130)" },
    { id: "agradable", label: "Agradable", hasta: 88, color: "oklch(0.72 0.16 92)" },
    { id: "muy-agradable", label: "Muy agradable", hasta: 101, color: "oklch(0.72 0.18 50)" }
  ];

  const nombreEstado = valor => (ESTADOS.find(estado => valor < estado.hasta) || ESTADOS[5]).label;

  const CENTROS_ESTADO = [7, 24, 44.5, 63.5, 80, 94];

  /**
   * Reparte los registros de un día entre los seis estados. La mediana diaria de
   * una zona no alcanza para describir la distribución: se dispersa con un núcleo
   * gaussiano centrado en esa mediana para reflejar los registros individuales.
   */
  const pesosEstados = valor => {
    const sigma = 17;
    const pesos = CENTROS_ESTADO.map(centro => Math.exp(-((centro - valor) ** 2) / (2 * sigma * sigma)));
    const total = suma(pesos) || 1;
    return pesos.map(peso => peso / total);
  };

  // --- Geometría: grilla 5 columnas x 4 filas deformada sobre Salta Capital ---

  const BBOX = { norte: -24.728, sur: -24.842, oeste: -65.478, este: -65.368 };
  const COLS = 5;
  const FILAS = 4;

  const pasoLat = (BBOX.sur - BBOX.norte) / FILAS;
  const pasoLon = (BBOX.este - BBOX.oeste) / COLS;

  // Vértices compartidos entre celdas vecinas: la teselación no deja huecos.
  const vertices = [];
  for (let fila = 0; fila <= FILAS; fila += 1) {
    const filaVertices = [];
    for (let col = 0; col <= COLS; col += 1) {
      const bordeVertical = fila === 0 || fila === FILAS;
      const bordeHorizontal = col === 0 || col === COLS;
      const ruidoLat = bordeVertical ? 0 : (azar("lat", fila * 11 + col) - 0.5) * pasoLat * 0.52;
      const ruidoLon = bordeHorizontal ? 0 : (azar("lon", fila * 13 + col) - 0.5) * pasoLon * 0.52;
      // El contorno externo también se ondula para que no parezca un rectángulo.
      const ondaLat = bordeVertical ? (azar("onda-lat", fila * 7 + col) - 0.5) * pasoLat * 0.3 : 0;
      const ondaLon = bordeHorizontal ? (azar("onda-lon", fila * 17 + col) - 0.5) * pasoLon * 0.34 : 0;
      filaVertices.push([
        BBOX.norte + fila * pasoLat + ruidoLat + ondaLat,
        BBOX.oeste + col * pasoLon + ruidoLon + ondaLon
      ]);
    }
    vertices.push(filaVertices);
  }

  /**
   * Barrios por posición en la grilla (fila 0 = norte, columna 0 = oeste).
   * `v` es el índice de vulnerabilidad base (0 = mejor situación, 1 = peor)
   * y ordena toda la historia que cuentan las métricas.
   */
  const BARRIOS = [
    { fila: 0, col: 1, nombre: "El Huaico", sector: "Noroeste", v: 0.74, poblacion: 21400 },
    { fila: 0, col: 2, nombre: "Castañares", sector: "Norte", v: 0.46, poblacion: 33800 },
    { fila: 0, col: 3, nombre: "Grand Bourg", sector: "Norte", v: 0.31, poblacion: 29600 },
    { fila: 0, col: 4, nombre: "Tres Cerritos", sector: "Noreste", v: 0.12, poblacion: 18200 },
    { fila: 1, col: 0, nombre: "Autódromo", sector: "Oeste", v: 0.68, poblacion: 16900 },
    { fila: 1, col: 1, nombre: "Ciudad del Milagro", sector: "Noroeste", v: 0.57, poblacion: 27300 },
    { fila: 1, col: 2, nombre: "Villa Mitre", sector: "Centro norte", v: 0.42, poblacion: 24800 },
    { fila: 1, col: 3, nombre: "20 de Febrero", sector: "Centro", v: 0.27, poblacion: 22100 },
    { fila: 1, col: 4, nombre: "Villa Soledad", sector: "Este", v: 0.63, poblacion: 31500 },
    { fila: 2, col: 0, nombre: "Bella Vista", sector: "Oeste", v: 0.71, poblacion: 19700 },
    { fila: 2, col: 1, nombre: "Villa Cristina", sector: "Suroeste", v: 0.66, poblacion: 23400 },
    { fila: 2, col: 2, nombre: "Centro", sector: "Centro", v: 0.24, poblacion: 41200 },
    { fila: 2, col: 3, nombre: "Villa Las Rosas", sector: "Sureste", v: 0.58, poblacion: 38900 },
    { fila: 2, col: 4, nombre: "Miguel Ortiz", sector: "Sureste", v: 0.49, poblacion: 20600 },
    { fila: 3, col: 0, nombre: "Intersindical", sector: "Suroeste", v: 0.83, poblacion: 26800 },
    { fila: 3, col: 1, nombre: "Limache", sector: "Sur", v: 0.61, poblacion: 34700 },
    { fila: 3, col: 2, nombre: "Solidaridad", sector: "Sur", v: 0.92, poblacion: 43100 },
    { fila: 3, col: 3, nombre: "Santa Ana", sector: "Sur", v: 0.79, poblacion: 30500 }
  ];

  const idZona = nombre =>
    nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const poligono = (fila, col) => {
    const [nw, ne, se, sw] = [
      vertices[fila][col],
      vertices[fila][col + 1],
      vertices[fila + 1][col + 1],
      vertices[fila + 1][col]
    ];
    // GeoJSON usa [lon, lat] y el anillo se cierra repitiendo el primer punto.
    return [[nw, ne, se, sw, nw].map(([lat, lon]) => [lon, lat])];
  };

  // --- Definición de las métricas del mapa ---

  const METRICAS = [
    {
      id: "riesgo",
      label: "Índice de riesgo",
      corto: "Riesgo",
      descripcion: "Índice compuesto de señales tempranas (ánimo, sueño, actividad y variabilidad cardíaca).",
      unidad: "/100",
      decimales: 0,
      mejorAlto: false,
      rampa: "riesgo",
      tipo: "mediana"
    },
    {
      id: "animo",
      label: "Mediana de estado de ánimo",
      corto: "Estado de ánimo",
      descripcion: "Mediana de los registros de ánimo autoinformados en la app.",
      unidad: "/100",
      decimales: 0,
      mejorAlto: true,
      rampa: "animo",
      tipo: "mediana"
    },
    {
      id: "sueno",
      label: "Mediana de horas de sueño",
      corto: "Sueño",
      descripcion: "Horas de sueño por noche sincronizadas desde Apple Health o Samsung Health.",
      unidad: " h",
      decimales: 1,
      mejorAlto: true,
      rampa: "riesgo",
      tipo: "mediana"
    },
    {
      id: "ejercicio",
      label: "Mediana de minutos de ejercicio",
      corto: "Ejercicio",
      descripcion: "Minutos diarios de actividad física registrados por el dispositivo.",
      unidad: " min",
      decimales: 0,
      mejorAlto: true,
      rampa: "riesgo",
      tipo: "mediana"
    },
    {
      id: "conciencia",
      label: "Mediana de minutos de conciencia",
      corto: "Conciencia",
      descripcion: "Minutos diarios de respiración consciente o meditación.",
      unidad: " min",
      decimales: 1,
      mejorAlto: true,
      rampa: "riesgo",
      tipo: "mediana"
    },
    {
      id: "sol",
      label: "Mediana de exposición al sol",
      corto: "Exposición al sol",
      descripcion: "Minutos diarios de luz solar, asociados a la regulación del ánimo.",
      unidad: " min",
      decimales: 0,
      mejorAlto: true,
      rampa: "riesgo",
      tipo: "mediana"
    },
    {
      id: "ansiedad",
      label: "Población con ansiedad elevada",
      corto: "Ansiedad",
      descripcion: "Porcentaje con variabilidad de frecuencia cardíaca compatible con ansiedad sostenida.",
      unidad: "%",
      decimales: 1,
      mejorAlto: false,
      rampa: "riesgo",
      tipo: "mediana"
    },
    {
      id: "alertas",
      label: "Alertas tempranas por 10.000 hab.",
      corto: "Alertas tempranas",
      descripcion: "Alertas accionables generadas antes de que la persona llegue a una consulta de guardia. Tasa mensual.",
      unidad: "",
      decimales: 1,
      mejorAlto: false,
      rampa: "riesgo",
      tipo: "tasa",
      campo: "alertas",
      base: 10000,
      ventana: 30
    },
    {
      id: "cobertura",
      label: "Cobertura: registros por 1.000 hab.",
      corto: "Cobertura",
      descripcion: "Volumen de registros recibidos, en tasa anual. Una cobertura baja significa que la zona está poco monitoreada.",
      unidad: "",
      decimales: 0,
      mejorAlto: true,
      rampa: "cobertura",
      tipo: "tasa",
      campo: "registros",
      base: 1000,
      ventana: 365
    }
  ];

  // --- Filtros ---

  const PERIODOS = [
    { id: "S", label: "S", nombre: "Última semana", dias: 7 },
    { id: "M", label: "M", nombre: "Último mes", dias: 30 },
    { id: "6M", label: "6 M", nombre: "Últimos 6 meses", dias: 182 },
    { id: "A", label: "A", nombre: "Último año", dias: 365 }
  ];

  const EDADES = [
    { id: "todas", label: "Todas las edades", peso: 1, animo: 0, ansiedad: 1, riesgo: 1, sueno: 1, ejercicio: 1, conciencia: 1, sol: 1 },
    { id: "13-17", label: "13 a 17", peso: 0.17, animo: -7.5, ansiedad: 1.34, riesgo: 1.22, sueno: 0.94, ejercicio: 1.12, conciencia: 0.72, sol: 0.88 },
    { id: "18-24", label: "18 a 24", peso: 0.26, animo: -5.2, ansiedad: 1.26, riesgo: 1.15, sueno: 0.92, ejercicio: 1.05, conciencia: 0.85, sol: 0.94 },
    { id: "25-39", label: "25 a 39", peso: 0.34, animo: 1.4, ansiedad: 0.95, riesgo: 0.93, sueno: 1.02, ejercicio: 0.98, conciencia: 1.12, sol: 1.04 },
    { id: "40+", label: "40 y más", peso: 0.23, animo: 3.8, ansiedad: 0.82, riesgo: 0.86, sueno: 1.06, ejercicio: 0.84, conciencia: 1.28, sol: 1.11 }
  ];

  const SEXOS = [
    { id: "todos", label: "Todos", peso: 1, animo: 0, ansiedad: 1, riesgo: 1, sueno: 1, ejercicio: 1, conciencia: 1, sol: 1 },
    { id: "f", label: "Mujeres", peso: 0.54, animo: -2.4, ansiedad: 1.18, riesgo: 1.06, sueno: 1.01, ejercicio: 0.9, conciencia: 1.14, sol: 0.96 },
    { id: "m", label: "Varones", peso: 0.44, animo: 1.6, ansiedad: 0.85, riesgo: 0.95, sueno: 0.98, ejercicio: 1.11, conciencia: 0.87, sol: 1.05 },
    { id: "x", label: "Otras identidades", peso: 0.02, animo: -9.1, ansiedad: 1.46, riesgo: 1.31, sueno: 0.93, ejercicio: 0.95, conciencia: 1.02, sol: 0.92 }
  ];

  // --- Serie diaria por zona (365 días) ---

  const HOY = new Date(2026, 7, 9);
  const DIAS = 365;

  const fechaDe = indice => {
    const fecha = new Date(HOY);
    fecha.setDate(fecha.getDate() - (DIAS - 1 - indice));
    return fecha;
  };

  const fechas = Array.from({ length: DIAS }, (_, indice) => fechaDe(indice));

  // Invierno en Salta (junio a agosto): menos sol y ánimo más bajo.
  const estacional = fecha => {
    const inicio = new Date(fecha.getFullYear(), 0, 1);
    const diaDelAnio = Math.floor((fecha - inicio) / 86400000);
    return Math.cos(((diaDelAnio - 182) / 365) * Math.PI * 2);
  };

  const construirZona = barrio => ({
    type: "Feature",
    id: idZona(barrio.nombre),
    properties: {
      id: idZona(barrio.nombre),
      nombre: barrio.nombre,
      sector: barrio.sector,
      poblacion: barrio.poblacion,
      vulnerabilidad: barrio.v
    },
    geometry: { type: "Polygon", coordinates: poligono(barrio.fila, barrio.col) }
  });

  const construirSerie = barrio => {
    const id = idZona(barrio.nombre);
    const v = barrio.v;
    const serie = [];
    for (let dia = 0; dia < DIAS; dia += 1) {
      const fecha = fechas[dia];
      const estacion = estacional(fecha);
      const finDeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
      const tendencia = (dia / DIAS) * (v > 0.55 ? -3.4 : 1.1);
      const ruido = (clave, amplitud) => (azar(`${id}-${clave}`, dia) - 0.5) * amplitud;

      // El ánimo cae los lunes y repunta el fin de semana.
      const ritmoAnimo = finDeSemana ? 2.6 : fecha.getDay() === 1 ? -2.1 : 0;
      const animo = clamp(69 - 31 * v + tendencia - estacion * 5.4 + ritmoAnimo + ruido("animo", 13), 4, 97);
      const sueno = clamp(7.9 - 1.9 * v + (finDeSemana ? 0.6 : 0) + ruido("sueno", 1.1), 3.9, 9.6);
      const ejercicio = clamp(44 - 31 * v + estacion * 6 + (finDeSemana ? 7 : 0) + ruido("ejercicio", 17), 0, 96);
      const conciencia = clamp(12.6 - 11.2 * v + ruido("conciencia", 5), 0, 26);
      const sol = clamp(92 - 62 * v + estacion * 21 + ruido("sol", 26), 4, 168);
      const ansiedad = clamp(8.4 + 30 * v - estacion * 2.6 + ruido("ansiedad", 7), 2, 58);
      const riesgo = clamp(
        0.42 * (100 - animo) + 0.24 * ansiedad + 0.18 * (100 - Math.min(100, ejercicio * 2.1)) + 0.16 * ((8.2 - sueno) * 13) + ruido("riesgo", 6),
        3,
        99
      );
      const cobertura = clamp(302 - 214 * v + (dia / DIAS) * 46 + ruido("cobertura", 34), 18, 420);
      // La gente registra más el fin de semana y menos a mitad de semana.
      const ritmoRegistros = (finDeSemana ? 1.19 : fecha.getDay() === 1 ? 1.07 : 0.94) * (0.78 + azar(`${id}-vol`, dia) * 0.44);
      const registros = Math.max(1, Math.round((((barrio.poblacion / 1000) * cobertura) / 365) * ritmoRegistros));
      const alertas = Math.max(0, Math.round(((barrio.poblacion / 10000) * (4.2 + 33 * v + ruido("alertas", 9))) / 30));

      serie.push({
        fecha,
        animo,
        sueno,
        ejercicio,
        conciencia,
        sol,
        ansiedad,
        riesgo,
        cobertura,
        registros,
        alertas
      });
    }
    return serie;
  };

  const zonas = { type: "FeatureCollection", features: BARRIOS.map(construirZona) };

  const series = {};
  BARRIOS.forEach(barrio => {
    series[idZona(barrio.nombre)] = construirSerie(barrio);
  });

  const poblacionTotal = suma(BARRIOS.map(barrio => barrio.poblacion));

  // --- Agregación según filtros ---

  const ajustePara = (metricaId, edad, sexo) => {
    if (metricaId === "animo") return { suma: edad.animo + sexo.animo, factor: 1 };
    const factorEdad = edad[metricaId] === undefined ? 1 : edad[metricaId];
    const factorSexo = sexo[metricaId] === undefined ? 1 : sexo[metricaId];
    return { suma: 0, factor: factorEdad * factorSexo };
  };

  const aplicar = (valor, metricaId, edad, sexo) => {
    const { suma: sumar, factor } = ajustePara(metricaId, edad, sexo);
    const ajustado = valor * factor + sumar;
    if (metricaId === "animo" || metricaId === "riesgo") return clamp(ajustado, 1, 99);
    return Math.max(0, ajustado);
  };

  // atras = 1 devuelve el período actual, atras = 2 el inmediatamente anterior.
  const rebanada = (serie, dias, atras) => {
    const fin = serie.length - dias * (atras - 1);
    return serie.slice(Math.max(0, fin - dias), Math.max(0, fin));
  };

  // Las tasas se normalizan a una ventana fija (mensual o anual según la métrica)
  // para que el valor sea comparable entre los períodos S, M, 6 M y A.
  const valorMetrica = (metrica, tramo, barrio, edad, sexo) => {
    if (metrica.tipo === "tasa") {
      if (!tramo.length) return 0;
      const total = suma(tramo.map(dia => dia[metrica.campo]));
      const bruto = ((total / tramo.length) * metrica.ventana * metrica.base) / barrio.poblacion;
      return aplicar(bruto, metrica.id, edad, sexo);
    }
    return aplicar(mediana(tramo.map(dia => dia[metrica.id])), metrica.id, edad, sexo);
  };

  const buscarBarrio = id => BARRIOS.find(barrio => idZona(barrio.nombre) === id);

  /**
   * Devuelve todo lo que el dashboard necesita para un set de filtros:
   * valores por zona, totales provinciales, comparación con el período previo,
   * serie temporal agregada y los cortes de Estados / Asociaciones / Factores.
   */
  const agregado = ({ periodo = "M", edad = "todas", sexo = "todos" } = {}) => {
    const def = PERIODOS.find(item => item.id === periodo) || PERIODOS[1];
    const defEdad = EDADES.find(item => item.id === edad) || EDADES[0];
    const defSexo = SEXOS.find(item => item.id === sexo) || SEXOS[0];
    const escalaPoblacion = defEdad.peso * defSexo.peso;

    const porZona = {};
    const porZonaPrevio = {};

    BARRIOS.forEach(barrio => {
      const id = idZona(barrio.nombre);
      const serie = series[id];
      const actual = rebanada(serie, def.dias, 1);
      const previo = rebanada(serie, def.dias, 2);
      const valores = {};
      const valoresPrevios = {};

      METRICAS.forEach(metrica => {
        valores[metrica.id] = valorMetrica(metrica, actual, barrio, defEdad, defSexo);
        valoresPrevios[metrica.id] = previo.length
          ? valorMetrica(metrica, previo, barrio, defEdad, defSexo)
          : valores[metrica.id];
      });

      valores.registros = Math.round(suma(actual.map(dia => dia.registros)) * escalaPoblacion);
      valores.alertasTotales = Math.round(suma(actual.map(dia => dia.alertas)) * escalaPoblacion);
      valores.poblacionMonitoreada = Math.round(barrio.poblacion * escalaPoblacion * (0.14 + 0.26 * (1 - barrio.v)));
      valoresPrevios.registros = Math.round(suma(previo.map(dia => dia.registros)) * escalaPoblacion);
      valoresPrevios.alertasTotales = Math.round(suma(previo.map(dia => dia.alertas)) * escalaPoblacion);

      valores.tendencia = actual
        .filter((_, indice) => indice % Math.max(1, Math.floor(actual.length / 14)) === 0)
        .map(dia => aplicar(dia.riesgo, "riesgo", defEdad, defSexo));

      porZona[id] = valores;
      porZonaPrevio[id] = valoresPrevios;
    });

    const ids = Object.keys(porZona);
    const pesoDe = id => porZona[id].poblacionMonitoreada;
    const pesoTotal = suma(ids.map(pesoDe));

    const promedioPonderado = (fuente, metricaId) =>
      pesoTotal ? suma(ids.map(id => fuente[id][metricaId] * pesoDe(id))) / pesoTotal : 0;

    const provincia = {};
    const provinciaPrevio = {};
    METRICAS.forEach(metrica => {
      provincia[metrica.id] = promedioPonderado(porZona, metrica.id);
      provinciaPrevio[metrica.id] = promedioPonderado(porZonaPrevio, metrica.id);
    });

    provincia.registros = suma(ids.map(id => porZona[id].registros));
    provinciaPrevio.registros = suma(ids.map(id => porZonaPrevio[id].registros));
    provincia.alertasTotales = suma(ids.map(id => porZona[id].alertasTotales));
    provinciaPrevio.alertasTotales = suma(ids.map(id => porZonaPrevio[id].alertasTotales));
    provincia.poblacionMonitoreada = suma(ids.map(id => porZona[id].poblacionMonitoreada));
    provinciaPrevio.poblacionMonitoreada = provincia.poblacionMonitoreada;

    // Serie temporal agregada de toda la ciudad, ponderada por población.
    const largo = def.dias;
    const serieAgregada = [];
    for (let indice = 0; indice < largo; indice += 1) {
      let animo = 0;
      let riesgo = 0;
      let registros = 0;
      let alertas = 0;
      let peso = 0;
      let negativoRegistros = 0;
      let fecha = null;

      BARRIOS.forEach(barrio => {
        const id = idZona(barrio.nombre);
        const tramo = rebanada(series[id], largo, 1);
        const dia = tramo[indice];
        if (!dia) return;
        const pesoBarrio = barrio.poblacion;
        fecha = dia.fecha;
        const animoDia = aplicar(dia.animo, "animo", defEdad, defSexo);
        animo += animoDia * pesoBarrio;
        riesgo += aplicar(dia.riesgo, "riesgo", defEdad, defSexo) * pesoBarrio;
        registros += dia.registros;
        alertas += dia.alertas;
        peso += pesoBarrio;
        // % de registros del día en los estados "desagradable" o "muy desagradable".
        const [muyDesagradable, desagradable] = pesosEstados(animoDia);
        negativoRegistros += (muyDesagradable + desagradable) * dia.registros;
      });

      if (!peso || !fecha) continue;
      serieAgregada.push({
        fecha,
        animo: animo / peso,
        negativo: registros ? (negativoRegistros / registros) * 100 : 0,
        riesgo: riesgo / peso,
        registros: Math.round(registros * escalaPoblacion),
        alertas: Math.round(alertas * escalaPoblacion)
      });
    }

    // Estados: distribución de los registros de ánimo, ponderada por volumen.
    const conteoEstados = ESTADOS.map(estado => ({ ...estado, valor: 0 }));
    BARRIOS.forEach(barrio => {
      const id = idZona(barrio.nombre);
      rebanada(series[id], def.dias, 1).forEach(dia => {
        const valor = aplicar(dia.animo, "animo", defEdad, defSexo);
        pesosEstados(valor).forEach((peso, indice) => {
          conteoEstados[indice].valor += dia.registros * peso;
        });
      });
    });
    const totalEstados = suma(conteoEstados.map(estado => estado.valor)) || 1;
    const estados = conteoEstados.map(estado => ({
      ...estado,
      porcentaje: (estado.valor / totalEstados) * 100
    }));
    // Estados 0 y 1 = "muy desagradable" y "desagradable": ánimo bajo.
    provincia.negativo = estados[0].porcentaje + estados[1].porcentaje;

    // Estados por grupo etario, para el desglose de la pestaña.
    const estadosPorEdad = EDADES.filter(item => item.id !== "todas").map(grupo => {
      const conteo = ESTADOS.map(() => 0);
      BARRIOS.forEach(barrio => {
        const id = idZona(barrio.nombre);
        rebanada(series[id], def.dias, 1).forEach(dia => {
          const valor = aplicar(dia.animo, "animo", grupo, defSexo);
          pesosEstados(valor).forEach((peso, indice) => {
            conteo[indice] += dia.registros * peso;
          });
        });
      });
      const total = suma(conteo) || 1;
      return {
        id: grupo.id,
        label: grupo.label,
        tramos: ESTADOS.map((estado, indice) => ({
          ...estado,
          porcentaje: (conteo[indice] / total) * 100
        }))
      };
    });

    // Asociaciones: factores de impacto que elige la gente al registrar.
    const asociaciones = FACTORES_IMPACTO.map((factor, indice) => {
      const ruido = azar(`asoc-${factor.nombre}-${periodo}-${edad}-${sexo}`, indice);
      const frecuencia = clamp(factor.base + (ruido - 0.5) * 9, 3, 72);
      const animoMedio = clamp(
        provincia.animo + factor.impacto + (azar(`animo-${factor.nombre}`, indice) - 0.5) * 6,
        6,
        94
      );
      return {
        nombre: factor.nombre,
        grupo: factor.grupo,
        frecuencia,
        registros: Math.round((provincia.registros * frecuencia) / 100),
        animoMedio,
        estado: nombreEstado(animoMedio)
      };
    }).sort((a, b) => b.frecuencia - a.frecuencia);

    // Factores de vida: valor observado y correlación con el ánimo.
    const factores = FACTORES_VIDA.map((factor, indice) => {
      const valor = provincia[factor.metrica];
      const previoValor = provinciaPrevio[factor.metrica];
      const correlacion = clamp(
        factor.correlacion + (azar(`corr-${factor.id}-${periodo}`, indice) - 0.5) * 0.08,
        -0.95,
        0.95
      );
      return {
        id: factor.id,
        label: factor.label,
        metrica: factor.metrica,
        unidad: factor.unidad,
        decimales: factor.decimales,
        valor,
        delta: previoValor ? ((valor - previoValor) / previoValor) * 100 : 0,
        correlacion,
        lectura: factor.lectura
      };
    }).sort((a, b) => Math.abs(b.correlacion) - Math.abs(a.correlacion));

    const zonasPriorizadas = ids
      .map(id => {
        const barrio = buscarBarrio(id);
        const valores = porZona[id];
        const previoValores = porZonaPrevio[id];
        return {
          id,
          nombre: barrio.nombre,
          sector: barrio.sector,
          poblacion: barrio.poblacion,
          poblacionMonitoreada: valores.poblacionMonitoreada,
          riesgo: valores.riesgo,
          deltaRiesgo: valores.riesgo - previoValores.riesgo,
          alertas: valores.alertasTotales,
          tendencia: valores.tendencia,
          accion: accionSugerida(valores, barrio)
        };
      })
      .sort((a, b) => b.riesgo - a.riesgo);

    // Días entre la primera señal detectada y el contacto del equipo territorial.
    const diasHastaContacto = clamp(11.4 - (provincia.cobertura / 300) * 5.2, 2.4, 14);
    const diasHastaContactoPrevio = clamp(11.4 - (provinciaPrevio.cobertura / 300) * 5.2, 2.4, 14);

    return {
      periodo: def,
      edad: defEdad,
      sexo: defSexo,
      porZona,
      porZonaPrevio,
      provincia: { ...provincia, diasHastaContacto },
      provinciaPrevio: { ...provinciaPrevio, diasHastaContacto: diasHastaContactoPrevio },
      serie: serieAgregada,
      estados,
      estadosPorEdad,
      asociaciones,
      factores,
      zonasPriorizadas
    };
  };

  const accionSugerida = (valores, barrio) => {
    if (valores.riesgo >= 44) return "Dispositivo territorial de crisis";
    if (valores.cobertura < 175) return "Campaña de adopción de la app";
    if (valores.ansiedad >= 26) return "Talleres de manejo de ansiedad";
    if (valores.sueno < 6.8) return "Programa de higiene del sueño";
    if (barrio.v > 0.5) return "Seguimiento reforzado en escuelas";
    return "Monitoreo de rutina";
  };

  // Mismos grupos de factores que ofrece la app al registrar (index.html).
  const FACTORES_IMPACTO = [
    { nombre: "Salud", grupo: "Personal", base: 41, impacto: -6 },
    { nombre: "Actividad física", grupo: "Personal", base: 27, impacto: 8 },
    { nombre: "Autocuidado", grupo: "Personal", base: 24, impacto: 7 },
    { nombre: "Pasatiempos", grupo: "Personal", base: 22, impacto: 9 },
    { nombre: "Identidad", grupo: "Personal", base: 14, impacto: -4 },
    { nombre: "Espiritualidad", grupo: "Personal", base: 12, impacto: 6 },
    { nombre: "Comunidad", grupo: "Vínculos", base: 19, impacto: 5 },
    { nombre: "Familia", grupo: "Vínculos", base: 48, impacto: -3 },
    { nombre: "Amistades", grupo: "Vínculos", base: 37, impacto: 7 },
    { nombre: "Pareja", grupo: "Vínculos", base: 31, impacto: -5 },
    { nombre: "Citas", grupo: "Vínculos", base: 11, impacto: 2 },
    { nombre: "Tareas", grupo: "Contexto", base: 34, impacto: -7 },
    { nombre: "Trabajo", grupo: "Contexto", base: 52, impacto: -9 },
    { nombre: "Estudios", grupo: "Contexto", base: 44, impacto: -11 },
    { nombre: "Viajes", grupo: "Contexto", base: 9, impacto: 10 },
    { nombre: "Clima", grupo: "Contexto", base: 16, impacto: -2 },
    { nombre: "Actualidad", grupo: "Contexto", base: 21, impacto: -8 },
    { nombre: "Dinero", grupo: "Contexto", base: 57, impacto: -14 }
  ];

  const FACTORES_VIDA = [
    {
      id: "ejercicio",
      label: "Minutos de ejercicio",
      metrica: "ejercicio",
      unidad: " min",
      decimales: 0,
      correlacion: 0.62,
      lectura: "Quienes superan los 30 min diarios reportan un ánimo 14 puntos más alto."
    },
    {
      id: "sueno",
      label: "Sueño",
      metrica: "sueno",
      unidad: " h",
      decimales: 1,
      correlacion: 0.58,
      lectura: "Dormir menos de 6 h se asocia al doble de alertas tempranas."
    },
    {
      id: "sol",
      label: "Tiempo de exposición al sol",
      metrica: "sol",
      unidad: " min",
      decimales: 0,
      correlacion: 0.41,
      lectura: "La caída de luz solar en invierno acompaña el descenso del ánimo."
    },
    {
      id: "conciencia",
      label: "Minutos de conciencia",
      metrica: "conciencia",
      unidad: " min",
      decimales: 1,
      correlacion: 0.34,
      lectura: "Efecto moderado, pero constante en todos los grupos etarios."
    },
    {
      id: "ansiedad",
      label: "Ansiedad sostenida",
      metrica: "ansiedad",
      unidad: "%",
      decimales: 1,
      correlacion: -0.71,
      lectura: "Es la señal fisiológica que más anticipa una crisis."
    }
  ];

  window.SALTA_DATA = {
    meta: {
      centro: [-24.7859, -65.4117],
      zoom: 12.6,
      poblacionTotal,
      tasaSuicidio: 17.4,
      promedioNacional: 6.7,
      horasEntreCasos: 36,
      actualizado: HOY
    },
    metricas: METRICAS,
    periodos: PERIODOS,
    edades: EDADES,
    sexos: SEXOS,
    estadosEscala: ESTADOS,
    moodStops: MOOD_STOPS,
    zonas,
    series,
    nombreEstado,
    agregado
  };
})();
