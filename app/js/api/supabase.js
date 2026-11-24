// Backend real: Supabase (Postgres + Auth). Mesma interface do modo demo.
// As regras de permissão são garantidas no banco (RLS + função registrar_movimentacao).

let sb = null;
let atual = null;

async function client(url, key) {
  if (sb) return sb;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  return sb;
}

const ok = ({ data, error }) => {
  if (error) throw new Error(traduzir(error.message));
  return data;
};

function traduzir(msg = "") {
  if (/Invalid login credentials/i.test(msg)) return "E-mail ou senha inválidos.";
  if (/Email not confirmed/i.test(msg)) return "E-mail ainda não confirmado.";
  if (/duplicate key.*sku/i.test(msg)) return "Já existe um produto com este SKU.";
  if (/duplicate key.*codigo/i.test(msg)) return "Já existe um CD com este código.";
  if (/row-level security|permission denied/i.test(msg)) return "Você não tem permissão para esta ação.";
  if (/Failed to fetch/i.test(msg)) return "Sem conexão com o servidor.";
  return msg;
}

// PostgREST limita respostas (1000 linhas por padrão): busca em páginas.
async function todas(builderFn, pagina = 1000) {
  const out = [];
  for (let de = 0; ; de += pagina) {
    const rows = ok(await builderFn().range(de, de + pagina - 1));
    out.push(...rows);
    if (rows.length < pagina) break;
  }
  return out;
}

async function carregarPerfil(user) {
  if (!user) return null;
  const p = ok(await sb.from("perfis").select("*").eq("id", user.id).maybeSingle());
  if (!p) return null;
  if (!p.ativo) {
    await sb.auth.signOut();
    throw new Error("Usuário desativado. Fale com o gerente.");
  }
  return { id: p.id, nome: p.nome, email: p.email, perfil: p.perfil, ativo: p.ativo };
}

export function supabaseApi(url, key) {
  return {
    modo: "supabase",

    async init() {
      await client(url, key);
      const { data } = await sb.auth.getSession();
      try {
        atual = await carregarPerfil(data.session?.user);
      } catch {
        atual = null;
      }
      return atual;
    },

    async login(email, senha) {
      await client(url, key);
      const data = ok(await sb.auth.signInWithPassword({ email: email.trim(), password: senha }));
      atual = await carregarPerfil(data.user);
      if (!atual) throw new Error("Perfil não encontrado para este usuário.");
      return atual;
    },

    async logout() {
      atual = null;
      await sb?.auth.signOut();
    },

    async listarProdutos() {
      return todas(() => sb.from("produtos").select("*").order("sku"));
    },
    async salvarProduto(p) {
      const { id, criado_em, ...dados } = p;
      if (id) return ok(await sb.from("produtos").update(dados).eq("id", id).select().single());
      return ok(await sb.from("produtos").insert(dados).select().single());
    },

    async listarCentros() {
      return ok(await sb.from("centros").select("*").order("codigo"));
    },
    async salvarCentro(c) {
      const { id, criado_em, ...dados } = c;
      if (id) return ok(await sb.from("centros").update(dados).eq("id", id).select().single());
      return ok(await sb.from("centros").insert(dados).select().single());
    },

    async listarEstoque() {
      return todas(() => sb.from("estoque").select("produto_id,centro_id,quantidade"));
    },
    async listarMovimentacoes({ desde, limite } = {}) {
      const q = () => {
        let b = sb.from("movimentacoes").select("*").order("criado_em", { ascending: false });
        if (desde) b = b.gte("criado_em", desde);
        return b;
      };
      if (limite) return ok(await q().limit(limite));
      return todas(q);
    },
    async registrarMovimentacao(m) {
      return ok(
        await sb.rpc("registrar_movimentacao", {
          p_tipo: m.tipo,
          p_produto_id: m.produto_id,
          p_centro_origem_id: m.centro_origem_id || null,
          p_centro_destino_id: m.centro_destino_id || null,
          p_quantidade: Math.trunc(Number(m.quantidade)),
          p_observacao: m.observacao || "",
        })
      );
    },

    async listarUsuarios() {
      return ok(await sb.from("perfis").select("*").order("nome"));
    },
    async salvarUsuario(u) {
      if (!u.id) {
        throw new Error("No modo Supabase, crie o usuário em Authentication > Users > Add user. Ele aparecerá aqui como funcionário.");
      }
      if (u.id === atual.id && (u.perfil !== "gerente" || u.ativo === false)) throw new Error("Você não pode remover seu próprio acesso gerencial.");
      return ok(await sb.from("perfis").update({ nome: u.nome, perfil: u.perfil, ativo: u.ativo }).eq("id", u.id).select().single());
    },

    async resetarDemo() {
      throw new Error("Disponível apenas no modo demo.");
    },
  };
}
