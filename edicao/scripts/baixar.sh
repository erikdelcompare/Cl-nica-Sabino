#!/usr/bin/env bash
# Baixa um vídeo de referência (YouTube, Instagram, Vimeo etc.) para referencias/.
# Uso: edicao/scripts/baixar.sh "URL" [opções extras do yt-dlp]
set -euo pipefail
raiz="$(cd "$(dirname "$0")/../.." && pwd)"
[ $# -ge 1 ] || { echo "Uso: $0 \"URL\" [opções do yt-dlp]" >&2; exit 1; }
exec "$raiz/edicao/.venv/bin/yt-dlp" --js-runtimes node \
  -f "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b" --merge-output-format mp4 \
  -o "$raiz/referencias/%(title).80s [%(id)s].%(ext)s" "$@"
