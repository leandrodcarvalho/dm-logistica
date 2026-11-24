import { h, num, brl, pageHeader, select, statusEstoque, dataCurta, showTip, hideTip, esc, emptyState } from "../ui.js";
import { carregarBase } from "./dados.js";
import { CORES_HEX } from "../seed.js";

const DIA = 86400000;

export async function render(ctx) {
  const dias = Number(ctx.params.get("dias") || 30);
  const cdFiltro = ctx.params.get("cd") || "";
  const agora = Date.now();
  const inicio = new Date(agora - dias * DIA);
  inicio.setHours(0, 0, 0, 0);
  const inicioAnterior = new Date(inicio.getTime() - dias * DIA);

  const [base, movs] = await Promise.all([carregarBase(ctx.api), ctx.api.listarMovimentacoes({ desde: inicioAnterior.toISOString() })]);
  const { produtos, centros, prodMap, saldo } = base;
  const cds = centros.filter((c) => c.ativo && (!cdFiltro || c.id === cdFiltro));
  const ativos = produtos.filter((p) => p.ativo);

  // ---------- Cálculos ----------
  const saidas = movs.filter((m) => m.tipo === "saida" && (!cdFiltro || m.centro_origem_id === cdFiltro));
  const noPeriodo = saidas.filter((m) => new Date(m.criado_em) >= inicio);
  const anterior = saidas.filter((m) => new Date(m.criado_em) < inicio);
  const unidadesSaida = noPeriodo.reduce((s, m) => s + m.quantidade, 0);
  const unidadesAnterior = anterior.reduce((s, m) => s + m.quantidade, 0);
  const receitaPeriodo = noPeriodo.reduce((s, m) => s + m.quantidade * (prodMap.get(m.produto_id)?.preco_outlet || 0), 0);

  let unidades = 0, valor = 0;
  const linhasBaixa = [];
  const saidaPorProdCd = new Map();
  for (const m of noPeriodo) {
    const k = `${m.produto_id}|${m.centro_origem_id}`;
    saidaPorProdCd.set(k, (saidaPorProdCd.get(k) || 0) + m.quantidade);
  }
  for (const p of ativos) {
    for (const c of cds) {
      const q = saldo.get(`${p.id}|${c.id}`) || 0;
      unidades += q;
      valor += q * p.preco_outlet;
      if (q <= p.estoque_minimo) {
        const mediaDia = (saidaPorProdCd.get(`${p.id}|${c.id}`) || 0) / dias;
        linhasBaixa.push({ p, c, q, cobertura: mediaDia > 0 ? q / mediaDia : Infinity, mediaDia });
      }
    }
  }
  linhasBaixa.sort((a, b) => a.q - b.q || a.cobertura - b.cobertura || b.mediaDia - a.mediaDia);

  // Top produtos (agrupa por SKU)
  const porSku = new Map();
  for (const m of noPeriodo) porSku.set(m.produto_id, (porSku.get(m.produto_id) || 0) + m.quantidade);
  const top = [...porSku.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, q]) => ({ p: prodMap.get(id), q })).filter((x) => x.p);

  // Por categoria
  const porCat = new Map();
  for (const m of noPeriodo) {
    const cat = prodMap.get(m.produto_id)?.categoria || "Outros";
    porCat.set(cat, (porCat.get(cat) || 0) + m.quantidade);
  }
  const cats = [...porCat.entries()].sort((a, b) => b[1] - a[1]);

  // Por dia
  const serie = [];
  for (let t = inicio.getTime(); t <= agora; t += DIA) serie.push({ d: new Date(t), q: 0 });
  for (const m of noPeriodo) {
    const i = Math.floor((new Date(m.criado_em) - inicio) / DIA);
    if (serie[i]) serie[i].q += m.quantidade;
  }

  // ---------- Filtros ----------
  const diasSel = select("dias", [["7", "Últimos 7 dias"], ["30", "Últimos 30 dias"], ["90", "Últimos 90 dias"]], String(dias), { "aria-label": "Período" });
  const cdSel = select("cd", [["", "Todos os CDs"], ...centros.filter((c) => c.ativo).map((c) => [c.id, `${c.codigo} — ${c.nome}`])], cdFiltro, { "aria-label": "Centro de distribuição" });
  const aplicar = () => ctx.navigate(`painel?dias=${diasSel.value}${cdSel.value ? `&cd=${cdSel.value}` : ""}`);
  diasSel.addEventListener("change", aplicar);
  cdSel.addEventListener("change", aplicar);

  // ---------- KPIs ----------
  const delta = unidadesAnterior ? Math.round(((unidadesSaida - unidadesAnterior) / unidadesAnterior) * 100) : null;
  const kpi = (rotulo, valor, extra, href) =>
    h(href ? "a" : "div", { class: "card kpi", href }, h("span", { class: "kpi-label" }, rotulo), h("strong", { class: "kpi-value" }, valor), extra && h("span", { class: "kpi-extra" }, extra));
  const zerados = linhasBaixa.filter((l) => l.q === 0).length;

  const kpis = h("div", { class: "kpi-grid" },
    kpi("Saídas no período", `${num(unidadesSaida)} un.`,
      delta === null ? "sem período anterior" : h("span", { class: delta >= 0 ? "txt-good" : "txt-critical" }, `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs. ${dias} dias anteriores`)),
    kpi("Valor das saídas", brl(receitaPeriodo), "pelo preço outlet"),
    kpi("Unidades em estoque", num(unidades), `${num(ativos.length)} SKUs ativos · ${cds.length} CD(s)`),
    kpi("Valor em estoque", brl(valor), "pelo preço outlet"),
    kpi("Itens em baixa", num(linhasBaixa.length), h("span", { class: zerados ? "txt-critical" : "" }, `${zerados} zerado(s)`), `#/estoque?status=baixo${cdFiltro ? `&cd=${cdFiltro}` : ""}`)
  );

  // ---------- Gráficos ----------
  const maxTop = Math.max(1, ...top.map((t) => t.q));
  const topChart = top.length
    ? h("ol", { class: "hbars" }, top.map(({ p, q }, i) =>
        h("li", {
          class: "hbar-row",
          onmousemove: (e) => showTip(e, `<strong>${esc(p.nome)}</strong><br>${esc(p.sku)} · ${esc(p.tamanho)} · ${esc(p.cor)}<br><b>${num(q)}</b> un. · ${brl(q * p.preco_outlet)}`),
          onmouseleave: hideTip,
        },
          h("span", { class: "hbar-rank" }, i + 1),
          h("span", { class: "hbar-label" }, h("span", { class: "swatch swatch-sm", style: { background: CORES_HEX[p.cor] || "#ccc" } }), h("span", {}, p.nome, h("small", { class: "muted" }, ` ${p.tamanho} · ${p.cor}`))),
          h("span", { class: "hbar-track" }, h("span", { class: "hbar-fill", style: { width: `${(q / maxTop) * 100}%` } })),
          h("span", { class: "hbar-value" }, num(q))
        )))
    : emptyState("Sem saídas no período.");

  const maxCat = Math.max(1, ...cats.map((c) => c[1]));
  const catChart = cats.length
    ? h("ul", { class: "hbars hbars-compact" }, cats.map(([cat, q]) =>
        h("li", { class: "hbar-row", onmousemove: (e) => showTip(e, `<strong>${esc(cat)}</strong><br><b>${num(q)}</b> un. (${Math.round((q / unidadesSaida) * 100)}%)`), onmouseleave: hideTip },
          h("span", { class: "hbar-label" }, cat),
          h("span", { class: "hbar-track" }, h("span", { class: "hbar-fill", style: { width: `${(q / maxCat) * 100}%` } })),
          h("span", { class: "hbar-value" }, num(q)))))
    : emptyState("Sem saídas no período.");

  const baixaTabela = linhasBaixa.length
    ? h("div", { class: "table-wrap" }, h("table", { class: "table table-compact" },
        h("thead", {}, h("tr", {}, h("th", {}, "Produto"), h("th", {}, "CD"), h("th", { class: "num" }, "Saldo"), h("th", { class: "num hide-sm" }, "Mín."), h("th", { class: "num hide-sm" }, "Cobertura"), h("th", {}, "Status"))),
        h("tbody", {}, linhasBaixa.slice(0, 12).map(({ p, c, q, cobertura }) => h("tr", {},
          h("td", {}, h("strong", {}, p.nome), h("small", { class: "muted block" }, `${p.sku} · ${p.tamanho} · ${p.cor}`)),
          h("td", { class: "nowrap" }, c.codigo),
          h("td", { class: "num strong" }, num(q)),
          h("td", { class: "num muted hide-sm" }, p.estoque_minimo),
          h("td", { class: "num hide-sm" }, q === 0 ? "—" : cobertura === Infinity ? "sem giro" : `${Math.max(1, Math.round(cobertura))} dia(s)`),
          h("td", {}, statusEstoque(q, p.estoque_minimo))
        )))),
        linhasBaixa.length > 12 && h("a", { class: "table-foot link", href: `#/estoque?status=baixo${cdFiltro ? `&cd=${cdFiltro}` : ""}` }, `Ver todos os ${linhasBaixa.length} itens em baixa →`))
    : emptyState("Nenhum item abaixo do mínimo. 🎉");

  return h("div", {},
    pageHeader("Painel gerencial", `Olá, ${ctx.user.nome.split(" ")[0]}. Visão de ${dias} dias${cdFiltro ? ` · ${base.cdMap.get(cdFiltro)?.codigo}` : " · todos os CDs"}.`, diasSel, cdSel),
    kpis,
    h("div", { class: "dash-grid" },
      h("section", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Mais vendidos"), h("span", { class: "muted" }, "unidades que saíram do estoque")), topChart),
      h("section", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Em baixa"), h("span", { class: "muted" }, "saldo ≤ mínimo, mais críticos primeiro")), baixaTabela),
      h("section", { class: "card span-2" }, h("div", { class: "card-head" }, h("h2", {}, "Saídas por dia"), h("span", { class: "muted" }, "unidades")), colunas(serie)),
      h("section", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Saídas por categoria"), h("span", { class: "muted" }, "unidades")), catChart)
    )
  );
}

// Gráfico de colunas em SVG (uma série), com tooltip por coluna.
function colunas(serie) {
  const W = 760, H = 220, pl = 36, pr = 8, pt = 12, pb = 26;
  const max = Math.max(1, ...serie.map((s) => s.q));
  const passo = Math.pow(10, Math.floor(Math.log10(max)));
  const topo = Math.ceil(max / passo) * passo;
  const iw = W - pl - pr, ih = H - pt - pb;
  const bw = iw / serie.length;
  const gap = Math.min(6, Math.max(2, bw * 0.25));
  const y = (v) => pt + ih - (v / topo) * ih;
  const ticks = [0, topo / 2, topo];
  const cadaLabel = Math.ceil(serie.length / 10);

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="colchart" role="img" aria-label="Saídas por dia">`;
  for (const t of ticks) svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" class="${t ? "grid" : "axis"}"/><text x="${pl - 6}" y="${y(t) + 4}" text-anchor="end" class="tick">${num(Math.round(t))}</text>`;
  serie.forEach((s, i) => {
    const x = pl + i * bw + gap / 2;
    const w = Math.max(1, bw - gap);
    const top = y(s.q);
    const hgt = pt + ih - top;
    const r = Math.min(4, w / 2, hgt);
    if (s.q > 0) svg += `<path class="bar" d="M${x},${pt + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${pt + ih} Z"/>`;
    svg += `<rect class="hit" x="${pl + i * bw}" y="${pt}" width="${bw}" height="${ih}" data-i="${i}"/>`;
    if (i % cadaLabel === 0) svg += `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle" class="tick">${dataCurta(s.d)}</text>`;
  });
  svg += "</svg>";
  const el = h("div", { class: "colchart-wrap", html: svg });
  el.addEventListener("mousemove", (e) => {
    const i = e.target.dataset?.i;
    if (i === undefined) return hideTip();
    const s = serie[i];
    el.querySelectorAll(".hit").forEach((r) => r.classList.toggle("on", r.dataset.i === i));
    showTip(e, `<strong>${s.d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</strong><br><b>${num(s.q)}</b> un. saíram`);
  });
  el.addEventListener("mouseleave", () => { hideTip(); el.querySelectorAll(".hit").forEach((r) => r.classList.remove("on")); });
  return el;
}
