// Cadastra (ou atualiza) o proprietário: o único usuário com acesso ao painel.
//
//   npm run proprietario:criar -- --email voce@exemplo.com.br --senha "uma-senha-forte"
//
// O cadastro público fica desativado; este script usa a chave de serviço para criar o usuário
// já confirmado e registrá-lo na tabela public.proprietarios (consultada pelas políticas RLS).

import { argumentos, clienteDeServico } from "./ambiente";

async function main() {
  const args = argumentos();
  const email = (args.email ?? process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  const senha = args.senha ?? process.env.OWNER_SENHA ?? "";
  if (!email || !email.includes("@")) {
    console.error("Informe o e-mail: --email voce@exemplo.com.br (ou defina OWNER_EMAIL).");
    process.exit(1);
  }
  if (senha.length < 10) {
    console.error("Informe uma senha com pelo menos 10 caracteres: --senha \"...\" (ou defina OWNER_SENHA).");
    process.exit(1);
  }
  const db = clienteDeServico();

  let userId: string | null = null;
  const criado = await db.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (criado.data.user) {
    userId = criado.data.user.id;
    console.log(`Usuário criado: ${email}`);
  } else {
    // Já existe: localiza e atualiza a senha.
    let pagina = 1;
    while (!userId) {
      const lista = await db.auth.admin.listUsers({ page: pagina, perPage: 200 });
      if (lista.error) throw lista.error;
      userId = lista.data.users.find((u) => (u.email ?? "").toLowerCase() === email)?.id ?? null;
      if (lista.data.users.length < 200) break;
      pagina++;
    }
    if (!userId) throw new Error(`Não foi possível criar o usuário: ${criado.error?.message}`);
    const atualizado = await db.auth.admin.updateUserById(userId, { password: senha, email_confirm: true });
    if (atualizado.error) throw atualizado.error;
    console.log(`Usuário já existia: senha atualizada para ${email}`);
  }

  const registro = await db.from("proprietarios").upsert({ user_id: userId }, { onConflict: "user_id" });
  if (registro.error) throw registro.error;

  const { count } = await db.from("proprietarios").select("user_id", { count: "exact", head: true });
  console.log(`Proprietário registrado. Total de proprietários cadastrados: ${count}`);
  if ((process.env.OWNER_EMAIL ?? "").toLowerCase() !== email) {
    console.log(`Atenção: defina OWNER_EMAIL=${email} nas variáveis de ambiente do servidor.`);
  }
}

main().catch((e) => {
  console.error("Falha ao cadastrar o proprietário:", e instanceof Error ? e.message : e);
  process.exit(1);
});
