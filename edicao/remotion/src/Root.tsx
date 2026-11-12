import { Composition } from "remotion";
import { Teste } from "./Teste";

// Cada <Composition> é um vídeo renderizável. Registre novos vídeos aqui.
export const Root = () => (
  <Composition
    id="Teste"
    component={Teste}
    durationInFrames={90}
    fps={30}
    width={1920}
    height={1080}
  />
);
