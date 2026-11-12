#!/usr/bin/env bash
# Reinstala as ferramentas de edição dentro desta pasta (nada é instalado no sistema).
# Requisitos já presentes na máquina: Node.js >= 22, Python 3.10–3.13, FFmpeg e uv.
set -euo pipefail
cd "$(dirname "$0")"

for cmd in node npm ffmpeg uv; do
  command -v "$cmd" >/dev/null || { echo "Falta '$cmd' nesta máquina." >&2; exit 1; }
done

# Whisper + yt-dlp em um ambiente Python isolado (edicao/.venv)
[ -d .venv ] || uv venv --python 3.12 .venv
# PyTorch só-CPU é bem menor; se o índice estiver bloqueado, o passo seguinte usa o do PyPI.
uv pip install --python .venv/bin/python torch --index-url https://download.pytorch.org/whl/cpu \
  || echo "Índice CPU do PyTorch indisponível; usando o pacote padrão do PyPI."
uv pip install --python .venv/bin/python -r requirements.txt

# Remotion e HyperFrames (dependências locais de cada subprojeto)
(cd remotion && npm ci)
(cd hyperframes && npm ci)

echo "Pronto. Veja FERRAMENTAS.md na raiz do projeto."
