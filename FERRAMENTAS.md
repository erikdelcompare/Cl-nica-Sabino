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
| `edicao/scripts/` | Atalhos de transcrição, narração, download e remoção de silêncio |
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
| Kokoro (voz) | 0.9.4 | `edicao/.venv` |

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

`remotion.config.ts` aponta para o Chrome Headless Shell que já existe nesta máquina, para não baixar outro navegador. Em outra máquina, defina `REMOTION_BROWSER` ou deixe o Remotion baixar o dele.

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

O modelo é baixado no primeiro uso para `edicao/modelos-whisper/` ; depois disso a transcrição roda sem internet. Sem GPU, espere algo próximo do tempo real com `small` e bem mais com `medium`.

## 5. yt-dlp

```bash
# Baixa em MP4 (até 1080p) para referencias/
edicao/scripts/baixar.sh "URL"

# Só o áudio
edicao/scripts/baixar.sh "URL" -x --audio-format mp3

# Só um trecho (1:00 a 1:30)
edicao/scripts/baixar.sh "URL" --download-sections "*1:00-1:30"
```

**Limitação nesta máquina na nuvem:** a rede está liberada, mas o YouTube recusa downloads vindos de servidores de nuvem ("Sign in to confirm you're not a bot") e o Vimeo exige login. O yt-dlp lê título e duração, mas não baixa o vídeo. Alternativas: baixar no seu computador e colocar o arquivo em `referencias/`, ou fornecer um arquivo de cookies da sua conta (`--cookies arquivo.txt`), o que expõe a conta a risco de bloqueio.

## 6. Narração (Kokoro, local)

Gera voz em português do Brasil sem enviar nada para fora.

```bash
edicao/.venv/bin/python edicao/scripts/narrar.py "Texto da narração" exportacoes/narracao.wav
edicao/.venv/bin/python edicao/scripts/narrar.py --arquivo roteiro.txt exportacoes/narracao.wav \
  --voz pm_alex --velocidade 1.1
```

Vozes: `pf_dora` (feminina, padrão), `pm_alex` e `pm_santa` (masculinas). O modelo (cerca de 330 MB) é baixado do Hugging Face no primeiro uso para `edicao/modelos-voz/`. Licença Apache 2.0, uso comercial permitido.

## O que ainda não está instalado

- **Música de fundo:** o gerador local disponível (MusicGen) tem licença que proíbe uso comercial, então não foi instalado. Use trilhas licenciadas colocadas em `referencias/`.
- **Banco de imagens e vídeos:** Pexels e Pixabay exigem uma chave de API gratuita da sua conta.

## Testes feitos na instalação

| Ferramenta | Teste | Resultado |
|---|---|---|
| Remotion | Render da composição `Teste` (3 s, 1920x1080, 30 fps) | OK |
| HyperFrames | `lint` sem erros e render do `index.html` (3 s, 1920x1080) | OK |
| FFmpeg | Corte, junção, remoção de silêncio (6,00 s → 4,23 s) e exportação 480p | OK |
| Whisper | Transcrição de áudio de 11 s em inglês com o modelo `base`, saída `.srt` | OK |
| yt-dlp | Download de um arquivo de áudio por URL direta | OK |
| yt-dlp | YouTube e Vimeo | Lê os dados do vídeo, mas o site recusa o download nesta máquina |
| Kokoro | Narração de 6,9 s em português, vozes `pf_dora` e `pm_alex` | OK |
| Whisper | Transcrição dessa narração em português com o modelo `small` | OK |
