// Gera supabase/seed.sql a partir do mesmo gerador do modo demo.
// Uso: node scripts/gerar-seed-sql.mjs > supabase/seed.sql
import { gerarDadosDemo } from "../app/js/seed.js";

const ref = Date.now();
const db = gerarDadosDemo();
const q = (v) => (v === null || v === undefined || v === "" ? "null" : typeof v === "number" || typeof v === "boolean" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const quando = (iso) => `now() - interval '${Math.max(0, Math.round((ref - new Date(iso)) / 1000))} seconds'`;
const out = [];
out.push("-- DM Logístic — dados de exemplo (outlet de roupas).");
out.push("-- Rode DEPOIS do schema.sql. ATENÇÃO: apaga produtos, CDs, estoque e movimentações existentes.");
out.push("-- Datas são relativas a now(), então o painel sempre mostra os últimos 90 dias.");
out.push("begin;");
out.push("truncate public.movimentacoes, public.estoque, public.produtos, public.centros cascade;");
out.push("insert into public.centros (id, codigo, nome, cidade, uf, endereco, responsavel, ativo) values");
out.push(db.centros.map((c) => `(${[c.id, c.codigo, c.nome, c.cidade, c.uf, c.endereco, c.responsavel, c.ativo].map(q).join(", ")})`).join(",\n") + ";");
out.push("insert into public.produtos (id, sku, nome, categoria, marca, tamanho, cor, preco_original, preco_outlet, estoque_minimo, ativo) values");
out.push(db.produtos.map((p) => `(${[p.id, p.sku, p.nome, p.categoria, p.marca, p.tamanho, p.cor, p.preco_original, p.preco_outlet, p.estoque_minimo, p.ativo].map(q).join(", ")})`).join(",\n") + ";");
out.push("insert into public.estoque (produto_id, centro_id, quantidade) values");
out.push(db.estoque.map((e) => `(${q(e.produto_id)}, ${q(e.centro_id)}, ${e.quantidade})`).join(",\n") + ";");
const movs = db.movimentacoes;
for (let i = 0; i < movs.length; i += 500) {
  out.push("insert into public.movimentacoes (tipo, produto_id, centro_origem_id, centro_destino_id, quantidade, observacao, usuario_nome, criado_em) values");
  out.push(movs.slice(i, i + 500).map((m) => `(${[m.tipo, m.produto_id, m.centro_origem_id, m.centro_destino_id, m.quantidade, m.observacao, m.usuario_nome].map(q).join(", ")}, ${quando(m.criado_em)})`).join(",\n") + ";");
}
out.push("commit;");
console.log(out.join("\n"));
