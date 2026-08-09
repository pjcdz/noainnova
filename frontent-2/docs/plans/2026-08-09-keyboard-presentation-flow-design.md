# Flujo de presentacion con teclado

## Objetivo

Convertir las pantallas HTML existentes en una presentacion lineal navegable con las flechas izquierda y derecha, sin romper los controles actuales ni perder las transiciones visuales.

## Secuencia

1. `frontent-2/grupo-9.html`
2. `frontent-2/presentacion.html`
3. `frontent-2/mood-splash.html`
4. `frontend-3-whatsapp/index.html`
5. `frontent-2-extention/index.html`
6. `frontent-2/dashboard.html`
7. `frontend-3-whatsapp/index.html#post-consent`
8. `frontent-2/index.html`

El primer y el segundo paso de WhatsApp comparten el mismo archivo. El fragmento `#post-consent` identifica el segundo estado.

## Navegacion

- `ArrowRight` avanza al paso siguiente.
- `ArrowLeft` vuelve al paso anterior.
- Las flechas se capturan antes que los controles internos, incluso cuando el foco esta en un boton o enlace.
- Se ignoran eventos repetidos para impedir que una pulsacion larga salte varios pasos.
- `ArrowLeft` no hace nada en el primer paso.
- `ArrowRight` no hace nada en el ultimo paso.
- La navegacion usa un mapa explicito de rutas y no depende del historial del navegador.

## Animacion

- Al avanzar se reutilizan las transiciones existentes de cada pantalla cuando estan disponibles.
- Al retroceder se aplica una salida breve equivalente antes de cargar el paso anterior.
- Con `prefers-reduced-motion: reduce` se usa una transicion minima o inmediata.
- Se bloquean entradas adicionales mientras una transicion esta en curso.

## Compatibilidad

- Los clics, botones y enlaces actuales siguen funcionando.
- El controlador de teclado no modifica el contenido visual de cada pantalla.
- La navegacion funciona aunque la presentacion se abra directamente en un paso intermedio.
- Las rutas relativas consideran que WhatsApp y HealthApp viven en proyectos hermanos de `frontent-2`.

## Criterios de aceptacion

- La secuencia completa puede recorrerse hacia adelante solo con `ArrowRight`.
- La secuencia completa puede recorrerse hacia atras solo con `ArrowLeft`.
- Las flechas funcionan con un elemento interactivo enfocado.
- WhatsApp inicial y WhatsApp posterior al consentimiento se resuelven como pasos diferentes.
- Mantener una flecha presionada no salta pantallas.
- Los controles con mouse o tactiles existentes no dejan de funcionar.
