#!/usr/bin/env python3
"""Remove os trechos de silêncio de um vídeo usando apenas o FFmpeg.

Uso:
  python3 edicao/scripts/remover-silencio.py entrada.mp4 saida.mp4
      [--limiar -35] [--minimo 0.5] [--margem 0.1]

--limiar  volume (dB) abaixo do qual o áudio conta como silêncio
--minimo  duração mínima (s) para um silêncio ser cortado
--margem  respiro (s) mantido antes e depois de cada fala
"""
import argparse
import re
import subprocess
import sys


def duracao(arquivo: str) -> float:
    saida = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arquivo],
        capture_output=True, text=True, check=True,
    ).stdout
    return float(saida.strip())


def silencios(arquivo: str, limiar: float, minimo: float) -> list[tuple[float, float]]:
    log = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", arquivo, "-vn",
         "-af", f"silencedetect=noise={limiar}dB:d={minimo}", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    ).stderr
    inicios = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", log)]
    fins = [float(x) for x in re.findall(r"silence_end: (-?[\d.]+)", log)]
    return list(zip(inicios, fins + [float("inf")] * (len(inicios) - len(fins))))


def main() -> int:
    p = argparse.ArgumentParser(description="Remove silêncios de um vídeo.")
    p.add_argument("entrada")
    p.add_argument("saida")
    p.add_argument("--limiar", type=float, default=-35.0)
    p.add_argument("--minimo", type=float, default=0.5)
    p.add_argument("--margem", type=float, default=0.1)
    a = p.parse_args()

    total = duracao(a.entrada)
    manter, cursor = [], 0.0
    for ini, fim in silencios(a.entrada, a.limiar, a.minimo):
        ini, fim = max(0.0, ini) + a.margem, min(fim, total) - a.margem
        if fim <= ini:
            continue
        if ini > cursor:
            manter.append((cursor, ini))
        cursor = fim
    if cursor < total:
        manter.append((cursor, total))

    if not manter:
        print("O arquivo inteiro foi detectado como silêncio; nada a exportar.", file=sys.stderr)
        return 1

    expr = "+".join(f"between(t,{i:.3f},{f:.3f})" for i, f in manter)
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", a.entrada,
         "-vf", f"select='{expr}',setpts=N/FRAME_RATE/TB",
         "-af", f"aselect='{expr}',asetpts=N/SR/TB",
         "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", a.saida],
        check=True,
    )
    final = duracao(a.saida)
    print(f"{len(manter)} trecho(s) mantido(s): {total:.2f}s -> {final:.2f}s ({total - final:.2f}s removidos)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
