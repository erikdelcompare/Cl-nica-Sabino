#!/usr/bin/env python3
"""Gera narração em português (pt-BR) com o Kokoro, rodando localmente.

Uso:
  edicao/.venv/bin/python edicao/scripts/narrar.py "Texto da narração" saida.wav
      [--voz pf_dora] [--velocidade 1.0]
  edicao/.venv/bin/python edicao/scripts/narrar.py --arquivo roteiro.txt saida.wav

Vozes pt-BR: pf_dora (feminina), pm_alex e pm_santa (masculinas).
"""
import argparse
import os
import sys
from pathlib import Path

# Guarda o modelo de voz dentro do projeto, e não na pasta do usuário.
os.environ.setdefault("HF_HOME", str(Path(__file__).resolve().parents[1] / "modelos-voz"))

import numpy as np
import soundfile as sf
from kokoro import KPipeline


def main() -> int:
    p = argparse.ArgumentParser(description="Narração pt-BR com Kokoro.")
    p.add_argument("texto", nargs="?")
    p.add_argument("saida")
    p.add_argument("--arquivo", help="lê o texto de um arquivo .txt")
    p.add_argument("--voz", default="pf_dora")
    p.add_argument("--velocidade", type=float, default=1.0)
    a = p.parse_args()

    texto = open(a.arquivo, encoding="utf-8").read() if a.arquivo else a.texto
    if not texto or not texto.strip():
        print("Informe o texto ou --arquivo.", file=sys.stderr)
        return 1

    pipeline = KPipeline(lang_code="p", repo_id="hexgrad/Kokoro-82M")
    partes = [np.asarray(audio) for _, _, audio in pipeline(texto, voice=a.voz, speed=a.velocidade)]
    if not partes:
        print("Nenhum áudio gerado.", file=sys.stderr)
        return 1
    audio = np.concatenate(partes)
    sf.write(a.saida, audio, 24000)
    print(f"{a.saida}: {len(audio) / 24000:.1f}s, voz {a.voz}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
