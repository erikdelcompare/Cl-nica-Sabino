#!/usr/bin/env bash
# Transcreve um vídeo/áudio com o Whisper local e gera legendas.
# Uso: edicao/scripts/transcrever.sh <arquivo> [opções extras do whisper]
# Padrões: português, modelo "small", saída .srt/.vtt/.txt/.json em exportacoes/legendas.
# Qualquer opção passada depois do arquivo substitui o padrão (ex.: --model medium).
set -euo pipefail
raiz="$(cd "$(dirname "$0")/../.." && pwd)"
[ $# -ge 1 ] || { echo "Uso: $0 <arquivo> [opções do whisper]" >&2; exit 1; }
entrada="$1"; shift
exec "$raiz/edicao/.venv/bin/whisper" "$entrada" \
  --model small --language pt --fp16 False \
  --model_dir "$raiz/edicao/modelos-whisper" \
  --output_dir "$raiz/exportacoes/legendas" --output_format all "$@"
