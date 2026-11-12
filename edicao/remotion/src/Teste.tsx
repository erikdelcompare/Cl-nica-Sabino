import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Teste = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0b1f2a",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}
    >
      <h1
        style={{
          color: "white",
          fontSize: 96,
          opacity: entrada,
          transform: `translateY(${interpolate(entrada, [0, 1], [40, 0])}px)`,
        }}
      >
        Remotion funcionando
      </h1>
    </AbsoluteFill>
  );
};
