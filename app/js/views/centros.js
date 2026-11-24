import { h, brl, num, pageHeader, field, formData, modal, toast, badge, select } from "../ui.js";
import { carregarBase } from "./dados.js";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

export async function render(ctx) {
  const base = await carregarBase(ctx.api);
  const { centros, produtos, saldo } = base;

  const card = (c) => {
    let un = 0, valor = 0, skus = 0, baixos = 0;
    for (const p of produtos) {
      if (!p.ativo) continue;
      const q = saldo.get(`${p.id}|${c.id}`) || 0;
      un += q;
      valor += q * p.preco_outlet;
      if (q > 0) skus++;
      if (q <= p.estoque_minimo) baixos++;
    }
    return h("article", { class: `card cd-card ${c.ativo ? "" : "inativo"}` },
      h("div", { class: "cd-head" },
        h("div", {}, h("span", { class: "cd-code" }, c.codigo), h("h3", {}, c.nome), h("p", { class: "muted" }, `${c.cidade}/${c.uf}`, c.endereco && ` · ${c.endereco}`)),
        c.ativo ? badge("Ativo", "good") : badge("Inativo", "neutral")
      ),
      h("dl", { class: "cd-stats" },
        h("div", {}, h("dt", {}, "Unidades"), h("dd", {}, num(un))),
        h("div", {}, h("dt", {}, "SKUs com saldo"), h("dd", {}, num(skus))),
        h("div", {}, h("dt", {}, "Valor (outlet)"), h("dd", {}, brl(valor))),
        h("div", {}, h("dt", {}, "Itens em baixa"), h("dd", { class: baixos ? "txt-warning" : "" }, baixos ? `▼ ${num(baixos)}` : "0"))
      ),
      h("div", { class: "cd-foot" },
        h("span", { class: "muted" }, c.responsavel ? `Responsável: ${c.responsavel}` : ""),
        h("div", { class: "row-gap" },
          h("a", { class: "btn btn-sm btn-ghost", href: `#/estoque?cd=${c.id}` }, "Ver estoque"),
          h("button", { class: "btn btn-sm btn-ghost", onclick: () => editar(c) }, "Editar"))
      )
    );
  };

  function editar(c = {}) {
    const novo = !c.id;
    const btn = h("button", { class: "btn btn-primary", type: "submit" }, novo ? "Cadastrar CD" : "Salvar");
    const form = h("form", {
      class: "form-grid",
      onsubmit: async (e) => {
        e.preventDefault();
        const d = formData(form);
        btn.disabled = true;
        try {
          await ctx.api.salvarCentro({ ...(c.id ? { id: c.id } : {}), ...d, codigo: d.codigo.toUpperCase() });
          toast(novo ? "Centro de distribuição cadastrado." : "Centro atualizado.");
          m.close();
          ctx.refresh();
        } catch (err) {
          toast(err.message, "erro");
          btn.disabled = false;
        }
      },
    },
      field("Código", h("input", { name: "codigo", required: true, value: c.codigo || "", placeholder: "CD-RJ", maxlength: 12 })),
      field("Nome", h("input", { name: "nome", required: true, value: c.nome || "", placeholder: "CD Duque de Caxias" })),
      field("Cidade", h("input", { name: "cidade", required: true, value: c.cidade || "" })),
      field("UF", select("uf", UFS, c.uf || "SP")),
      field("Endereço", h("input", { name: "endereco", value: c.endereco || "" }), { full: true }),
      field("Responsável", h("input", { name: "responsavel", value: c.responsavel || "" })),
      h("label", { class: "check" }, h("input", { type: "checkbox", name: "ativo", checked: c.ativo !== false }), " CD ativo"),
      h("div", { class: "form-actions field-full" }, h("button", { type: "button", class: "btn btn-ghost", onclick: () => m.close() }, "Cancelar"), btn)
    );
    const m = modal(novo ? "Cadastrar centro de distribuição" : `Editar ${c.codigo}`, form, { wide: true });
  }

  return h("div", {},
    pageHeader("Centros de distribuição", "Onde o estoque fica armazenado.", h("button", { class: "btn btn-primary", onclick: () => editar() }, "+ Cadastrar CD")),
    h("div", { class: "cd-grid" }, centros.map(card))
  );
}
