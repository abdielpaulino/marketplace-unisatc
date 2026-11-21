import { hashPassword } from './crypto';

export function placeholderImage(emoji, color) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='450'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${color}'/><stop offset='1' stop-color='${color}' stop-opacity='0.55'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><text x='50%' y='54%' font-size='170' text-anchor='middle' dominant-baseline='middle'>${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const daysAgo = (d, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();

export const DEMO_ACCOUNTS = [
  { email: 'ana.souza@alunosatc.edu.br', password: '123456', label: 'Aluna (compradora/vendedora)' },
  { email: 'bruno.lima@alunosatc.edu.br', password: '123456', label: 'Aluno dono da Cantina' },
  { email: 'carla.mendes@satc.edu.br', password: '123456', label: 'Professora' },
  { email: 'admin@satc.edu.br', password: 'admin123', label: 'Administrador' },
];

export async function buildSeed() {
  const mkUser = async (id, name, email, password, role, course, phone, createdAt) => ({
    id,
    name,
    email,
    passwordHash: await hashPassword(password, email),
    role,
    course,
    phone,
    blocked: false,
    createdAt,
  });

  const users = await Promise.all([
    mkUser('u-admin', 'Administração UniSatc', 'admin@satc.edu.br', 'admin123', 'admin', 'Coordenação', '', daysAgo(120)),
    mkUser('u-ana', 'Ana Souza', 'ana.souza@alunosatc.edu.br', '123456', 'aluno', 'Engenharia de Software', '(48) 99999-1111', daysAgo(90)),
    mkUser('u-bruno', 'Bruno Lima', 'bruno.lima@alunosatc.edu.br', '123456', 'aluno', 'Gastronomia', '(48) 99999-2222', daysAgo(80)),
    mkUser('u-carla', 'Carla Mendes', 'carla.mendes@satc.edu.br', '123456', 'professor', 'Engenharia de Software', '(48) 99999-3333', daysAgo(200)),
    mkUser('u-julia', 'Júlia Martins', 'julia.martins@alunosatc.edu.br', '123456', 'aluno', 'Engenharia Mecânica', '(48) 99999-5555', daysAgo(400)),
    mkUser('u-diego', 'Diego Rocha', 'diego.rocha@alunosatc.edu.br', '123456', 'aluno', 'Administração', '(48) 99999-4444', daysAgo(60)),
  ]);

  const establishments = [
    {
      id: 'e-cantina', ownerId: 'u-bruno', name: 'Cantina Sabor do Campus', type: 'restaurante',
      description: 'Marmitas, salgados e sucos naturais feitos no dia.', location: 'Bloco A – térreo',
      hours: 'Seg a sex, 7h às 22h', logo: placeholderImage('🍽️', '#F59E0B'), status: 'aprovado', createdAt: daysAgo(70),
    },
    {
      id: 'e-papelaria', ownerId: 'u-diego', name: 'Papelaria Campus', type: 'loja',
      description: 'Material escolar, calculadoras, jalecos e impressões.', location: 'Bloco C – sala 12',
      hours: 'Seg a sex, 8h às 21h', logo: placeholderImage('✏️', '#3B82F6'), status: 'aprovado', createdAt: daysAgo(50),
    },
    {
      id: 'e-acai', ownerId: 'u-diego', name: 'Açaí do Bloco C', type: 'restaurante',
      description: 'Açaí e sorvetes com vários complementos.', location: 'Bloco C – pátio',
      hours: 'Seg a sex, 13h às 21h', logo: placeholderImage('🍧', '#7C3AED'), status: 'pendente', createdAt: daysAgo(1),
    },
  ];

  const L = (id, sellerId, establishmentId, kind, title, description, price, category, emoji, color, stock, extra = {}) => ({
    id, sellerId, establishmentId, kind, title, description, price, category,
    images: [placeholderImage(emoji, color)], stock, available: true, condition: extra.condition || 'novo',
    location: extra.location || '', status: 'ativo', resolved: false,
    createdAt: extra.createdAt || daysAgo(extra.days ?? 5), updatedAt: extra.createdAt || daysAgo(extra.days ?? 5),
  });

  const listings = [
    L('l-marmita', 'u-bruno', 'e-cantina', 'venda', 'Marmita do dia', 'Arroz, feijão, salada, farofa e proteína do dia (frango, carne ou opção vegetariana). Retirada no balcão da cantina.', 18, 'Alimentação', '🍱', '#F59E0B', 20, { days: 1, location: 'Bloco A – térreo' }),
    L('l-coxinha', 'u-bruno', 'e-cantina', 'venda', 'Coxinha de frango com catupiry', 'Coxinha grande feita na hora, massa de batata e recheio cremoso.', 6, 'Alimentação', '🍗', '#EF4444', 40, { days: 3, location: 'Bloco A – térreo' }),
    L('l-suco', 'u-bruno', 'e-cantina', 'venda', 'Suco natural 500ml', 'Sabores: laranja, abacaxi com hortelã e morango. Sem conservantes.', 7, 'Alimentação', '🧃', '#22C55E', 25, { days: 4, location: 'Bloco A – térreo' }),
    L('l-bolo', 'u-bruno', 'e-cantina', 'venda', 'Bolo de pote de chocolate', 'Bolo de pote com brigadeiro cremoso. Produção limitada por dia.', 9, 'Alimentação', '🍫', '#92400E', 0, { days: 2, location: 'Bloco A – térreo' }),
    L('l-caderno', 'u-diego', 'e-papelaria', 'venda', 'Caderno universitário 10 matérias', 'Caderno espiral capa dura com 200 folhas e divisórias.', 29.9, 'Material escolar', '📓', '#3B82F6', 15, { days: 6, location: 'Bloco C – sala 12' }),
    L('l-calc', 'u-diego', 'e-papelaria', 'venda', 'Calculadora científica 240 funções', 'Ideal para cálculo, física e estatística. Acompanha pilhas.', 79.9, 'Eletrônicos', '🧮', '#0EA5E9', 6, { days: 8, location: 'Bloco C – sala 12' }),
    L('l-jaleco', 'u-diego', 'e-papelaria', 'venda', 'Jaleco branco manga longa', 'Jaleco em gabardine, tamanhos P ao GG, com bordado opcional.', 65, 'Vestuário', '🥼', '#64748B', 10, { days: 9, location: 'Bloco C – sala 12' }),
    L('l-jaleco-mec', 'u-julia', null, 'venda', 'Jaleco de mecânico (usado)', 'Jaleco azul-marinho de brim, tamanho M, usado nas aulas de laboratório e oficina de Engenharia Mecânica. Sem rasgos, só lavar e usar.', 45, 'Vestuário', '🥼', '#1E3A8A', 1, { days: 1, condition: 'usado', location: 'Bloco E – oficina' }),
    L('l-calculo', 'u-ana', null, 'venda', 'Livro Cálculo Volume 1', 'Livro de cálculo em ótimo estado, poucas anotações a lápis. Retirada no campus.', 80, 'Livros e apostilas', '📘', '#6366F1', 1, { days: 10, condition: 'usado', location: 'Biblioteca' }),
    L('l-fone', 'u-ana', null, 'venda', 'Fone de ouvido bluetooth', 'Fone sem fio com estojo de carregamento, bateria dura cerca de 5 horas. Usado por 6 meses.', 120, 'Eletrônicos', '🎧', '#111827', 1, { days: 2, condition: 'usado', location: 'Prédio 7' }),
    L('l-aula', 'u-ana', null, 'venda', 'Aula de reforço de programação (1h)', 'Aulas de lógica de programação, JavaScript e Python para calouros. Valor por hora, no campus ou online.', 40, 'Serviços', '💻', '#008D4A', 10, { days: 12, location: 'Laboratório 3 ou online' }),
    L('l-pressman', 'u-carla', null, 'venda', 'Livro Engenharia de Software', 'Livro clássico de engenharia de software, edição recente, capa dura. Excelente estado.', 90, 'Livros e apostilas', '📗', '#16A34A', 1, { days: 7, condition: 'usado', location: 'Sala dos professores' }),
    L('l-apostilas', 'u-carla', null, 'doacao', 'Apostilas de Física I (doação)', 'Apostilas de exercícios de Física I com teoria resumida. Doação para quem estiver cursando a disciplina.', 0, 'Livros e apostilas', '📚', '#F97316', 5, { days: 3, condition: 'usado', location: 'Sala dos professores' }),
    L('l-mesa', 'u-diego', null, 'venda', 'Mesa de estudos dobrável', 'Mesa de estudos em MDF, 90x45cm, dobrável. Ótima para apartamento ou república.', 150, 'Móveis e casa', '🪑', '#A16207', 1, { days: 15, condition: 'usado', location: 'Retirada no campus' }),
    L('l-resumos', 'u-diego', null, 'venda', 'Resumos de Direito Constitucional', 'Resumos digitados da disciplina, organizados por unidade, com mapas mentais.', 15, 'Livros e apostilas', '📝', '#DB2777', 20, { days: 1, location: 'Envio por e-mail' }),
    L('l-garrafa', 'u-ana', null, 'perdido', 'Garrafa térmica azul', 'Perdi minha garrafa térmica azul de 750ml com adesivos de planetas, provavelmente no Prédio 7 (sala 204) na terça à noite.', 0, 'Acessórios', '🧴', '#2563EB', 0, { days: 1, location: 'Prédio 7 – sala 204' }),
    L('l-carteirinha', 'u-bruno', null, 'encontrado', 'Carteira de estudante encontrada', 'Encontrei uma carteira de estudante perto da biblioteca. Para retirar, me chame no chat e informe o nome completo.', 0, 'Documentos', '💳', '#0D9488', 0, { days: 2, location: 'Biblioteca' }),
    L('l-chaves', 'u-carla', null, 'encontrado', 'Molho de chaves com chaveiro vermelho', 'Três chaves com chaveiro vermelho em formato de coração, encontradas no estacionamento. Deixei uma foto aqui para identificação.', 0, 'Acessórios', '🔑', '#DC2626', 0, { days: 4, location: 'Estacionamento principal' }),
  ];

  const order = (id, buyerId, sellerId, items, status, createdAt, note = '') => {
    const flowUntil = ['pendente', 'confirmado', 'pronto', 'entregue'];
    const history = status === 'cancelado'
      ? [{ status: 'pendente', at: createdAt }, { status: 'cancelado', at: createdAt }]
      : flowUntil.slice(0, flowUntil.indexOf(status) + 1).map((s, i) => ({ status: s, at: new Date(new Date(createdAt).getTime() + i * 3600000).toISOString() }));
    return {
      id, number: id.replace('o-', ''), buyerId, sellerId, items, status, note, paymentMethod: 'pix',
      total: items.reduce((s, i) => s + i.price * i.qty, 0), history, createdAt,
    };
  };
  const item = (l, qty) => ({ listingId: l.id, title: l.title, price: l.price, qty, image: l.images[0] });
  const byId = Object.fromEntries(listings.map((l) => [l.id, l]));

  const orders = [
    order('o-1001', 'u-ana', 'u-bruno', [item(byId['l-marmita'], 1), item(byId['l-suco'], 1)], 'entregue', daysAgo(3)),
    order('o-1002', 'u-carla', 'u-ana', [item(byId['l-calculo'], 1)], 'entregue', daysAgo(20)),
    order('o-1003', 'u-diego', 'u-bruno', [item(byId['l-coxinha'], 2)], 'entregue', daysAgo(5)),
    order('o-1004', 'u-ana', 'u-diego', [item(byId['l-caderno'], 1)], 'pendente', daysAgo(0, 2), 'Posso retirar após as 19h.'),
  ];
  // Book "Cálculo" was sold – keep it listed as sold out to show the RN06 rule.
  byId['l-calculo'].stock = 0;

  const reviews = [
    { id: 'r-1', orderId: 'o-1002', listingId: 'l-calculo', sellerId: 'u-ana', buyerId: 'u-carla', productRating: 5, sellerRating: 5, comment: 'Livro exatamente como descrito e entrega rápida. Recomendo!', createdAt: daysAgo(18) },
    { id: 'r-2', orderId: 'o-1003', listingId: 'l-coxinha', sellerId: 'u-bruno', buyerId: 'u-diego', productRating: 4, sellerRating: 5, comment: 'Coxinha muito boa, só achei um pouco salgada.', createdAt: daysAgo(4) },
  ];

  const conversations = [
    { id: 'c-1', participants: ['u-ana', 'u-bruno'], listingId: 'l-marmita', updatedAt: daysAgo(3, -1) },
  ];
  const messages = [
    { id: 'm-1', conversationId: 'c-1', senderId: 'u-ana', text: 'Oi! A marmita de hoje tem opção vegetariana?', createdAt: daysAgo(3), readBy: ['u-ana', 'u-bruno'] },
    { id: 'm-2', conversationId: 'c-1', senderId: 'u-bruno', text: 'Tem sim! Hoje é estrogonofe de grão-de-bico 😊', createdAt: daysAgo(3, -1), readBy: ['u-bruno'] },
  ];

  const notifications = [
    { id: 'n-1', userId: 'u-ana', type: 'pedido', title: 'Pedido #1001 entregue', body: 'Avalie os produtos e o vendedor da Cantina Sabor do Campus.', link: '/pedidos', read: false, createdAt: daysAgo(2) },
    { id: 'n-2', userId: 'u-ana', type: 'mensagem', title: 'Nova mensagem de Bruno Lima', body: 'Tem sim! Hoje é estrogonofe de grão-de-bico 😊', link: '/chat/c-1', read: false, createdAt: daysAgo(3, -1) },
    { id: 'n-3', userId: 'u-diego', type: 'pedido', title: 'Novo pedido #1004', body: 'Ana Souza pediu 1 item. Confirme o pedido.', link: '/vendas', read: false, createdAt: daysAgo(0, 2) },
    { id: 'n-4', userId: 'u-admin', type: 'estabelecimento', title: 'Estabelecimento aguardando aprovação', body: 'Açaí do Bloco C foi cadastrado por Diego Rocha.', link: '/admin?aba=estabelecimentos', read: false, createdAt: daysAgo(1) },
    { id: 'n-5', userId: 'u-admin', type: 'denuncia', title: 'Nova denúncia recebida', body: 'Anúncio "Resumos de Direito Constitucional" foi denunciado.', link: '/admin?aba=denuncias', read: false, createdAt: daysAgo(0, 5) },
  ];

  const reports = [
    { id: 'rep-1', reporterId: 'u-carla', targetType: 'listing', targetId: 'l-resumos', reason: 'Conteúdo em desacordo com as normas da instituição', details: 'Verificar se não são provas antigas com respostas.', status: 'aberta', createdAt: daysAgo(0, 5) },
  ];

  return {
    version: 1,
    users,
    establishments,
    listings,
    orders,
    reviews,
    conversations,
    messages,
    notifications,
    reports,
    favorites: [{ userId: 'u-ana', listingId: 'l-pressman' }],
    carts: {},
    resetCodes: [],
    orderSeq: 1004,
  };
}
