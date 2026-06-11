#!/usr/bin/env bash
# Copia (ficheiros REAIS, nao symlinks — o deploy nao os seguiria) os recortes
# masked/ achatados e o crop_geometry.json para o public/ do repo de producao.
set -euo pipefail
cd "$(dirname "$0")/public"

mkdir -p masked
count=0
for d in ../../crops/*/masked; do
  stem=$(basename "$(dirname "$d")")
  for f in "$d"/*.jpg; do
    [ -e "$f" ] || continue
    cp -n "$f" "masked/${stem}_$(basename "$f")"
    count=$((count + 1))
  done
done
echo "masked copiados: $count"

cp -f ../../cluster_annotator_v2/public/crop_geometry.json .
echo "crop_geometry.json copiado"
