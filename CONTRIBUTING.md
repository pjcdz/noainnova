# Cómo contribuir

Anima, en este repositorio, es una demostración estática. Una contribución mejora esas pantallas, la documentación o la propuesta. No agrega una aplicación con Supabase ni un servidor de producto: eso no existe acá.

## Levantar el entorno

Hace falta Git y Python 3.

```bash
git clone https://github.com/pjcdz/noainnova.git
cd noainnova
python3 -m http.server 8000
```

Abrí [http://localhost:8000/frontent-2/index.html](http://localhost:8000/frontent-2/index.html).

Para recorrer la demostración completa, abrí [http://localhost:8000/frontent-2/grupo-9.html](http://localhost:8000/frontent-2/grupo-9.html) y usá las flechas del teclado. El tablero está en `frontent-2/dashboard.html`. La recreación de WhatsApp está en `frontend-3-whatsapp/index.html`.

No hace falta `npm install` ni `supabase start`. Si un cambio solo se ve abriendo el HTML con `file://`, revisalo también con el servidor: los pasajes entre carpetas dependen de eso.

## Ramas

Trabajá en una rama nueva a partir de `main`.

```bash
git checkout main
git pull origin main
git checkout -b descripcion-corta
```

El nombre va en minúsculas, con guiones, y dice qué cambia. Por ejemplo: `aviso-clinico-resumen` o `fix-mapa-opacidad`.

## Commits

Un commit, un cambio. El mensaje está en imperativo y dice qué hace:

```text
Mostrar el aviso clínico en la primera pantalla
```

Si el cambio encaja en el historial reciente, podés usar el prefijo `feat:`, `fix:` o `docs:`. No hace falta forzarlo en un commit que se entiende sin él.

No subas secretos, datos de personas ni archivos generados que no hagan falta para ver la demostración.

## Pull request

Abrí el pull request contra `main` y contá:

1. Qué cambia, en una frase que entienda alguien que no vio el código.
2. Cómo verlo: la URL local y qué hay que pulsar.
3. Capturas, si cambia una pantalla.

El aviso clínico no es un texto decorativo. Si proponés cambiarlo, el texto lo redacta Martín y tiene que estar revisado por un clínico antes de publicarse. Mientras esa revisión no esté, no lo des por cerrado.

## Issues

Usá las plantillas del repositorio.

- Un bug: qué hiciste, qué esperabas y qué viste, y en qué pantalla.
- Una propuesta: qué problema resuelve y a quién afecta.

Una propuesta de producto no se implementa en este repositorio como backend, base de datos o despliegue real. Esas piezas pertenecen a un piloto futuro, no a esta demostración.
