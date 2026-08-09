# Keyboard Presentation Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Conectar las ocho etapas de la presentacion y permitir avanzar o retroceder siempre con las flechas derecha e izquierda.

**Architecture:** Un script compartido ubicado en `frontent-2` define la secuencia completa, identifica el paso actual por URL y fragmento, captura el teclado en fase `capture` y navega el contexto superior despues de una salida animada. Cada HTML carga ese script; WhatsApp distingue sus dos apariciones mediante `#post-consent`.

**Tech Stack:** HTML estatico, CSS existente, JavaScript del navegador, Web Animations API.

---

### Task 1: Crear el controlador compartido

**Files:**
- Create: `presentation-flow.js`

**Step 1: Definir rutas desde la ubicacion real del script**

Usar `document.currentScript.src` para obtener la raiz de `frontent-2` y construir URLs con `new URL()`. Esto evita rutas relativas diferentes segun la carpeta de cada HTML.

La secuencia sera:

```js
const steps = [
  new URL("grupo-9.html", appRoot),
  new URL("presentacion.html", appRoot),
  new URL("mood-splash.html", appRoot),
  new URL("frontend-3-whatsapp/index.html", repositoryRoot),
  new URL("frontent-2-extention/index.html", repositoryRoot),
  new URL("dashboard.html", appRoot),
  new URL("frontend-3-whatsapp/index.html#post-consent", repositoryRoot),
  new URL("index.html", appRoot)
];
```

**Step 2: Identificar el paso actual**

Comparar `location.pathname` normalizado. Para WhatsApp, tratar `#post-consent` como el paso 7 y cualquier otro fragmento como el paso 4.

**Step 3: Implementar navegacion animada**

Crear `navigateTo(stepIndex)` con estas reglas:

```js
if (isTransitioning || stepIndex < 0 || stepIndex >= steps.length) return;
isTransitioning = true;
```

Animar el documento actual con Web Animations API:

```js
document.documentElement.animate(
  [
    { opacity: 1, filter: "blur(0)", transform: "scale(1)" },
    { opacity: 0, filter: "blur(3px)", transform: "scale(0.985)" }
  ],
  {
    duration: reduceMotion.matches ? 80 : 260,
    easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    fill: "forwards"
  }
)
```

Al terminar, asignar la URL a `window.top.location.href`; usar `window.location.href` como alternativa si el acceso al contexto superior falla.

**Step 4: Capturar las flechas globalmente**

Registrar `keydown` sobre `window` con `capture: true`. Para `ArrowRight` y `ArrowLeft`:

```js
if (event.repeat) return;
event.preventDefault();
event.stopImmediatePropagation();
```

Luego llamar a `navigateTo(currentStep + 1)` o `navigateTo(currentStep - 1)`. No excluir botones, enlaces, inputs ni otros controles enfocados.

### Task 2: Cargar el controlador en las pantallas de `frontent-2`

**Files:**
- Modify: `grupo-9.html`
- Modify: `presentacion.html`
- Modify: `mood-splash.html`
- Modify: `dashboard.html`
- Modify: `index.html`

**Step 1: Agregar el script compartido**

Agregar antes de `</body>` en cada archivo:

```html
<script src="presentation-flow.js" defer></script>
```

**Step 2: Corregir el avance tactil desde presentacion**

En `presentacion.html`, cambiar el destino existente:

```js
window.location.href = "mood-splash.html";
```

**Step 3: Corregir el avance por espacio desde mood splash**

En `mood-splash.html`, cambiar el destino existente:

```js
window.location.href = "../frontend-3-whatsapp/index.html";
```

Esto conserva los controles existentes, pero los alinea con el nuevo orden.

### Task 3: Cargar el controlador en WhatsApp y HealthApp

**Files:**
- Modify: `../frontend-3-whatsapp/index.html`
- Modify: `../frontent-2-extention/index.html`

**Step 1: Integrar WhatsApp**

Agregar antes de `</body>`:

```html
<script src="../frontent-2/presentation-flow.js" defer></script>
```

El controlador resolvera el estado inicial y `#post-consent` como pasos distintos sin duplicar el archivo.

**Step 2: Integrar HealthApp**

Agregar antes de `</body>`:

```html
<script src="../frontent-2/presentation-flow.js" defer></script>
```

Los botones existentes de permitir o rechazar no se eliminan ni se reemplazan.

### Task 4: Comprobar el recorrido completo

**Files:**
- Test: los siete HTML integrados en un navegador

**Step 1: Comprobar avance**

Abrir `grupo-9.html` y pulsar `ArrowRight` una vez por pantalla. El orden esperado es:

```text
grupo-9 -> presentacion -> mood-splash -> WhatsApp -> HealthApp
-> dashboard -> WhatsApp#post-consent -> Anima
```

**Step 2: Comprobar retroceso**

Desde Anima, pulsar `ArrowLeft` hasta volver a Grupo 9. No debe depender del historial previo del navegador.

**Step 3: Comprobar prioridad del teclado**

Enfocar enlaces y botones en WhatsApp, HealthApp y Dashboard. Las flechas deben seguir cambiando de etapa y no deben activar el control enfocado.

**Step 4: Comprobar limites y repeticion**

- `ArrowLeft` en Grupo 9 no navega.
- `ArrowRight` en Anima no navega.
- Mantener una flecha presionada no salta varias pantallas.

**Step 5: Comprobar movimiento reducido**

Activar `prefers-reduced-motion: reduce` y repetir una transicion. Debe completarse con una salida minima de 80 ms.

La validacion se ejecutara solo con autorizacion explicita del usuario.
