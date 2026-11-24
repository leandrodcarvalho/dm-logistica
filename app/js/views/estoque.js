import { h, num, brl, pageHeader, select, statusEstoque, emptyState } from "../ui.js";
import { carregarBase, abrirMovimentacao } from "./dados.js";
import { CORES_HEX } from "../seed.js";

export async function render(ctx) {
  const base = await carregarBase(ctx.api);
  const { produtos, centros, saldo, totalProduto } = base;
  const cdsAtivos = centros.filter((c) => c.ativo);

  const f = {
    busca: ctx.params.get("busca") || "",
    cd: ctx.params.get("cd") || "",
    categoria: ctx.params.get("categoria") || "",
    status: ctx.params.get("status") || "",
    visao: ctx.params.get("visao") || "cd",
  };

  const categorias = [...new Set(produtos.map((p) => p.categoria))].sort();
  const busca = h("input", { type: "search", placeholder: "Buscar SKU, nome, marca, cor…", value: f.busca, "aria-label": "Buscar" });
  const cdSel = select("cd", [["", "Todos os CDs"], ...cdsAtivos.map((c) => [c.id, c.codigo])], f.cd, { "aria-label": "CD" });
  const catSel = select("categoria", [["", "Todas as categorias"], ...categorias], f.categoria, { "aria-label": "Categoria" });
  const stSel = select("status", [["", "Todos os status"], ["baixo", "Baixo ou zerado"], ["zerado", "Somente zerado"], ["ok", "Somente OK"]], f.status, { "aria-label": "Status" });
  const visao = h(
    "div",
    { class: "segmented", role: "group", "aria-label": "Visão" },
    h("button", { type: "button", "data-v": "cd", class: f.visao === "cd" ? "on" : "" }, "Por CD"),
    h("button", { type: "button", "data-v": "total", class: f.visao === "total" ? "on" : "" }, "Consolidado")
  );

  const resumo = h("div", { class: "table-summary" });
  const tabela = h("div", { class: "table-wrap" });

  function linhasPorCd() {
    const out = [];
    for (const p of produtos) {
      if (!p.ativo) continue;
      for (const c of cdsAtivos) {
        if (f.cd && c.id !== f.cd) continue;
        out.push({ p, c, qtd: saldo.get(`${p.id}|${c.id}`) || 0, min: p.estoque_minimo });
      }
    }
    return out;
  }
  function linhasTotal() {
    return produtos.filter((p) => p.ativo).map((p) => {
      const qtd = f.cd ? saldo.get(`${p.id}|${f.cd}`) || 0 : totalProduto.get(p.id) || 0;
      const min = f.cd ? p.estoque_minimo : p.estoque_minimo * cdsAtivos.length;
      return { p, c: null, qtd, min };
    });
  }

  function filtrar(rows) {
    const q = f.busca.toLowerCase();
    return rows.filter(({ p, qtd, min }) => {
      if (f.categoria && p.categoria !== f.categoria) return false;
      if (q && ![p.sku, p.nome, p.marca, p.cor, p.tamanho, p.categoria].join(" ").toLowerCase().includes(q)) return false;
      if (f.status === "baixo" && qtd > min) return false;
      if (f.status === "zerado" && qtd > 0) return false;
      if (f.status === "ok" && qtd <= min) return false;
      return true;
    });
  }

  function desenhar() {
    const rows = filtrar(f.visao === "cd" ? linhasPorCd() : linhasTotal());
    const unidades = rows.reduce((s, r) => s + r.qtd, 0);
    const valor = rows.reduce((s, r) => s + r.qtd * r.p.preco_outlet, 0);
    const baixos = rows.filter((r) => r.qtd <= r.min).length;
    resumo.replaceChildren(
      h("span", {}, h("strong", {}, num(rows.length)), " linhas"),
      h("span", {}, h("strong", {}, num(unidades)), " unidades"),
      h("span", {}, h("strong", {}, brl(valor)), " em estoque (preço outlet)"),
      h("span", {}, h("strong", {}, num(baixos)), " em baixa")
    );
    if (!rows.length) return tabela.replaceChildren(emptyState("Nenhum item encontrado com esses filtros."));

    const porCd = f.visao === "cd";
    tabela.replaceChildren(
      h(
        "table",
        { class: "table" },
        h("thead", {}, h("tr", {},
          h("th", {}, "Produto"), h("th", {}, "Tam."), h("th", {}, "Cor"),
          porCd ? h("th", {}, "CD") : !f.cd && cdsAtivos.map((c) => h("th", { class: "num" }, c.codigo)),
          h("th", { class: "num" }, "Saldo"), h("th", { class: "num" }, "Mínimo"), h("th", {}, "Status"), h("th", {}, "")
        )),
        h("tbody", {}, rows.map(({ p, c, qtd, min }) =>
          h("tr", { class: qtd <= min ? "row-alert" : "" },
            h("td", {}, h("div", { class: "prod-cell" }, h("span", { class: "swatch", style: { background: CORES_HEX[p.cor] || "#ccc" } }), h("div", {}, h("strong", {}, p.nome), h("small", { class: "muted" }, `${p.sku} · ${p.marca}`)))),
            h("td", {}, p.tamanho),
            h("td", {}, p.cor),
            porCd ? h("td", {}, c.codigo) : !f.cd && cdsAtivos.map((cd) => h("td", { class: "num muted" }, num(saldo.get(`${p.id}|${cd.id}`) || 0))),
            h("td", { class: "num strong" }, num(qtd)),
            h("td", { class: "num muted" }, num(min)),
            h("td", {}, statusEstoque(qtd, min)),
            h("td", { class: "actions" }, h("button", { class: "btn btn-sm btn-ghost", onclick: () => abrirMovimentacao(ctx, base, { produto_id: p.id, centro_id: c?.id || f.cd, tipo: qtd <= min ? "entrada" : "saida" }, () => ctx.refresh()) }, "Movimentar"))
          )
        ))
      )
    );
  }

  const sync = () => {
    f.busca = busca.value;
    f.cd = cdSel.value;
    f.categoria = catSel.value;
    f.status = stSel.value;
    const qs = new URLSearchParams(Object.entries(f).filter(([k, v]) => v && !(k === "visao" && v === "cd")));
    history.replaceState(null, "", `#/estoque${qs.toString() ? "?" + qs : ""}`);
    desenhar();
  };
  busca.addEventListener("input", sync);
  [cdSel, catSel, stSel].forEach((s) => s.addEventListener("change", sync));
  visao.addEventListener("click", (e) => {
    const v = e.target.dataset?.v;
    if (!v) return;
    f.visao = v;
    visao.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
    sync();
  });

  const exportar = () => {
    const rows = filtrar(f.visao === "cd" ? linhasPorCd() : linhasTotal());
    const linhas = [["SKU", "Produto", "Categoria", "Marca", "Tamanho", "Cor", "CD", "Saldo", "Minimo"]];
    for (const r of rows) linhas.push([r.p.sku, r.p.nome, r.p.categoria, r.p.marca, r.p.tamanho, r.p.cor, r.c?.codigo || (f.cd ? base.cdMap.get(f.cd).codigo : "Todos"), r.qtd, r.min]);
    const csv = "﻿" + linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = h("a", { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: `estoque-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
  };

  desenhar();
  return h(
    "div",
    {},
    pageHeader("Consulta de estoque", "Saldo de cada produto por centro de distribuição.",
      h("button", { class: "btn btn-ghost", onclick: exportar }, "Exportar CSV"),
      h("button", { class: "btn btn-primary", onclick: () => abrirMovimentacao(ctx, base, {}, () => ctx.refresh()) }, "+ Movimentação")
    ),
    h("div", { class: "filters card" }, busca, cdSel, catSel, stSel, visao),
    resumo,
    h("div", { class: "card card-flush" }, tabela)
  );
}
