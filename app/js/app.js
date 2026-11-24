// DM Logístic — inicialização, rotas e layout.
import { api } from "./api/index.js";
import { h, toast, logo } from "./ui.js";
import { APP_NAME } from "./config.js";
import * as login from "./views/login.js";
import * as painel from "./views/painel.js";
import * as estoque from "./views/estoque.js";
import * as movimentacoes from "./views/movimentacoes.js";
import * as produtos from "./views/produtos.js";
import * as centros from "./views/centros.js";
import * as usuarios from "./views/usuarios.js";

const ICON = {
  painel: '<path d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z"/>',
  estoque: '<path d="M20 7l-8-4-8 4v10l8 4 8-4zM12 5.2 17.6 8 12 10.8 6.4 8zM6 9.6l5 2.5v6.3l-5-2.5zm7 8.8v-6.3l5-2.5v6.3z"/>',
  movimentacoes: '<path d="M7 7h11l-3-3 1.4-1.4L22 8l-5.6 5.4L15 12l3-3H7zm10 10H6l3 3-1.4 1.4L2 16l5.6-5.4L9 12l-3 3h11z"/>',
  produtos: '<path d="M16 3l5 3-2 4-2-1v12H7V9L5 10 3 6l5-3c.5 1.5 2 2.5 4 2.5S15.5 4.5 16 3z"/>',
  centros: '<path d="M12 2 2 7v14h6v-7h8v7h6V7zm-2 19v-5h4v5z"/>',
  usuarios: '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-7 1.7-7 4v3h14v-3c0-2.3-3.7-4-7-4zm8-2a3 3 0 1 0 0-6v6zm1.5 2.1c1.5.8 2.5 2 2.5 3.4V20h2v-3.5c0-1.6-1.9-2.9-4.5-3.4z"/>',
};

const ROTAS = {
  painel: { titulo: "Painel gerencial", view: painel, perfis: ["gerente"] },
  estoque: { titulo: "Consulta de estoque", view: estoque, perfis: ["gerente", "funcionario"] },
  movimentacoes: { titulo: "Movimentações", view: movimentacoes, perfis: ["gerente", "funcionario"] },
  produtos: { titulo: "Produtos", view: produtos, perfis: ["gerente", "funcionario"] },
  centros: { titulo: "Centros de distribuição", view: centros, perfis: ["gerente"] },
  usuarios: { titulo: "Usuários", view: usuarios, perfis: ["gerente"] },
};

const state = { user: null };
const root = document.getElementById("app");

const inicial = (u) => (u.perfil === "gerente" ? "painel" : "estoque");
export const navigate = (rota) => (location.hash = `#/${rota}`);

function rotaAtual() {
  const [rota, query] = location.hash.replace(/^#\/?/, "").split("?");
  return { rota: rota || "", params: new URLSearchParams(query || "") };
}

async function render() {
  const { rota, params } = rotaAtual();
  if (!state.user) {
    if (rota !== "login") return navigate("login");
    root.replaceChildren(login.render({ api, onLogin }));
    document.title = `Entrar · ${APP_NAME}`;
    return;
  }
  const def = ROTAS[rota];
  if (!def) return navigate(inicial(state.user));
  if (!def.perfis.includes(state.user.perfil)) {
    toast("Seu perfil não tem acesso a esta tela.", "erro");
    return navigate(inicial(state.user));
  }
  document.title = `${def.titulo} · ${APP_NAME}`;
  const main = h("main", { class: "content", id: "conteudo" }, h("div", { class: "loading" }, "Carregando…"));
  root.replaceChildren(layout(rota, main));
  try {
    const el = await def.view.render({ api, user: state.user, params, navigate, refresh: render });
    if (rotaAtual().rota === rota) main.replaceChildren(el);
  } catch (e) {
    console.error(e);
    main.replaceChildren(h("div", { class: "card error-card" }, h("h2", {}, "Não foi possível carregar"), h("p", {}, e.message)));
  }
}

function layout(rotaAtiva, main) {
  const u = state.user;
  const itens = Object.entries(ROTAS).filter(([, d]) => d.perfis.includes(u.perfil));
  const link = ([rota, d]) =>
    h(
      "a",
      { href: `#/${rota}`, class: `nav-link ${rota === rotaAtiva ? "active" : ""}`, "aria-current": rota === rotaAtiva ? "page" : null },
      h("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", html: ICON[rota] }),
      h("span", {}, d.titulo.replace("Consulta de estoque", "Estoque").replace("Centros de distribuição", "Centros (CDs)").replace("Painel gerencial", "Painel"))
    );
  return h(
    "div",
    { class: "shell" },
    h(
      "aside",
      { class: "sidebar" },
      h("div", { class: "brand" }, logo(), h("div", {}, h("strong", {}, "DM Logístic"), h("small", {}, "Outlet · Estoque"))),
      h("nav", { class: "nav", "aria-label": "Menu principal" }, itens.map(link)),
      h(
        "div",
        { class: "user-card" },
        h("div", { class: "avatar", "aria-hidden": "true" }, u.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")),
        h("div", { class: "user-info" }, h("strong", {}, u.nome), h("span", { class: `perfil perfil-${u.perfil}` }, u.perfil === "gerente" ? "Gerencial" : "Funcionário")),
        h("button", { class: "icon-btn", title: "Sair", "aria-label": "Sair", onclick: sair }, h("svg", { viewBox: "0 0 24 24", html: '<path d="M10 17l1.4-1.4-2.6-2.6H20v-2H8.8l2.6-2.6L10 7l-5 5zM4 5h8V3H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h8v-2H4z"/>' }))
      )
    ),
    h(
      "div",
      { class: "main-col" },
      api.modo === "demo" && h("div", { class: "demo-bar" }, "Modo demonstração — os dados ficam salvos apenas neste navegador."),
      main
    ),
    h("nav", { class: "bottom-nav", "aria-label": "Menu" }, itens.map(link), h("button", { class: "nav-link", onclick: sair }, h("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", html: '<path d="M10 17l1.4-1.4-2.6-2.6H20v-2H8.8l2.6-2.6L10 7l-5 5zM4 5h8V3H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h8v-2H4z"/>' }), h("span", {}, "Sair")))
  );
}

async function onLogin(user) {
  state.user = user;
  toast(`Bem-vindo(a), ${user.nome.split(" ")[0]}!`);
  navigate(inicial(user));
  render();
}

async function sair() {
  await api.logout();
  state.user = null;
  navigate("login");
}

window.addEventListener("hashchange", render);

(async function boot() {
  try {
    state.user = await api.init();
  } catch (e) {
    console.error(e);
  }
  render();
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
