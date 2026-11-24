// Carrega e cruza produtos, centros e estoque (usado por várias telas).
import { h, modal, field, select, formData, toast } from "../ui.js";

export async function carregarBase(api) {
  const [produtos, centros, estoque] = await Promise.all([api.listarProdutos(), api.listarCentros(), api.listarEstoque()]);
  const prodMap = new Map(produtos.map((p) => [p.id, p]));
  const cdMap = new Map(centros.map((c) => [c.id, c]));
  const saldo = new Map(); // `${produto}|${cd}` -> qtd
  const totalProduto = new Map();
  for (const e of estoque) {
    saldo.set(`${e.produto_id}|${e.centro_id}`, e.quantidade);
    totalProduto.set(e.produto_id, (totalProduto.get(e.produto_id) || 0) + e.quantidade);
  }
  return { produtos, centros, estoque, prodMap, cdMap, saldo, totalProduto };
}

export const TIPOS = {
  entrada: { label: "Entrada", icone: "↓", classe: "good" },
  saida: { label: "Saída", icone: "↑", classe: "accent" },
  transferencia: { label: "Transferência", icone: "⇄", classe: "info" },
  ajuste: { label: "Ajuste de inventário", icone: "≡", classe: "neutral" },
};

export const rotuloProduto = (p) => `${p.sku} — ${p.nome} · ${p.tamanho} · ${p.cor}`;

// Formulário de movimentação (entrada, saída, transferência, ajuste).
export function abrirMovimentacao({ api, user }, base, inicial = {}, aoConcluir) {
  const tipos = Object.entries(TIPOS).filter(([k]) => k !== "ajuste" || user.perfil === "gerente").map(([k, v]) => [k, v.label]);
  const ativosCd = base.centros.filter((c) => c.ativo);
  const opCd = [["", "Selecione…"], ...ativosCd.map((c) => [c.id, `${c.codigo} — ${c.nome}`])];

  const categorias = [...new Set(base.produtos.map((p) => p.categoria))].sort();
  const prodSelect = h(
    "select",
    { name: "produto_id", required: true },
    h("option", { value: "" }, "Selecione o produto…"),
    categorias.map((cat) =>
      h("optgroup", { label: cat }, base.produtos.filter((p) => p.ativo && p.categoria === cat).map((p) => h("option", { value: p.id, selected: p.id === inicial.produto_id }, rotuloProduto(p))))
    )
  );
  const tipo = select("tipo", tipos, inicial.tipo || "saida");
  const origem = select("centro_origem_id", opCd, inicial.centro_id);
  const destino = select("centro_destino_id", opCd, inicial.tipo === "transferencia" ? "" : inicial.centro_id);
  const qtd = h("input", { name: "quantidade", type: "number", min: "0", step: "1", required: true, value: "1" });
  const saldoInfo = h("div", { class: "saldo-info" });

  const fOrigem = field("CD de origem", origem);
  const fDestino = field("CD de destino", destino);
  const fQtd = field("Quantidade", qtd);

  const atualizar = () => {
    const t = tipo.value;
    fOrigem.hidden = !(t === "saida" || t === "transferencia");
    fDestino.hidden = !(t === "entrada" || t === "transferencia" || t === "ajuste");
    fDestino.querySelector(".field-label").textContent = t === "ajuste" ? "CD contado" : "CD de destino";
    fQtd.querySelector(".field-label").textContent = t === "ajuste" ? "Quantidade contada (nova)" : "Quantidade";
    qtd.min = t === "ajuste" ? "0" : "1";
    const p = prodSelect.value;
    if (!p) return saldoInfo.replaceChildren();
    saldoInfo.replaceChildren(
      h("span", { class: "muted" }, "Saldo atual: "),
      ativosCd.map((c) => h("span", { class: "chip" }, `${c.codigo}: ${base.saldo.get(`${p}|${c.id}`) || 0}`))
    );
  };
  [tipo, prodSelect].forEach((el) => el.addEventListener("change", atualizar));

  const btn = h("button", { class: "btn btn-primary", type: "submit" }, "Registrar");
  const form = h(
    "form",
    {
      class: "form-grid",
      onsubmit: async (e) => {
        e.preventDefault();
        const d = formData(form);
        if (fOrigem.hidden) d.centro_origem_id = null;
        if (fDestino.hidden) d.centro_destino_id = null;
        btn.disabled = true;
        try {
          await api.registrarMovimentacao(d);
          toast(`${TIPOS[d.tipo].label} registrada com sucesso.`);
          m.close();
          aoConcluir?.();
        } catch (err) {
          toast(err.message, "erro");
          btn.disabled = false;
        }
      },
    },
    field("Tipo", tipo),
    field("Produto", prodSelect, { full: true }),
    h("div", { class: "field-full" }, saldoInfo),
    fOrigem,
    fDestino,
    fQtd,
    field("Observação", h("input", { name: "observacao", placeholder: "Ex.: pedido #1234, NF do fornecedor…" }), { full: true }),
    h("div", { class: "form-actions field-full" }, h("button", { type: "button", class: "btn btn-ghost", onclick: () => m.close() }, "Cancelar"), btn)
  );
  atualizar();
  const m = modal("Nova movimentação", form);
}
