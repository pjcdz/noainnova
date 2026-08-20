#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v tectonic >/dev/null 2>&1; then
  echo "Error: tectonic no está instalado." >&2
  echo "En macOS: brew install tectonic" >&2
  exit 127
fi

if [[ "${1:-}" == "--offline" ]]; then
  tectonic -C main.tex
else
  tectonic main.tex
fi
echo "PDF generado: $(pwd)/main.pdf"
