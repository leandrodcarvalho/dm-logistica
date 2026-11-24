import { h, logo } from "../ui.js";

export function render({ api, onLogin }) {
  const erro = h("div", { class: "form-error", role: "alert", hidden: true });
  const btn = h("button", { class: "btn btn-primary btn-block", type: "submit" }, "Entrar");
  const email = h("input", { name: "email", type: "email", autocomplete: "username", required: true, placeholder: "voce@empresa.com" });
  const senha = h("input", { name: "senha", type: "password", autocomplete: "current-password", required: true, placeholder: "••••••" });

  const entrar = async (e) => {
    e?.preventDefault();
    erro.hidden = true;
    btn.disabled = true;
    btn.textContent = "Entrando…";
    try {
      const u = await api.login(email.value, senha.value);
      onLogin(u);
    } catch (err) {
      erro.textContent = err.message;
      erro.hidden = false;
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  };

  const preencher = (e, s) => () => {
    email.value = e;
    senha.value = s;
    entrar();
  };

  return h(
    "div",
    { class: "login-page" },
    h(
      "section",
      { class: "login-art", "aria-hidden": "true" },
      h("div", { class: "login-art-inner" },
        h("p", { class: "eyebrow" }, "Outlet · Moda"),
        h("h2", {}, "Estoque certo, no CD certo, na hora certa."),
        h("p", {}, "Cadastre produtos, acompanhe saldos por centro de distribuição e veja o que mais sai e o que está acabando."),
        h("div", { class: "hangers" }, ...["#e2725b", "#f6f1e9", "#c9a96e", "#8fb3d9", "#e9a8b8"].map((c, i) =>
          h("span", { class: "tag-swatch", style: { background: c, transform: `rotate(${(i - 2) * 6}deg)` } })
        ))
      )
    ),
    h(
      "section",
      { class: "login-form-wrap" },
      h(
        "form",
        { class: "login-card", onsubmit: entrar },
        h("div", { class: "brand brand-lg" }, logo(48), h("div", {}, h("strong", {}, "DM Logístic"), h("small", {}, "Controle de estoque e logística"))),
        h("h1", {}, "Entrar"),
        h("label", { class: "field" }, h("span", { class: "field-label" }, "E-mail"), email),
        h("label", { class: "field" }, h("span", { class: "field-label" }, "Senha"), senha),
        erro,
        btn,
        api.modo === "demo" &&
          h(
            "div",
            { class: "demo-access" },
            h("p", { class: "muted" }, "Acesso de demonstração (senha demo123):"),
            h("div", { class: "demo-buttons" },
              h("button", { type: "button", class: "btn btn-ghost", onclick: preencher("gerente@dmlogistic.com", "demo123") }, "Entrar como Gerente"),
              h("button", { type: "button", class: "btn btn-ghost", onclick: preencher("funcionario@dmlogistic.com", "demo123") }, "Entrar como Funcionário")
            )
          )
      )
    )
  );
}
