"use client";

import { useActionState } from "react";
import { Aviso, Botao, Campo, Entrada } from "@/components/ui";
import { entrar, type EstadoLogin } from "@/lib/acoes/sessao";

export function FormularioLogin({ voltar, desabilitado }: { voltar: string; desabilitado: boolean }) {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, {});
  return (
    <form action={acao} className="mt-4 space-y-3">
      <input type="hidden" name="voltar" value={voltar} />
      <Campo rotulo="E-mail">
        <Entrada name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" required disabled={desabilitado} />
      </Campo>
      <Campo rotulo="Senha">
        <Entrada name="senha" type="password" autoComplete="current-password" required disabled={desabilitado} />
      </Campo>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <Botao type="submit" tamanho="g" className="w-full" disabled={enviando || desabilitado}>
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
