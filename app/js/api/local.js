// Backend do MODO DEMO: tudo fica no localStorage do navegador.
// Implementa exatamente a mesma interface do backend Supabase.

import { gerarDadosDemo, uid } from "../seed.js";

const DB_KEY = "dmlog:db:v1";
const SESSION_KEY = "dmlog:sessao";

let db = null;
let atual = null;

function load() {
  try {
    db = JSON.parse(localStorage.getItem(DB_KEY));
  } catch {
    db = null;
  }
  if (!db || db.versao !== 1) {
    db = gerarDadosDemo();
    save();
  }
}
function save() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn("Não foi possível salvar no navegador", e);
  }
}
const publico = (u) => u && { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo };
const delay = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 60));

function exigirLogin() {
  if (!atual) throw new Error("Sessão expirada. Entre novamente.");
}
function exigirGerente() {
  exigirLogin();
  if (atual.perfil !== "gerente") throw new Error("Apenas o perfil gerencial pode fazer isso.");
}

export const localApi = {
  modo: "demo",

  async init() {
    load();
    let id = null;
    try { id = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY); } catch {}
    atual = db.usuarios.find((u) => u.id === id && u.ativo) || null;
    return publico(atual);
  },

  async login(email, senha) {
    load();
    const u = db.usuarios.find((x) => x.email.toLowerCase() === String(email).toLowerCase().trim());
    if (!u || u.senha !== senha) throw new Error("E-mail ou senha inválidos.");
    if (!u.ativo) throw new Error("Usuário desativado. Fale com o gerente.");
    atual = u;
    try { localStorage.setItem(SESSION_KEY, u.id); } catch {}
    return publico(u);
  },

  async logout() {
    atual = null;
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch {}
  },

  // ---------- Produtos ----------
  async listarProdutos() {
    exigirLogin();
    return delay([...db.produtos].sort((a, b) => a.sku.localeCompare(b.sku)));
  },
  async salvarProduto(p) {
    exigirGerente();
    if (!p.sku || !p.nome) throw new Error("SKU e nome são obrigatórios.");
    const dup = db.produtos.find((x) => x.sku.toLowerCase() === p.sku.toLowerCase() && x.id !== p.id);
    if (dup) throw new Error(`Já existe um produto com o SKU ${p.sku}.`);
    if (p.id) {
      const i = db.produtos.findIndex((x) => x.id === p.id);
      db.produtos[i] = { ...db.produtos[i], ...p };
    } else {
      p = { atributos: {}, ativo: true, ...p, id: uid(), criado_em: new Date().toISOString() };
      db.produtos.push(p);
    }
    save();
    return delay(p);
  },

  // ---------- Centros de distribuição ----------
  async listarCentros() {
    exigirLogin();
    return delay([...db.centros].sort((a, b) => a.codigo.localeCompare(b.codigo)));
  },
  async salvarCentro(c) {
    exigirGerente();
    if (!c.codigo || !c.nome) throw new Error("Código e nome são obrigatórios.");
    const dup = db.centros.find((x) => x.codigo.toLowerCase() === c.codigo.toLowerCase() && x.id !== c.id);
    if (dup) throw new Error(`Já existe um CD com o código ${c.codigo}.`);
    if (c.id) {
      const i = db.centros.findIndex((x) => x.id === c.id);
      db.centros[i] = { ...db.centros[i], ...c };
    } else {
      c = { ativo: true, ...c, id: uid() };
      db.centros.push(c);
    }
    save();
    return delay(c);
  },

  // ---------- Estoque e movimentações ----------
  async listarEstoque() {
    exigirLogin();
    return delay(db.estoque);
  },
  async listarMovimentacoes({ desde, limite } = {}) {
    exigirLogin();
    let l = db.movimentacoes;
    if (desde) l = l.filter((m) => m.criado_em >= desde);
    if (limite) l = l.slice(0, limite);
    return delay(l);
  },
  async registrarMovimentacao(m) {
    exigirLogin();
    const qtd = Math.trunc(Number(m.quantidade));
    const prod = db.produtos.find((p) => p.id === m.produto_id);
    if (!prod) throw new Error("Selecione um produto.");
    const linha = (centro) => {
      let l = db.estoque.find((e) => e.produto_id === prod.id && e.centro_id === centro);
      if (!l) { l = { produto_id: prod.id, centro_id: centro, quantidade: 0 }; db.estoque.push(l); }
      return l;
    };
    const reg = { id: uid(), tipo: m.tipo, produto_id: prod.id, centro_origem_id: null, centro_destino_id: null, quantidade: qtd, observacao: m.observacao || "", usuario_id: atual.id, usuario_nome: atual.nome, criado_em: new Date().toISOString() };

    if (m.tipo === "ajuste") {
      exigirGerente();
      if (!m.centro_destino_id) throw new Error("Selecione o CD.");
      if (!(qtd >= 0)) throw new Error("Informe a contagem (0 ou mais).");
      const l = linha(m.centro_destino_id);
      reg.quantidade = qtd - l.quantidade;
      reg.centro_destino_id = m.centro_destino_id;
      reg.observacao = `Contagem: ${qtd}. ${reg.observacao}`.trim();
      l.quantidade = qtd;
    } else {
      if (!(qtd > 0)) throw new Error("A quantidade deve ser maior que zero.");
      if (m.tipo === "entrada") {
        if (!m.centro_destino_id) throw new Error("Selecione o CD de destino.");
        linha(m.centro_destino_id).quantidade += qtd;
        reg.centro_destino_id = m.centro_destino_id;
      } else if (m.tipo === "saida" || m.tipo === "transferencia") {
        if (!m.centro_origem_id) throw new Error("Selecione o CD de origem.");
        const o = linha(m.centro_origem_id);
        if (o.quantidade < qtd) throw new Error(`Saldo insuficiente no CD de origem (disponível: ${o.quantidade}).`);
        if (m.tipo === "transferencia") {
          if (!m.centro_destino_id) throw new Error("Selecione o CD de destino.");
          if (m.centro_destino_id === m.centro_origem_id) throw new Error("Origem e destino devem ser diferentes.");
          linha(m.centro_destino_id).quantidade += qtd;
          reg.centro_destino_id = m.centro_destino_id;
        }
        o.quantidade -= qtd;
        reg.centro_origem_id = m.centro_origem_id;
      } else throw new Error("Tipo de movimentação inválido.");
    }
    db.movimentacoes.unshift(reg);
    save();
    return delay(reg);
  },

  // ---------- Usuários ----------
  async listarUsuarios() {
    exigirGerente();
    return delay(db.usuarios.map(publico));
  },
  async salvarUsuario(u) {
    exigirGerente();
    if (!u.email || !u.nome) throw new Error("Nome e e-mail são obrigatórios.");
    const dup = db.usuarios.find((x) => x.email.toLowerCase() === u.email.toLowerCase() && x.id !== u.id);
    if (dup) throw new Error("Já existe um usuário com este e-mail.");
    if (u.id === atual.id && (u.perfil !== "gerente" || u.ativo === false)) throw new Error("Você não pode remover seu próprio acesso gerencial.");
    if (u.id) {
      const i = db.usuarios.findIndex((x) => x.id === u.id);
      const novo = { ...db.usuarios[i], ...u };
      if (!u.senha) novo.senha = db.usuarios[i].senha;
      db.usuarios[i] = novo;
    } else {
      if (!u.senha || u.senha.length < 6) throw new Error("A senha precisa ter ao menos 6 caracteres.");
      db.usuarios.push({ ativo: true, ...u, id: uid() });
    }
    save();
    return delay(publico(u));
  },

  async resetarDemo() {
    exigirGerente();
    localStorage.removeItem(DB_KEY);
    load();
    const g = db.usuarios.find((u) => u.perfil === "gerente");
    atual = g;
    localStorage.setItem(SESSION_KEY, g.id);
  },
};
