import { existsSync } from "node:fs";
import { Config } from "@remotion/cli/config";

// Nesta máquina a rede bloqueia o download do navegador do Remotion
// (remotion.media), então usamos o Chrome Headless Shell já instalado.
// Em outra máquina (sem esse arquivo), o Remotion baixa o dele sozinho.
const navegador =
  process.env.REMOTION_BROWSER ??
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";

if (existsSync(navegador)) {
  Config.setBrowserExecutable(navegador);
}

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
