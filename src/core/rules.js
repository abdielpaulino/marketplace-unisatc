// Pure business rules (no storage access) so they are easy to test and reuse
// when the app is connected to a real backend.

const envDomains =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALLOWED_EMAIL_DOMAINS;

export const ALLOWED_EMAIL_DOMAINS = (envDomains || 'satc.edu.br,alunosatc.edu.br')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export const CATEGORIES = [
  'Alimentação',
  'Livros e apostilas',
  'Material escolar',
  'Eletrônicos',
  'Vestuário',
  'Acessórios',
  'Documentos',
  'Móveis e casa',
  'Esportes',
  'Serviços',
  'Outros',
];

export const KINDS = {
  venda: { label: 'Venda', plural: 'À venda' },
  doacao: { label: 'Doação', plural: 'Doações' },
  perdido: { label: 'Perdido', plural: 'Perdidos' },
  encontrado: { label: 'Encontrado', plural: 'Encontrados' },
};

export const SELLER_TYPES = {
  aluno: 'Aluno',
  professor: 'Professor',
  restaurante: 'Restaurante',
  loja: 'Loja',
};

export const ROLES = { aluno: 'Aluno', professor: 'Professor', admin: 'Administrador' };

export const ORDER_STATUS = {
  pendente: { label: 'Aguardando vendedor', tone: 'warning' },
  confirmado: { label: 'Confirmado', tone: 'info' },
  pronto: { label: 'Pronto para retirada', tone: 'info' },
  entregue: { label: 'Entregue', tone: 'success' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
};

export const ORDER_FLOW = ['pendente', 'confirmado', 'pronto', 'entregue'];

const SELLER_TRANSITIONS = {
  pendente: ['confirmado', 'cancelado'],
  confirmado: ['pronto', 'cancelado'],
  pronto: ['entregue', 'cancelado'],
};

export const REPORT_REASONS = [
  'Produto ou serviço ilícito/proibido',
  'Conteúdo em desacordo com as normas da instituição',
  'Golpe ou fraude',
  'Informações falsas ou enganosas',
  'Comportamento abusivo',
  'Outro',
];

// RN09 – terms that are not allowed in listings (checked without accents).
export const PROHIBITED_TERMS = [
  'arma', 'armas', 'municao', 'droga', 'drogas', 'maconha', 'cocaina', 'lsd',
  'vape', 'pod', 'cigarro eletronico', 'cigarro', 'bebida alcoolica', 'cerveja',
  'vodka', 'whisky', 'tarja preta', 'remedio controlado', 'anabolizante',
  'prova respondida', 'provas respondidas', 'gabarito', 'trabalho pronto', 'tcc pronto',
  'cola para prova', 'falsificado', 'replica', 'pirata', 'pirateado', 'conta hackeada',
];

export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** RN09 – returns the prohibited terms found in the given texts. */
export function findProhibitedTerms(...texts) {
  const content = normalize(texts.join(' '));
  return PROHIBITED_TERMS.filter((term) =>
    new RegExp(`(^|[^a-z0-9])${escapeRegex(term)}($|[^a-z0-9])`).test(content),
  );
}

/** RN01 – only SATC institutional e-mails. */
export function isInstitutionalEmail(email, domains = ALLOWED_EMAIL_DOMAINS) {
  const match = String(email ?? '').trim().toLowerCase().match(/^[^\s@]+@([^\s@]+)$/);
  return Boolean(match) && domains.includes(match[1]);
}

export const isTradeKind = (kind) => kind === 'venda' || kind === 'doacao';

/** RN04 / RN09 – validates listing data. Returns an object of field errors. */
export function validateListing(data) {
  const errors = {};
  const kind = data.kind;
  if (!KINDS[kind]) errors.kind = 'Escolha o tipo do anúncio.';
  if (!data.title || data.title.trim().length < 3) errors.title = 'Informe o nome (mínimo 3 caracteres).';
  if (!data.description || data.description.trim().length < 10)
    errors.description = 'Descreva o item (mínimo 10 caracteres).';
  if (!CATEGORIES.includes(data.category)) errors.category = 'Escolha uma categoria.';

  if (kind === 'venda') {
    const price = Number(data.price);
    if (data.price === '' || data.price == null || Number.isNaN(price) || price <= 0)
      errors.price = 'Informe um preço maior que zero.';
    else if (price > 100000) errors.price = 'Preço acima do limite permitido.';
  }
  if (isTradeKind(kind)) {
    const stock = Number(data.stock);
    if (!Number.isInteger(stock) || stock < 0) errors.stock = 'Estoque deve ser um número inteiro ≥ 0.';
  }
  const prohibited = findProhibitedTerms(data.title, data.description);
  if (prohibited.length)
    errors.content = `O anúncio contém termos não permitidos pelas normas da instituição: ${prohibited.join(', ')}.`;
  return errors;
}

/** RN06 / RN03 – checks whether a quantity of a listing can be ordered. Returns an error message or null. */
export function getOrderBlocker(listing, qty, buyerId, seller) {
  if (!buyerId) return 'Faça login para comprar.';
  if (!listing || listing.status !== 'ativo') return 'Este anúncio não está mais disponível.';
  if (!isTradeKind(listing.kind)) return 'Itens de achados e perdidos não podem ser pedidos.';
  if (listing.sellerId === buyerId) return 'Você não pode pedir o seu próprio anúncio.';
  if (seller?.blocked) return 'O vendedor deste anúncio está indisponível.';
  if (!listing.available) return 'Produto indisponível no momento.';
  if (!Number.isInteger(qty) || qty < 1) return 'Quantidade inválida.';
  if (listing.stock <= 0) return 'Produto sem estoque.';
  if (qty > listing.stock) return `Estoque insuficiente (disponível: ${listing.stock}).`;
  return null;
}

export function canTransitionOrder(order, next, actorId) {
  if (!order) return false;
  if (actorId === order.sellerId) return (SELLER_TRANSITIONS[order.status] || []).includes(next);
  if (actorId === order.buyerId) return order.status === 'pendente' && next === 'cancelado';
  return false;
}

/** RN08 – only buyers with a delivered order may review each of its items once. */
export function canReview(order, listingId, userId, reviews) {
  if (!order || order.buyerId !== userId) return false;
  if (order.status !== 'entregue') return false;
  if (!order.items.some((i) => i.listingId === listingId)) return false;
  return !reviews.some((r) => r.orderId === order.id && r.listingId === listingId);
}

export function sellerTypeOf(listing, users, establishments) {
  if (listing.establishmentId) {
    const est = establishments.find((e) => e.id === listing.establishmentId);
    if (est) return est.type;
  }
  const user = users.find((u) => u.id === listing.sellerId);
  return user?.role === 'professor' ? 'professor' : 'aluno';
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** RF10 / RF11 – search and filters. */
export function filterListings(listings, filters, ctx) {
  const { users = [], establishments = [] } = ctx || {};
  const q = normalize(filters.q).trim();
  const terms = q ? q.split(/\s+/) : [];
  const min = filters.minPrice === '' || filters.minPrice == null ? null : Number(filters.minPrice);
  const max = filters.maxPrice === '' || filters.maxPrice == null ? null : Number(filters.maxPrice);

  let result = listings.filter((l) => {
    if (l.status !== 'ativo') return false;
    const seller = users.find((u) => u.id === l.sellerId);
    if (seller?.blocked) return false;
    if (l.establishmentId) {
      const est = establishments.find((e) => e.id === l.establishmentId);
      if (!est || est.status !== 'aprovado') return false;
    }
    if (filters.kind === 'achados') {
      if (l.kind !== 'perdido' && l.kind !== 'encontrado') return false;
    } else if (filters.kind && filters.kind !== 'todos' && l.kind !== filters.kind) return false;
    if (terms.length) {
      const haystack = normalize(`${l.title} ${l.description} ${l.category}`);
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    if (filters.categories?.length && !filters.categories.includes(l.category)) return false;
    if (min != null && (l.price ?? 0) < min) return false;
    if (max != null && (l.price ?? 0) > max) return false;
    if (filters.sellerTypes?.length && !filters.sellerTypes.includes(sellerTypeOf(l, users, establishments)))
      return false;
    if (filters.onlyAvailable && isTradeKind(l.kind) && (!l.available || l.stock <= 0)) return false;
    if (filters.onlyAvailable && !isTradeKind(l.kind) && l.resolved) return false;
    return true;
  });

  const sorters = {
    recentes: (a, b) => b.createdAt.localeCompare(a.createdAt),
    menor_preco: (a, b) => (a.price ?? 0) - (b.price ?? 0),
    maior_preco: (a, b) => (b.price ?? 0) - (a.price ?? 0),
    nome: (a, b) => a.title.localeCompare(b.title, 'pt-BR'),
  };
  result = [...result].sort(sorters[filters.sort] || sorters.recentes);
  return result;
}

export const formatPrice = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatDate = (iso, withTime = false) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 30) return `há ${Math.floor(diff / 86400)} d`;
  return formatDate(iso);
}
