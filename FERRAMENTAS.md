# Ferramentas de edição de vídeo

Instalado e testado em 12/11/2026, em Ubuntu 24.04.5 LTS (x86_64, 4 CPUs, 15 GB de RAM, sem GPU).

Tudo fica dentro desta pasta. Nada foi instalado no sistema: Node.js, Python, FFmpeg e `uv` já existiam na máquina.

## Pastas

| Pasta | Para quê |
|---|---|
| `videos-brutos/` | Gravações originais |
| `referencias/` | Vídeos de referência baixados |
| `exportacoes/` | Vídeos finais e legendas |
| `edicao/remotion/` | Projeto Remotion |
| `edicao/hyperframes/` | Projeto HyperFrames |
| `edicao/scripts/` | Atalhos de transcrição e remoção de silêncio |
| `edicao/.venv/` | Ambiente Python com Whisper e yt-dlp (fora do Git) |

O conteúdo de `videos-brutos/`, `referencias/` e `exportacoes/` não vai para o Git.

## Versões

| Ferramenta | Versão | Onde está |
|---|---|---|
| Node.js / npm | 22.23.4 / 10.9.9 | já existia |
| Python | 3.12.3 (no `.venv`) | já existia |
| FFmpeg / FFprobe | 6.1.1 | já existia (`/usr/bin`) |
| Remotion | 4.0.543 | `edicao/remotion/node_modules` |
| HyperFrames | 0.9.36 | `edicao/hyperframes/node_modules` |
| Whisper (openai-whisper) | 20250625, com PyTorch 2.15.0 | `edicao/.venv` |
| yt-dlp | 2026.10.26 | `edicao/.venv` |

## Reinstalar

Esta máquina na nuvem é descartável: o que não está no Git some quando a sessão termina. Para reinstalar tudo:

```bash
bash edicao/instalar.sh
```

O ambiente de nuvem `cl-nica-sabino` roda esse script sozinho ao iniciar uma sessão nova.

## 1. Remotion

Vídeo e motion graphics em React. Cada vídeo é um `<Composition>` registrado em `edicao/remotion/src/Root.tsx`.

```bash
cd edicao/remotion
npm run studio                                             # pré-visualização no navegador
npx remotion render src/index.ts Teste ../../exportacoes/video.mp4
npx remotion still  src/index.ts Teste ../../exportacoes/capa.png --frame=45
```

`remotion.config.ts` aponta para o Chrome Headless Shell que já existe nesta máquina, porque a rede bloqueia o download do navegador do próprio Remotion. Em outra máquina, defina `REMOTION_BROWSER` ou deixe o Remotion baixar o dele.

O Remotion é gratuito para indivíduos e empresas de até 3 pessoas; acima disso exige licença paga.

## 2. HyperFrames

Vídeo a partir de HTML, CSS e GSAP. A composição é `edicao/hyperframes/index.html`; os atributos `data-start`, `data-duration` e `data-track-index` definem a linha do tempo.

```bash
cd edicao/hyperframes
npm run dev                                                # pré-visualização (porta 3002)
npm run check                                              # valida a composição
npm run render -- -o ../../exportacoes/video.mp4
```

Os scripts do `package.json` já desligam a telemetria de uso (`HYPERFRAMES_NO_TELEMETRY=1`). Se chamar `npx hyperframes` direto, a telemetria fica ligada, a menos que você exporte essa variável.

## 3. FFmpeg

```bash
# Cortar do segundo 10 ao 25 (reencoda, corte exato)
ffmpeg -ss 10 -to 25 -i videos-brutos/a.mp4 -c:v libx264 -crf 18 -c:a aac exportacoes/corte.mp4

# Juntar clipes com o mesmo formato (lista.txt com linhas: file 'caminho.mp4')
ffmpeg -f concat -safe 0 -i lista.txt -c copy exportacoes/junto.mp4

# Remover silêncios
python3 edicao/scripts/remover-silencio.py videos-brutos/a.mp4 exportacoes/a-sem-silencio.mp4 \
  --limiar -35 --minimo 0.5 --margem 0.1

# Exportar para redes (H.264 + AAC, início rápido)
ffmpeg -i entrada.mp4 -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart exportacoes/final.mp4

# Vertical 1080x1920 com corte central
ffmpeg -i entrada.mp4 -vf "scale=-2:1920,crop=1080:1920" -c:v libx264 -crf 20 -c:a aac exportacoes/vertical.mp4

# Queimar legenda no vídeo
ffmpeg -i entrada.mp4 -vf "subtitles=exportacoes/legendas/entrada.srt" -c:a copy exportacoes/legendado.mp4
```

`remover-silencio.py`: `--limiar` é o volume em dB abaixo do qual conta como silêncio, `--minimo` a duração mínima do silêncio para ser cortado, `--margem` o respiro mantido em volta de cada fala.

## 4. Whisper (local)

```bash
edicao/scripts/transcrever.sh videos-brutos/a.mp4
```

Gera `.srt`, `.vtt`, `.txt` e `.json` em `exportacoes/legendas/`, em português, com o modelo `small`. Opções passadas depois do arquivo substituem os padrões:

```bash
edicao/scripts/transcrever.sh videos-brutos/a.mp4 --model medium --word_timestamps True
```

| Modelo | Tamanho | Uso |
|---|---|---|
| `base` | 139 MB | rascunho rápido |
| `small` | 461 MB | padrão do script |
| `medium` | 1,4 GB | melhor para português, mais lento |
| `large-v3` | 2,9 GB | máxima qualidade, muito lento sem GPU |

O modelo é baixado no primeiro uso para `edicao/modelos-whisper/` (de `openaipublic.azureedge.net`); depois disso a transcrição roda sem internet. Sem GPU, espere algo próximo do tempo real com `small` e bem mais com `medium`.

## 5. yt-dlp

```bash
# Melhor qualidade em MP4
edicao/.venv/bin/yt-dlp -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b" \
  -o "referencias/%(title)s.%(ext)s" "URL"

# Só o áudio
edicao/.venv/bin/yt-dlp -x --audio-format mp3 -o "referencias/%(title)s.%(ext)s" "URL"

# Só um trecho (1:00 a 1:30)
edicao/.venv/bin/yt-dlp --download-sections "*1:00-1:30" -o "referencias/%(title)s.%(ext)s" "URL"
```

**Limitação nesta máquina na nuvem:** a rede bloqueia YouTube, Vimeo, Instagram e afins, então o yt-dlp só baixa de hosts liberados. Para usar com esses sites, mude o acesso de rede do ambiente `cl-nica-sabino` nas configurações (o YouTube precisa de `*.googlevideo.com`, que só pode ser liberado por lá) ou rode o yt-dlp no seu computador e coloque o arquivo em `referencias/`.

## Testes feitos na instalação

| Ferramenta | Teste | Resultado |
|---|---|---|
| Remotion | Render da composição `Teste` (3 s, 1920x1080, 30 fps) | OK |
| HyperFrames | `lint` sem erros e render do `index.html` (3 s, 1920x1080) | OK |
| FFmpeg | Corte, junção, remoção de silêncio (6,00 s → 4,23 s) e exportação 480p | OK |
| Whisper | Transcrição de áudio de 11 s em inglês com o modelo `base`, saída `.srt` | OK |
| yt-dlp | Download de um arquivo de áudio por URL direta | OK |
| yt-dlp | YouTube | Bloqueado pela rede |

O Whisper foi testado só em inglês; ainda não rodou em um áudio em português.
