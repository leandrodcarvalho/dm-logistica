import { h, num, dataHora, pageHeader, select, badge, emptyState } from "../ui.js";
import { carregarBase, abrirMovimentacao, TIPOS } from "./dados.js";

export async function render(ctx) {
  const dias = Number(ctx.params.get("dias") || 30);
  const desde = new Date(Date.now() - dias * 86400000).toISOString();
  const [base, movs] = await Promise.all([carregarBase(ctx.api), ctx.api.listarMovimentacoes({ desde })]);
  const { prodMap, cdMap, centros } = base;

  const f = { tipo: "", cd: "", busca: "" };
  const tipoSel = select("tipo", [["", "Todos os tipos"], ...Object.entries(TIPOS).map(([k, v]) => [k, v.label])], "", { "aria-label": "Tipo" });
  const cdSel = select("cd", [["", "Todos os CDs"], ...centros.map((c) => [c.id, c.codigo])], "", { "aria-label": "CD" });
  const diasSel = select("dias", [["1", "Hoje"], ["7", "Últimos 7 dias"], ["30", "Últimos 30 dias"], ["90", "Últimos 90 dias"]], String(dias), { "aria-label": "Período" });
  const busca = h("input", { type: "search", placeholder: "Buscar produto, SKU, usuário…", "aria-label": "Buscar" });
  const lista = h("div", { class: "table-wrap" });
  const resumo = h("div", { class: "table-summary" });

  const cd = (id) => (id ? cdMap.get(id)?.codigo || "?" : "—");

  function desenhar() {
    const q = f.busca.toLowerCase();
    const rows = movs.filter((m) => {
      if (f.tipo && m.tipo !== f.tipo) return false;
      if (f.cd && m.centro_origem_id !== f.cd && m.centro_destino_id !== f.cd) return false;
      if (q) {
        const p = prodMap.get(m.produto_id);
        if (![p?.sku, p?.nome, m.usuario_nome, m.observacao].join(" ").toLowerCase().includes(q)) return false;
      }
      return true;
    });
    const soma = (t) => rows.filter((m) => m.tipo === t).reduce((s, m) => s + m.quantidade, 0);
    resumo.replaceChildren(
      h("span", {}, h("strong", {}, num(rows.length)), " movimentações"),
      h("span", {}, "↓ ", h("strong", {}, num(soma("entrada"))), " un. entraram"),
      h("span", {}, "↑ ", h("strong", {}, num(soma("saida"))), " un. saíram"),
      h("span", {}, "⇄ ", h("strong", {}, num(soma("transferencia"))), " un. transferidas")
    );
    if (!rows.length) return lista.replaceChildren(emptyState("Nenhuma movimentação no período."));
    const visiveis = rows.slice(0, 300);
    lista.replaceChildren(
      h("table", { class: "table" },
        h("thead", {}, h("tr", {}, h("th", {}, "Data"), h("th", {}, "Tipo"), h("th", {}, "Produto"), h("th", {}, "Origem → Destino"), h("th", { class: "num" }, "Qtd."), h("th", {}, "Usuário"), h("th", {}, "Observação"))),
        h("tbody", {}, visiveis.map((m) => {
          const p = prodMap.get(m.produto_id);
          const t = TIPOS[m.tipo];
          return h("tr", {},
            h("td", { class: "nowrap" }, dataHora(m.criado_em)),
            h("td", {}, badge(`${t.icone} ${t.label.replace(" de inventário", "")}`, t.classe)),
            h("td", {}, p ? h("div", {}, h("strong", {}, p.nome), h("small", { class: "muted block" }, `${p.sku} · ${p.tamanho} · ${p.cor}`)) : "—"),
            h("td", { class: "nowrap" }, `${cd(m.centro_origem_id)} → ${cd(m.centro_destino_id)}`),
            h("td", { class: "num strong" }, (m.tipo === "ajuste" && m.quantidade > 0 ? "+" : "") + num(m.quantidade)),
            h("td", {}, m.usuario_nome),
            h("td", { class: "muted" }, m.observacao)
          );
        }))
      ),
      rows.length > visiveis.length && h("p", { class: "muted table-foot" }, `Mostrando as ${visiveis.length} mais recentes de ${num(rows.length)}. Refine os filtros para ver outras.`)
    );
  }

  busca.addEventListener("input", () => { f.busca = busca.value; desenhar(); });
  tipoSel.addEventListener("change", () => { f.tipo = tipoSel.value; desenhar(); });
  cdSel.addEventListener("change", () => { f.cd = cdSel.value; desenhar(); });
  diasSel.addEventListener("change", () => ctx.navigate(`movimentacoes?dias=${diasSel.value}`));

  desenhar();
  return h("div", {},
    pageHeader("Movimentações", "Entradas, saídas, transferências entre CDs e ajustes de inventário.",
      h("button", { class: "btn btn-primary", onclick: () => abrirMovimentacao(ctx, base, {}, () => ctx.refresh()) }, "+ Nova movimentação")),
    h("div", { class: "filters card" }, busca, diasSel, tipoSel, cdSel),
    resumo,
    h("div", { class: "card card-flush" }, lista)
  );
}
