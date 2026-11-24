import { h, brl, num, pageHeader, select, field, formData, modal, toast, badge, emptyState } from "../ui.js";
import { carregarBase } from "./dados.js";
import { CATEGORIAS, TAMANHOS, CORES_HEX } from "../seed.js";

// Converte "chave: valor" (uma por linha) <-> objeto. Usado nos campos extras
// enquanto os campos definitivos dos produtos não são definidos.
const extrasParaTexto = (o) => Object.entries(o || {}).map(([k, v]) => `${k}: ${v}`).join("\n");
const textoParaExtras = (t) =>
  Object.fromEntries(t.split("\n").map((l) => l.split(":")).filter((p) => p.length >= 2 && p[0].trim()).map(([k, ...v]) => [k.trim(), v.join(":").trim()]));

export async function render(ctx) {
  const base = await carregarBase(ctx.api);
  const { produtos, totalProduto } = base;
  const gerente = ctx.user.perfil === "gerente";
  const categorias = [...new Set([...CATEGORIAS, ...produtos.map((p) => p.categoria)])];

  const f = { busca: "", categoria: "", ativos: "1" };
  const busca = h("input", { type: "search", placeholder: "Buscar por SKU, nome, marca, cor…", "aria-label": "Buscar" });
  const catSel = select("categoria", [["", "Todas as categorias"], ...categorias], "", { "aria-label": "Categoria" });
  const atSel = select("ativos", [["1", "Somente ativos"], ["0", "Somente inativos"], ["", "Todos"]], "1", { "aria-label": "Situação" });
  const tabela = h("div", { class: "table-wrap" });
  const resumo = h("div", { class: "table-summary" });

  function desenhar() {
    const q = f.busca.toLowerCase();
    const rows = produtos.filter((p) => {
      if (f.categoria && p.categoria !== f.categoria) return false;
      if (f.ativos === "1" && !p.ativo) return false;
      if (f.ativos === "0" && p.ativo) return false;
      if (q && ![p.sku, p.nome, p.marca, p.cor, p.tamanho].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
    resumo.replaceChildren(h("span", {}, h("strong", {}, num(rows.length)), " produtos (SKUs)"), h("span", {}, h("strong", {}, num(new Set(rows.map((p) => p.nome)).size)), " modelos"));
    if (!rows.length) return tabela.replaceChildren(emptyState("Nenhum produto encontrado."));
    tabela.replaceChildren(
      h("table", { class: "table" },
        h("thead", {}, h("tr", {}, h("th", {}, "Produto"), h("th", {}, "Categoria"), h("th", {}, "Tam."), h("th", {}, "Cor"), h("th", { class: "num" }, "Preço original"), h("th", { class: "num" }, "Preço outlet"), h("th", { class: "num" }, "Estoque total"), h("th", { class: "num" }, "Mín./CD"), h("th", {}, "Situação"), gerente && h("th", {}, ""))),
        h("tbody", {}, rows.map((p) => {
          const desc = p.preco_original ? Math.round((1 - p.preco_outlet / p.preco_original) * 100) : 0;
          return h("tr", {},
            h("td", {}, h("div", { class: "prod-cell" }, p.imagem_url ? h("img", { class: "thumb", src: p.imagem_url, alt: "" }) : h("span", { class: "swatch", style: { background: CORES_HEX[p.cor] || "#ccc" } }), h("div", {}, h("strong", {}, p.nome), h("small", { class: "muted" }, `${p.sku} · ${p.marca}`)))),
            h("td", {}, p.categoria),
            h("td", {}, p.tamanho),
            h("td", {}, p.cor),
            h("td", { class: "num muted" }, h("s", {}, brl(p.preco_original))),
            h("td", { class: "num strong" }, brl(p.preco_outlet), desc > 0 && h("small", { class: "desconto" }, ` -${desc}%`)),
            h("td", { class: "num" }, num(totalProduto.get(p.id) || 0)),
            h("td", { class: "num muted" }, p.estoque_minimo),
            h("td", {}, p.ativo ? badge("Ativo", "good") : badge("Inativo", "neutral")),
            gerente && h("td", { class: "actions" }, h("button", { class: "btn btn-sm btn-ghost", onclick: () => editar(p) }, "Editar"))
          );
        }))
      )
    );
  }

  function editar(p = {}) {
    const novo = !p.id;
    const btn = h("button", { class: "btn btn-primary", type: "submit" }, novo ? "Cadastrar produto" : "Salvar alterações");
    const proximoSku = () => {
      const n = Math.max(0, ...produtos.map((x) => Number(String(x.sku).replace(/\D/g, "")) || 0)) + 1;
      return `DM-${String(n).padStart(4, "0")}`;
    };
    const form = h("form", {
      class: "form-grid",
      onsubmit: async (e) => {
        e.preventDefault();
        const d = formData(form);
        const dados = {
          ...(p.id ? { id: p.id } : {}),
          sku: d.sku.toUpperCase(), nome: d.nome, categoria: d.categoria, marca: d.marca, tamanho: d.tamanho, cor: d.cor,
          preco_original: d.preco_original || 0, preco_outlet: d.preco_outlet || 0, estoque_minimo: d.estoque_minimo ?? 0,
          imagem_url: d.imagem_url, ativo: d.ativo, atributos: textoParaExtras(d.atributos),
        };
        if (dados.preco_outlet > dados.preco_original && dados.preco_original > 0) return toast("O preço outlet não pode ser maior que o original.", "erro");
        btn.disabled = true;
        try {
          await ctx.api.salvarProduto(dados);
          toast(novo ? "Produto cadastrado." : "Produto atualizado.");
          m.close();
          ctx.refresh();
        } catch (err) {
          toast(err.message, "erro");
          btn.disabled = false;
        }
      },
    },
      h("h3", { class: "field-full form-section" }, "Identificação"),
      field("SKU", h("input", { name: "sku", required: true, value: p.sku || proximoSku(), maxlength: 30 })),
      field("Nome do produto", h("input", { name: "nome", required: true, value: p.nome || "", placeholder: "Ex.: Camiseta Básica Algodão" })),
      field("Categoria", select("categoria", categorias, p.categoria || categorias[0])),
      field("Marca", h("input", { name: "marca", value: p.marca || "", placeholder: "Ex.: Urbana" })),
      field("Tamanho", select("tamanho", TAMANHOS, p.tamanho || "M")),
      field("Cor", h("input", { name: "cor", value: p.cor || "", list: "cores-sugeridas", placeholder: "Ex.: Preta" })),
      h("datalist", { id: "cores-sugeridas" }, Object.keys(CORES_HEX).map((c) => h("option", { value: c }))),
      h("h3", { class: "field-full form-section" }, "Preço e estoque"),
      field("Preço original (R$)", h("input", { name: "preco_original", type: "number", min: "0", step: "0.01", value: p.preco_original ?? "" })),
      field("Preço outlet (R$)", h("input", { name: "preco_outlet", type: "number", min: "0", step: "0.01", required: true, value: p.preco_outlet ?? "" })),
      field("Estoque mínimo por CD", h("input", { name: "estoque_minimo", type: "number", min: "0", step: "1", value: p.estoque_minimo ?? 5 }), { hint: "Abaixo disso o item aparece como “em baixa”." }),
      field("URL da foto (opcional)", h("input", { name: "imagem_url", type: "url", value: p.imagem_url || "", placeholder: "https://…" })),
      field("Campos adicionais", h("textarea", { name: "atributos", rows: 3, placeholder: "tecido: algodão\ncoleção: verão 2026" }, extrasParaTexto(p.atributos)), { full: true, hint: "Um por linha, no formato campo: valor. Espaço reservado para os campos definitivos." }),
      h("label", { class: "check field-full" }, h("input", { type: "checkbox", name: "ativo", checked: p.ativo !== false }), " Produto ativo (aparece nas movimentações)"),
      h("div", { class: "form-actions field-full" }, h("button", { type: "button", class: "btn btn-ghost", onclick: () => m.close() }, "Cancelar"), btn)
    );
    const m = modal(novo ? "Cadastrar produto" : `Editar ${p.sku}`, form, { wide: true });
  }

  busca.addEventListener("input", () => { f.busca = busca.value; desenhar(); });
  catSel.addEventListener("change", () => { f.categoria = catSel.value; desenhar(); });
  atSel.addEventListener("change", () => { f.ativos = atSel.value; desenhar(); });
  desenhar();

  return h("div", {},
    pageHeader("Produtos", gerente ? "Cadastro de produtos do outlet. Cada tamanho/cor é um SKU." : "Catálogo de produtos (somente consulta).",
      gerente && h("button", { class: "btn btn-primary", onclick: () => editar() }, "+ Cadastrar produto")),
    h("div", { class: "filters card" }, busca, catSel, atSel),
    resumo,
    h("div", { class: "card card-flush" }, tabela)
  );
}
