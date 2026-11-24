// Gera os dados de exemplo (temática: outlet de roupas).
// Determinístico: a mesma semente sempre gera o mesmo conjunto.

function prng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CATEGORIAS = ["Camisetas", "Camisas", "Calças", "Bermudas", "Vestidos", "Saias", "Jaquetas", "Moletons", "Calçados", "Acessórios"];
export const TAMANHOS = ["PP", "P", "M", "G", "GG", "XGG", "34", "36", "38", "40", "42", "44", "46", "U"];

const MODELOS = [
  // nome, categoria, marca, tamanhos, cores, preço original, desconto outlet, popularidade
  ["Camiseta Básica Algodão", "Camisetas", "Urbana", ["P", "M", "G"], ["Branca", "Preta"], 79.9, 0.45, 3.2],
  ["Camiseta Estampada Praia", "Camisetas", "Costa Azul", ["M", "G"], ["Azul"], 89.9, 0.5, 1.6],
  ["Camisa Linho Manga Longa", "Camisas", "Linho & Co", ["M", "G"], ["Areia"], 249.9, 0.4, 1.1],
  ["Camisa Social Slim", "Camisas", "Vértice", ["P", "M", "G"], ["Branca"], 199.9, 0.5, 1.3],
  ["Calça Jeans Reta", "Calças", "Urbana", ["38", "40", "42", "44"], ["Azul Escuro"], 229.9, 0.45, 2.4],
  ["Calça Alfaiataria", "Calças", "Vértice", ["38", "40", "42"], ["Grafite"], 289.9, 0.5, 0.8],
  ["Bermuda Sarja", "Bermudas", "Costa Azul", ["40", "42"], ["Cáqui", "Verde Oliva"], 139.9, 0.4, 1.5],
  ["Vestido Midi Floral", "Vestidos", "Flora", ["P", "M", "G"], ["Estampado"], 279.9, 0.55, 2.0],
  ["Vestido Tubinho", "Vestidos", "Vértice", ["P", "M"], ["Preto"], 239.9, 0.5, 1.0],
  ["Saia Plissada", "Saias", "Flora", ["P", "M"], ["Rosa"], 159.9, 0.5, 0.9],
  ["Jaqueta Jeans", "Jaquetas", "Urbana", ["M", "G"], ["Azul Claro"], 329.9, 0.45, 0.9],
  ["Jaqueta Corta-Vento", "Jaquetas", "Nórdica", ["M", "G", "GG"], ["Preta"], 399.9, 0.5, 0.6],
  ["Moletom Canguru", "Moletons", "Nórdica", ["P", "M", "G"], ["Cinza Mescla"], 219.9, 0.45, 1.7],
  ["Tênis Casual Couro", "Calçados", "Passo Firme", ["38", "40", "42"], ["Branco"], 349.9, 0.4, 1.4],
  ["Sandália Rasteira", "Calçados", "Flora", ["36", "38"], ["Caramelo"], 129.9, 0.5, 1.2],
  ["Boné Aba Curva", "Acessórios", "Urbana", ["U"], ["Preto", "Bege"], 69.9, 0.4, 1.1],
  ["Cinto Couro", "Acessórios", "Vértice", ["U"], ["Marrom"], 119.9, 0.45, 0.7],
];

export const CORES_HEX = {
  Branca: "#f4f2ee", Branco: "#f4f2ee", Preta: "#1d1d1f", Preto: "#1d1d1f", Azul: "#3a6ea5", "Azul Escuro": "#22385c",
  "Azul Claro": "#8fb3d9", Areia: "#d8c7a6", Grafite: "#4a4a4f", "Cáqui": "#b5a47a", "Verde Oliva": "#6b6e3c",
  Estampado: "#c9708a", Rosa: "#e9a8b8", "Cinza Mescla": "#a3a3a8", Caramelo: "#b07a45", Bege: "#e0d2b8", Marrom: "#6b4630",
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export function gerarDadosDemo() {
  const r = prng(20261124);
  const agora = Date.now();
  const DIA = 86400000;

  const usuarios = [
    { id: uid(), nome: "Marina Duarte", email: "gerente@dmlogistic.com", senha: "demo123", perfil: "gerente", ativo: true },
    { id: uid(), nome: "Rafael Souza", email: "funcionario@dmlogistic.com", senha: "demo123", perfil: "funcionario", ativo: true },
    { id: uid(), nome: "Ana Lima", email: "ana@dmlogistic.com", senha: "demo123", perfil: "funcionario", ativo: true },
  ];

  const centros = [
    { id: uid(), codigo: "CD-SP", nome: "CD Cajamar", cidade: "Cajamar", uf: "SP", endereco: "Rod. Anhanguera, km 33", responsavel: "Marina Duarte", ativo: true },
    { id: uid(), codigo: "CD-MG", nome: "CD Contagem", cidade: "Contagem", uf: "MG", endereco: "Av. das Indústrias, 1500", responsavel: "Carlos Mendes", ativo: true },
    { id: uid(), codigo: "CD-PE", nome: "CD Recife", cidade: "Jaboatão dos Guararapes", uf: "PE", endereco: "BR-101 Sul, 3200", responsavel: "Juliana Rocha", ativo: true },
  ];

  const produtos = [];
  let n = 1;
  for (const [nome, categoria, marca, tamanhos, cores, preco, desc, pop] of MODELOS) {
    for (const cor of cores) {
      for (const tamanho of tamanhos) {
        const sku = `DM-${String(n++).padStart(4, "0")}`;
        produtos.push({
          id: uid(), sku, nome, categoria, marca, tamanho, cor,
          preco_original: preco,
          preco_outlet: Math.floor(preco * (1 - desc)) + 0.9,
          estoque_minimo: 5 + Math.floor(r() * 6),
          imagem_url: "",
          ativo: true,
          atributos: {},
          _pop: pop * (0.6 + r() * 0.8),
          criado_em: new Date(agora - 100 * DIA).toISOString(),
        });
      }
    }
  }

  const estoque = {}; // chave produto|centro -> quantidade
  const key = (p, c) => `${p}|${c}`;
  const mov = [];
  const add = (tipo, p, origem, destino, qtd, quando, usuario, obs = "") => {
    mov.push({
      id: uid(), tipo, produto_id: p.id, centro_origem_id: origem?.id || null, centro_destino_id: destino?.id || null,
      quantidade: qtd, observacao: obs, usuario_id: usuario.id, usuario_nome: usuario.nome,
      criado_em: new Date(quando).toISOString(),
    });
  };
  const [ger, func1, func2] = usuarios;

  // Carga inicial há 95 dias
  for (const p of produtos) {
    for (const c of centros) {
      const peso = c.codigo === "CD-SP" ? 1.4 : c.codigo === "CD-MG" ? 1 : 0.7;
      const q = Math.round((18 + r() * 40) * peso);
      estoque[key(p.id, c.id)] = q;
      add("entrada", p, null, c, q, agora - 95 * DIA + r() * 3600000, ger, "Carga inicial do outlet");
    }
  }

  // 90 dias de operação
  for (let d = 90; d >= 0; d--) {
    const diaBase = agora - d * DIA;
    const fimDeSemana = [0, 6].includes(new Date(diaBase).getDay());
    for (const p of produtos) {
      for (const c of centros) {
        const k = key(p.id, c.id);
        const peso = c.codigo === "CD-SP" ? 1.3 : c.codigo === "CD-MG" ? 1 : 0.75;
        const chance = 0.11 * p._pop * peso * (fimDeSemana ? 1.35 : 1);
        if (r() < chance && estoque[k] > 0) {
          const q = Math.min(estoque[k], 1 + Math.floor(r() * 3));
          estoque[k] -= q;
          add("saida", p, c, null, q, diaBase + (9 + r() * 9) * 3600000, r() < 0.5 ? func1 : func2, "Pedido loja/e-commerce");
        }
        // Reposição quando baixa (nem sempre, para sobrar itens em baixa)
        if (estoque[k] <= p.estoque_minimo && r() < 0.1 && d > 6) {
          const q = 15 + Math.floor(r() * 25);
          estoque[k] += q;
          add("entrada", p, null, c, q, diaBase + 8 * 3600000, ger, "Reposição fornecedor");
        }
      }
    }
    // Transferências ocasionais SP -> outros
    if (r() < 0.25) {
      const p = produtos[Math.floor(r() * produtos.length)];
      const destino = centros[1 + Math.floor(r() * 2)];
      const ko = key(p.id, centros[0].id);
      const q = Math.min(estoque[ko], 4 + Math.floor(r() * 8));
      if (q > 0) {
        estoque[ko] -= q;
        estoque[key(p.id, destino.id)] += q;
        add("transferencia", p, centros[0], destino, q, diaBase + 14 * 3600000, func1, "Balanceamento entre CDs");
      }
    }
  }

  for (const p of produtos) delete p._pop;

  const estoqueLista = Object.entries(estoque).map(([k, quantidade]) => {
    const [produto_id, centro_id] = k.split("|");
    return { produto_id, centro_id, quantidade };
  });

  mov.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  return { usuarios, centros, produtos, estoque: estoqueLista, movimentacoes: mov, versao: 1 };
}

export { uid };
