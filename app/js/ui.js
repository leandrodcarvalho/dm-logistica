// Utilitários de interface: criação de elementos, modais, toasts e formatação.

export function h(tag, attrs = {}, ...children) {
  const el = tag === "svg" ? document.createElementNS("http://www.w3.org/2000/svg", "svg") : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.setAttribute("class", v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") el.innerHTML = v;
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const brl = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const num = (n) => Number(n || 0).toLocaleString("pt-BR");
export const dataHora = (iso) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
export const dataCurta = (d) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export function toast(msg, tipo = "ok") {
  const box = document.getElementById("toasts");
  const t = h("div", { class: `toast toast-${tipo}` }, msg);
  box.append(t);
  setTimeout(() => t.classList.add("out"), 3200);
  setTimeout(() => t.remove(), 3600);
}

// Modal simples. `content` é um elemento; retorna { close }.
export function modal(titulo, content, { wide = false } = {}) {
  const prev = document.activeElement;
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    prev?.focus?.();
  };
  const onKey = (e) => e.key === "Escape" && close();
  const overlay = h(
    "div",
    { class: "modal-overlay", onclick: (e) => e.target === overlay && close() },
    h(
      "div",
      { class: `modal ${wide ? "modal-wide" : ""}`, role: "dialog", "aria-modal": "true", "aria-label": titulo },
      h("div", { class: "modal-head" }, h("h2", {}, titulo), h("button", { class: "icon-btn", "aria-label": "Fechar", onclick: close }, "✕")),
      h("div", { class: "modal-body" }, content)
    )
  );
  document.body.append(overlay);
  document.addEventListener("keydown", onKey);
  setTimeout(() => overlay.querySelector("input,select,textarea,button:not(.icon-btn)")?.focus(), 30);
  return { close };
}

export function confirmar(msg) {
  return new Promise((resolve) => {
    let m;
    const body = h(
      "div",
      {},
      h("p", {}, msg),
      h(
        "div",
        { class: "form-actions" },
        h("button", { class: "btn btn-ghost", onclick: () => { m.close(); resolve(false); } }, "Cancelar"),
        h("button", { class: "btn btn-danger", onclick: () => { m.close(); resolve(true); } }, "Confirmar")
      )
    );
    m = modal("Confirmação", body);
  });
}

// Campo de formulário com rótulo.
export function field(label, input, { hint, full } = {}) {
  return h("label", { class: `field ${full ? "field-full" : ""}` }, h("span", { class: "field-label" }, label), input, hint && h("small", { class: "field-hint" }, hint));
}

export function select(name, options, value, attrs = {}) {
  return h(
    "select",
    { name, ...attrs },
    options.map((o) => {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      return h("option", { value: v, selected: String(v) === String(value ?? "") }, l);
    })
  );
}

export function formData(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "checkbox") out[el.name] = el.checked;
    else if (el.type === "number") out[el.name] = el.value === "" ? null : Number(el.value);
    else out[el.name] = el.value.trim();
  }
  return out;
}

export function emptyState(texto) {
  return h("div", { class: "empty" }, texto);
}

export function badge(texto, tipo = "neutral") {
  return h("span", { class: `badge badge-${tipo}` }, texto);
}

// Status de estoque — sempre ícone + texto, nunca só cor.
export function statusEstoque(qtd, minimo) {
  if (qtd <= 0) return badge("✕ Zerado", "critical");
  if (qtd <= minimo) return badge("▼ Baixo", "warning");
  return badge("✓ OK", "good");
}

export function pageHeader(titulo, subtitulo, ...acoes) {
  return h(
    "div",
    { class: "page-head" },
    h("div", {}, h("h1", {}, titulo), subtitulo && h("p", { class: "muted" }, subtitulo)),
    h("div", { class: "page-actions" }, acoes)
  );
}

// Tooltip compartilhado para os gráficos.
let tipEl;
export function showTip(e, html) {
  if (!tipEl) {
    tipEl = h("div", { class: "chart-tip", role: "tooltip" });
    document.body.append(tipEl);
  }
  tipEl.innerHTML = html;
  tipEl.style.display = "block";
  const pad = 14;
  const r = tipEl.getBoundingClientRect();
  let x = e.clientX + pad;
  let y = e.clientY + pad;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - pad;
  if (y + r.height > innerHeight - 8) y = e.clientY - r.height - pad;
  tipEl.style.left = x + "px";
  tipEl.style.top = y + "px";
}
export function hideTip() {
  if (tipEl) tipEl.style.display = "none";
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function logo(size = 36) {
  return h("svg", {
    class: "logo", width: size, height: size, viewBox: "0 0 64 64", "aria-hidden": "true",
    html: '<rect width="64" height="64" rx="16" fill="#1f1b2e"/><path d="M14 18h12c9 0 15 5.5 15 14s-6 14-15 14H14zm7 6v16h5c5 0 8-3 8-8s-3-8-8-8z" fill="#f6f1e9"/><path d="M40 46V18h5l5 9 5-9h3v28h-6V30l-2 4h-2l-3-5v17z" fill="#e2725b"/>',
  });
}
