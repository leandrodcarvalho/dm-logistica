import { h, pageHeader, field, formData, modal, toast, badge, select, confirmar } from "../ui.js";

export async function render(ctx) {
  const usuarios = await ctx.api.listarUsuarios();
  const demo = ctx.api.modo === "demo";

  function editar(u = {}) {
    const novo = !u.id;
    const btn = h("button", { class: "btn btn-primary", type: "submit" }, novo ? "Criar usuário" : "Salvar");
    const form = h("form", {
      class: "form-grid",
      onsubmit: async (e) => {
        e.preventDefault();
        const d = formData(form);
        btn.disabled = true;
        try {
          await ctx.api.salvarUsuario({ ...(u.id ? { id: u.id } : {}), ...d, email: d.email || u.email });
          toast(novo ? "Usuário criado." : "Usuário atualizado.");
          m.close();
          ctx.refresh();
        } catch (err) {
          toast(err.message, "erro");
          btn.disabled = false;
        }
      },
    },
      field("Nome", h("input", { name: "nome", required: true, value: u.nome || "" })),
      field("E-mail", h("input", { name: "email", type: "email", required: true, value: u.email || "", disabled: !novo })),
      field("Perfil", select("perfil", [["funcionario", "Funcionário"], ["gerente", "Gerencial"]], u.perfil || "funcionario"), { hint: "Gerencial: tudo. Funcionário: estoque, movimentações e consulta de produtos." }),
      demo && field(novo ? "Senha" : "Nova senha (opcional)", h("input", { name: "senha", type: "password", minlength: 6, required: novo, autocomplete: "new-password" })),
      h("label", { class: "check field-full" }, h("input", { type: "checkbox", name: "ativo", checked: u.ativo !== false }), " Acesso ativo"),
      h("div", { class: "form-actions field-full" }, h("button", { type: "button", class: "btn btn-ghost", onclick: () => m.close() }, "Cancelar"), btn)
    );
    const m = modal(novo ? "Novo usuário" : `Editar ${u.nome}`, form, { wide: true });
  }

  const resetar = async () => {
    if (!(await confirmar("Isso apaga tudo o que foi feito neste navegador e recria os dados de exemplo. Continuar?"))) return;
    await ctx.api.resetarDemo();
    toast("Dados de demonstração recriados.");
    location.hash = "#/painel";
    location.reload();
  };

  return h("div", {},
    pageHeader("Usuários", "Quem acessa o sistema e com qual perfil.",
      demo && h("button", { class: "btn btn-ghost", onclick: resetar }, "Resetar dados demo"),
      h("button", { class: "btn btn-primary", onclick: () => (demo ? editar() : toast("Crie o usuário no Supabase: Authentication > Users > Add user. Depois ajuste o perfil aqui.", "info")) }, "+ Novo usuário")),
    h("div", { class: "card card-flush" }, h("div", { class: "table-wrap" },
      h("table", { class: "table" },
        h("thead", {}, h("tr", {}, h("th", {}, "Nome"), h("th", {}, "E-mail"), h("th", {}, "Perfil"), h("th", {}, "Acesso"), h("th", {}, ""))),
        h("tbody", {}, usuarios.map((u) => h("tr", {},
          h("td", {}, h("strong", {}, u.nome), u.id === ctx.user.id && h("small", { class: "muted" }, " (você)")),
          h("td", {}, u.email),
          h("td", {}, h("span", { class: `perfil perfil-${u.perfil}` }, u.perfil === "gerente" ? "Gerencial" : "Funcionário")),
          h("td", {}, u.ativo ? badge("Ativo", "good") : badge("Bloqueado", "neutral")),
          h("td", { class: "actions" }, h("button", { class: "btn btn-sm btn-ghost", onclick: () => editar(u) }, "Editar"))
        )))
      )
    ))
  );
}
