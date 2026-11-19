// Service layer: every operation the UI performs. Each function validates
// permissions and business rules before touching data, exactly like an API would.
// Swap these implementations for fetch() calls to plug in a real backend.
import { getDb, getSession, setSession, update } from './db';
import { hashPassword, uid } from './crypto';
import * as R from './rules';

const now = () => new Date().toISOString();

export class ValidationError extends Error {
  constructor(errors) {
    super(Object.values(errors)[0] || 'Dados inválidos.');
    this.errors = errors;
  }
}

function currentUser({ required = true } = {}) {
  const user = getDb().users.find((u) => u.id === getSession());
  if (!user) {
    if (required) throw new Error('Faça login para continuar.');
    return null;
  }
  if (user.blocked) {
    setSession(null);
    throw new Error('Sua conta está bloqueada. Procure a administração.');
  }
  return user;
}

function requireAdmin() {
  const user = currentUser();
  if (user.role !== 'admin') throw new Error('Acesso restrito a administradores.');
  return user;
}

function notify(draft, userId, { type, title, body, link }) {
  draft.notifications.unshift({ id: uid(), userId, type, title, body, link, read: false, createdAt: now() });
}

const notifyAdmins = (draft, payload) =>
  draft.users.filter((u) => u.role === 'admin').forEach((a) => notify(draft, a.id, payload));

const findOrThrow = (list, id, message) => {
  const item = list.find((x) => x.id === id);
  if (!item) throw new Error(message);
  return item;
};

/* ───────────────────────── Auth (RF01, RF02, RF03) ───────────────────────── */

export async function register({ name, email, password, confirmPassword, role, course, phone, acceptTerms }) {
  email = String(email || '').trim().toLowerCase();
  if (!name || name.trim().length < 3) throw new Error('Informe seu nome completo.');
  if (!R.isInstitutionalEmail(email))
    throw new Error(`Use seu e-mail institucional da SATC (${R.ALLOWED_EMAIL_DOMAINS.map((d) => '@' + d).join(' ou ')}).`);
  if (!['aluno', 'professor'].includes(role)) throw new Error('Escolha se você é aluno ou professor.');
  if (!password || password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
  if (confirmPassword !== undefined && password !== confirmPassword) throw new Error('As senhas não conferem.');
  if (acceptTerms === false) throw new Error('Aceite os termos de uso para continuar.');
  // RN02 – unique account per e-mail
  if (getDb().users.some((u) => u.email === email)) throw new Error('Já existe uma conta cadastrada com este e-mail.');

  const user = {
    id: uid(), name: name.trim(), email, passwordHash: await hashPassword(password, email), role,
    course: course?.trim() || '', phone: phone?.trim() || '', blocked: false, createdAt: now(),
  };
  update((d) => {
    d.users.push(user);
    notify(d, user.id, {
      type: 'sistema', title: 'Bem-vindo(a) ao UniSatc Marketplace!',
      body: 'Agora você pode comprar, anunciar, doar e usar os achados e perdidos.', link: '/',
    });
  });
  setSession(user.id);
  return user;
}

export async function login(email, password) {
  email = String(email || '').trim().toLowerCase();
  const user = getDb().users.find((u) => u.email === email);
  if (!user || user.passwordHash !== (await hashPassword(password, email)))
    throw new Error('E-mail ou senha incorretos.');
  if (user.blocked) throw new Error('Sua conta está bloqueada. Procure a administração.');
  setSession(user.id);
  return user;
}

export function logout() {
  setSession(null);
}

/** Generates a 6-digit code. Without a backend the code is returned so the UI can show it (simulated e-mail). */
export function requestPasswordReset(email) {
  email = String(email || '').trim().toLowerCase();
  const user = getDb().users.find((u) => u.email === email);
  if (!user) return null; // same response for unknown e-mails (do not reveal accounts)
  const code = String(Math.floor(100000 + Math.random() * 900000));
  update((d) => {
    d.resetCodes = d.resetCodes.filter((c) => c.email !== email);
    d.resetCodes.push({ email, code, expiresAt: new Date(Date.now() + 15 * 60000).toISOString() });
  });
  return code;
}

export async function resetPassword(email, code, newPassword) {
  email = String(email || '').trim().toLowerCase();
  const entry = getDb().resetCodes.find((c) => c.email === email && c.code === String(code).trim());
  if (!entry || new Date(entry.expiresAt) < new Date()) throw new Error('Código inválido ou expirado.');
  if (!newPassword || newPassword.length < 6) throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
  const hash = await hashPassword(newPassword, email);
  update((d) => {
    d.users.find((u) => u.email === email).passwordHash = hash;
    d.resetCodes = d.resetCodes.filter((c) => c.email !== email);
  });
}

export function updateProfile({ name, course, phone }) {
  const user = currentUser();
  if (!name || name.trim().length < 3) throw new Error('Informe seu nome completo.');
  update((d) => Object.assign(d.users.find((u) => u.id === user.id), { name: name.trim(), course: course || '', phone: phone || '' }));
}

export async function changePassword(current, next) {
  const user = currentUser();
  if (user.passwordHash !== (await hashPassword(current, user.email))) throw new Error('Senha atual incorreta.');
  if (!next || next.length < 6) throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
  const hash = await hashPassword(next, user.email);
  update((d) => { d.users.find((u) => u.id === user.id).passwordHash = hash; });
}

/* ───────────────────────── Listings (RF06–RF09, RF16) ───────────────────────── */

function normalizeListingInput(data) {
  const trade = R.isTradeKind(data.kind);
  return {
    kind: data.kind,
    title: String(data.title || '').trim(),
    description: String(data.description || '').trim(),
    category: data.category,
    price: data.kind === 'venda' ? Math.round(Number(data.price) * 100) / 100 : 0,
    stock: trade ? Number(data.stock) : 0,
    condition: trade ? data.condition || 'novo' : null,
    location: String(data.location || '').trim(),
    images: (data.images || []).slice(0, 5),
    establishmentId: data.establishmentId || null,
  };
}

function checkEstablishmentOwnership(user, establishmentId) {
  if (!establishmentId) return;
  const est = findOrThrow(getDb().establishments, establishmentId, 'Estabelecimento não encontrado.');
  if (est.ownerId !== user.id) throw new Error('Você não é responsável por este estabelecimento.');
  if (est.status !== 'aprovado') throw new Error('O estabelecimento ainda não foi aprovado pela administração.');
  return est;
}

export function createListing(data) {
  const user = currentUser(); // RN03
  const input = normalizeListingInput(data);
  const errors = R.validateListing({ ...data, ...input, price: data.kind === 'venda' ? data.price : 0 });
  if (Object.keys(errors).length) throw new ValidationError(errors);
  checkEstablishmentOwnership(user, input.establishmentId);
  if (input.kind !== 'venda' && input.kind !== 'doacao' && input.establishmentId)
    throw new Error('Achados e perdidos devem ser publicados como pessoa física.');

  const listing = {
    id: uid(), sellerId: user.id, ...input, available: true, status: 'ativo', resolved: false,
    createdAt: now(), updatedAt: now(),
  };
  update((d) => d.listings.unshift(listing));
  return listing;
}

function ownListing(id) {
  const user = currentUser();
  const listing = findOrThrow(getDb().listings, id, 'Anúncio não encontrado.');
  if (listing.sellerId !== user.id) throw new Error('Você só pode alterar os seus próprios anúncios.');
  if (listing.status === 'removido') throw new Error('Este anúncio foi removido pela administração.');
  return { user, listing };
}

/** RN05 / RF09 – the seller keeps info, prices and availability up to date. */
export function updateListing(id, data) {
  const { user, listing } = ownListing(id);
  const input = normalizeListingInput({ ...listing, ...data });
  const errors = R.validateListing({ ...input, price: input.kind === 'venda' ? (data.price ?? listing.price) : 0 });
  if (Object.keys(errors).length) throw new ValidationError(errors);
  checkEstablishmentOwnership(user, input.establishmentId);
  update((d) => {
    const l = d.listings.find((x) => x.id === id);
    const oldPrice = l.price;
    const wasOut = !l.available || l.stock <= 0;
    Object.assign(l, input, { available: data.available ?? l.available, updatedAt: now() });
    notifyOfferUpdates(d, l, oldPrice, wasOut);
  });
}

export function updateStock(id, { stock, available }) {
  const { listing } = ownListing(id);
  const nextStock = stock ?? listing.stock;
  if (!Number.isInteger(nextStock) || nextStock < 0) throw new Error('Estoque inválido.');
  update((d) => {
    const l = d.listings.find((x) => x.id === id);
    const wasOut = !l.available || l.stock <= 0;
    l.stock = nextStock;
    if (available !== undefined) l.available = available;
    l.updatedAt = now();
    notifyOfferUpdates(d, l, l.price, wasOut);
  });
}

// RF19 – favorites get notified about price drops and restocks.
function notifyOfferUpdates(d, l, oldPrice, wasOut) {
  const fans = d.favorites.filter((f) => f.listingId === l.id && f.userId !== l.sellerId).map((f) => f.userId);
  const isNowAvailable = l.available && l.stock > 0;
  fans.forEach((userId) => {
    if (l.price < oldPrice)
      notify(d, userId, {
        type: 'oferta', title: `Baixou de preço: ${l.title}`,
        body: `De ${R.formatPrice(oldPrice)} por ${R.formatPrice(l.price)}.`, link: `/anuncio/${l.id}`,
      });
    if (wasOut && isNowAvailable)
      notify(d, userId, { type: 'oferta', title: `Disponível novamente: ${l.title}`, body: 'O item que você favoritou voltou ao estoque.', link: `/anuncio/${l.id}` });
  });
}

export function deleteListing(id) {
  ownListing(id);
  update((d) => {
    d.listings.find((x) => x.id === id).status = 'excluido';
    Object.keys(d.carts).forEach((k) => { d.carts[k] = d.carts[k].filter((c) => c.listingId !== id); });
  });
}

/** Lost & found: owner marks the item as returned / found. */
export function setResolved(id, resolved = true) {
  ownListing(id);
  update((d) => { const l = d.listings.find((x) => x.id === id); l.resolved = resolved; l.updatedAt = now(); });
}

export function toggleFavorite(listingId) {
  const user = currentUser();
  update((d) => {
    const idx = d.favorites.findIndex((f) => f.userId === user.id && f.listingId === listingId);
    if (idx >= 0) d.favorites.splice(idx, 1);
    else d.favorites.push({ userId: user.id, listingId });
  });
}

/* ───────────────────────── Cart & orders (RF13–RF15) ───────────────────────── */

function blockerFor(d, listingId, qty, userId) {
  const listing = d.listings.find((l) => l.id === listingId);
  const seller = listing && d.users.find((u) => u.id === listing.sellerId);
  return R.getOrderBlocker(listing, qty, userId, seller);
}

export function addToCart(listingId, qty = 1) {
  const user = currentUser(); // RN03
  const cart = getDb().carts[user.id] || [];
  const current = cart.find((c) => c.listingId === listingId)?.qty || 0;
  const blocker = blockerFor(getDb(), listingId, current + qty, user.id); // RN06
  if (blocker) throw new Error(blocker);
  update((d) => {
    const c = (d.carts[user.id] ||= []);
    const line = c.find((x) => x.listingId === listingId);
    if (line) line.qty += qty;
    else c.push({ listingId, qty, addedAt: now() });
  });
}

export function setCartQty(listingId, qty) {
  const user = currentUser();
  if (qty <= 0) return removeFromCart(listingId);
  const blocker = blockerFor(getDb(), listingId, qty, user.id);
  if (blocker) throw new Error(blocker);
  update((d) => { d.carts[user.id].find((x) => x.listingId === listingId).qty = qty; });
}

export function removeFromCart(listingId) {
  const user = currentUser();
  update((d) => { d.carts[user.id] = (d.carts[user.id] || []).filter((x) => x.listingId !== listingId); });
}

/** RN06 + RN07 – places one order per seller after the buyer confirms the review step. */
export function placeOrder({ confirmed, note = '', paymentMethod = 'pix', expectedTotal }) {
  const user = currentUser();
  if (!confirmed) throw new Error('Confirme que você conferiu as informações e valores do pedido.');
  const db = getDb();
  const cart = db.carts[user.id] || [];
  if (!cart.length) throw new Error('Seu carrinho está vazio.');

  for (const line of cart) {
    const blocker = blockerFor(db, line.listingId, line.qty, user.id);
    if (blocker) {
      const title = db.listings.find((l) => l.id === line.listingId)?.title || 'Item';
      throw new Error(`${title}: ${blocker}`);
    }
  }
  const total = cart.reduce((s, line) => s + db.listings.find((l) => l.id === line.listingId).price * line.qty, 0);
  if (expectedTotal !== undefined && Math.abs(total - expectedTotal) > 0.001)
    throw new Error('Os valores dos produtos mudaram. Revise o pedido novamente antes de confirmar.');

  return update((d) => {
    const bySeller = {};
    for (const line of cart) {
      const l = d.listings.find((x) => x.id === line.listingId);
      (bySeller[l.sellerId] ||= []).push({ listingId: l.id, title: l.title, price: l.price, qty: line.qty, image: l.images[0] || null, establishmentId: l.establishmentId });
      l.stock -= line.qty;
      l.updatedAt = now();
    }
    const created = Object.entries(bySeller).map(([sellerId, items]) => {
      d.orderSeq += 1;
      const order = {
        id: uid(), number: String(d.orderSeq), buyerId: user.id, sellerId, items, note: note.trim(), paymentMethod,
        total: items.reduce((s, i) => s + i.price * i.qty, 0), status: 'pendente',
        history: [{ status: 'pendente', at: now() }], createdAt: now(),
      };
      d.orders.unshift(order);
      notify(d, sellerId, {
        type: 'pedido', title: `Novo pedido #${order.number}`,
        body: `${user.name} pediu ${items.reduce((s, i) => s + i.qty, 0)} item(ns). Confirme o pedido.`, link: '/vendas',
      });
      return order;
    });
    d.carts[user.id] = [];
    return created;
  });
}

export function updateOrderStatus(orderId, next) {
  const user = currentUser();
  const order = findOrThrow(getDb().orders, orderId, 'Pedido não encontrado.');
  if (!R.canTransitionOrder(order, next, user.id)) throw new Error('Não é possível alterar o pedido para este status.');
  update((d) => {
    const o = d.orders.find((x) => x.id === orderId);
    o.status = next;
    o.history.push({ status: next, at: now() });
    if (next === 'cancelado') {
      o.items.forEach((i) => {
        const l = d.listings.find((x) => x.id === i.listingId);
        if (l) l.stock += i.qty;
      });
    }
    const isSeller = user.id === o.sellerId;
    notify(d, isSeller ? o.buyerId : o.sellerId, {
      type: 'pedido',
      title: `Pedido #${o.number}: ${R.ORDER_STATUS[next].label}`,
      body: next === 'entregue' ? 'Pedido entregue! Que tal avaliar o produto e o vendedor?' : `${isSeller ? 'O vendedor' : 'O comprador'} atualizou o pedido.`,
      link: isSeller ? '/pedidos' : '/vendas',
    });
  });
}

/* ───────────────────────── Reviews (RF18 / RN08) ───────────────────────── */

export function createReview({ orderId, listingId, productRating, sellerRating, comment }) {
  const user = currentUser();
  const db = getDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!R.canReview(order, listingId, user.id, db.reviews))
    throw new Error('Somente quem comprou e recebeu o produto pode avaliá-lo (uma vez por pedido).');
  const valid = (n) => Number.isInteger(n) && n >= 1 && n <= 5;
  if (!valid(productRating) || !valid(sellerRating)) throw new Error('Dê uma nota de 1 a 5 para o produto e o vendedor.');
  if (R.findProhibitedTerms(comment).length) throw new Error('O comentário contém termos não permitidos.');
  update((d) => {
    d.reviews.unshift({ id: uid(), orderId, listingId, sellerId: order.sellerId, buyerId: user.id, productRating, sellerRating, comment: (comment || '').trim(), createdAt: now() });
    notify(d, order.sellerId, { type: 'avaliacao', title: 'Você recebeu uma avaliação', body: `${user.name} avaliou seu atendimento com ${sellerRating} estrela(s).`, link: `/usuario/${order.sellerId}` });
  });
}

/* ───────────────────────── Chat (RF17) ───────────────────────── */

export function startConversation(otherUserId, listingId = null) {
  const user = currentUser();
  if (otherUserId === user.id) throw new Error('Você não pode conversar com você mesmo.');
  const other = findOrThrow(getDb().users, otherUserId, 'Usuário não encontrado.');
  if (other.blocked) throw new Error('Este usuário está indisponível.');
  const existing = getDb().conversations.find(
    (c) => c.participants.includes(user.id) && c.participants.includes(otherUserId) && c.listingId === listingId,
  );
  if (existing) return existing.id;
  const conv = { id: uid(), participants: [user.id, otherUserId], listingId, updatedAt: now() };
  update((d) => d.conversations.unshift(conv));
  return conv.id;
}

export function sendMessage(conversationId, text) {
  const user = currentUser();
  text = String(text || '').trim();
  if (!text) return;
  if (text.length > 1000) throw new Error('Mensagem muito longa (máx. 1000 caracteres).');
  const conv = findOrThrow(getDb().conversations, conversationId, 'Conversa não encontrada.');
  if (!conv.participants.includes(user.id)) throw new Error('Você não participa desta conversa.');
  const otherId = conv.participants.find((p) => p !== user.id);
  update((d) => {
    d.messages.push({ id: uid(), conversationId, senderId: user.id, text, createdAt: now(), readBy: [user.id] });
    d.conversations.find((c) => c.id === conversationId).updatedAt = now();
    // keep a single unread notification per conversation
    d.notifications = d.notifications.filter((n) => !(n.userId === otherId && n.link === `/chat/${conversationId}` && !n.read));
    notify(d, otherId, { type: 'mensagem', title: `Nova mensagem de ${user.name}`, body: text.slice(0, 120), link: `/chat/${conversationId}` });
  });
}

export function markConversationRead(conversationId) {
  const user = currentUser({ required: false });
  if (!user) return;
  const db = getDb();
  const hasUnread = db.messages.some((m) => m.conversationId === conversationId && !m.readBy.includes(user.id));
  const hasNotif = db.notifications.some((n) => n.userId === user.id && !n.read && n.link === `/chat/${conversationId}`);
  if (!hasUnread && !hasNotif) return;
  update((d) => {
    d.messages.forEach((m) => { if (m.conversationId === conversationId && !m.readBy.includes(user.id)) m.readBy.push(user.id); });
    d.notifications.forEach((n) => { if (n.userId === user.id && n.link === `/chat/${conversationId}`) n.read = true; });
  });
}

/* ───────────────────────── Notifications (RF19) ───────────────────────── */

export function markNotificationRead(id) {
  const user = currentUser();
  update((d) => { const n = d.notifications.find((x) => x.id === id && x.userId === user.id); if (n) n.read = true; });
}

export function markAllNotificationsRead() {
  const user = currentUser();
  update((d) => d.notifications.forEach((n) => { if (n.userId === user.id) n.read = true; }));
}

/* ───────────────────────── Establishments (RF05, RF07) ───────────────────────── */

export function createEstablishment({ name, type, description, location, hours, logo }) {
  const user = currentUser();
  if (!name || name.trim().length < 3) throw new Error('Informe o nome do estabelecimento.');
  if (!['restaurante', 'loja'].includes(type)) throw new Error('Escolha o tipo: restaurante ou loja.');
  if (!location?.trim()) throw new Error('Informe a localização no campus.');
  if (R.findProhibitedTerms(name, description).length) throw new Error('O cadastro contém termos não permitidos.');
  const est = { id: uid(), ownerId: user.id, name: name.trim(), type, description: description?.trim() || '', location: location.trim(), hours: hours?.trim() || '', logo: logo || null, status: 'pendente', createdAt: now() };
  update((d) => {
    d.establishments.push(est);
    notifyAdmins(d, { type: 'estabelecimento', title: 'Estabelecimento aguardando aprovação', body: `${est.name} foi cadastrado por ${user.name}.`, link: '/admin?aba=estabelecimentos' });
  });
  return est;
}

export function updateEstablishment(id, data) {
  const user = currentUser();
  const est = findOrThrow(getDb().establishments, id, 'Estabelecimento não encontrado.');
  if (est.ownerId !== user.id) throw new Error('Você não é responsável por este estabelecimento.');
  if (!data.name || data.name.trim().length < 3) throw new Error('Informe o nome do estabelecimento.');
  update((d) => Object.assign(d.establishments.find((e) => e.id === id), {
    name: data.name.trim(), description: data.description || '', location: data.location || '', hours: data.hours || '', logo: data.logo ?? est.logo,
  }));
}

/* ───────────────────────── Reports & admin (RF20 / RN10) ───────────────────────── */

export function createReport({ targetType, targetId, reason, details }) {
  const user = currentUser();
  if (!R.REPORT_REASONS.includes(reason)) throw new Error('Escolha o motivo da denúncia.');
  const db = getDb();
  const target = targetType === 'listing' ? db.listings.find((l) => l.id === targetId) : db.users.find((u) => u.id === targetId);
  if (!target) throw new Error('Item denunciado não encontrado.');
  if (db.reports.some((r) => r.reporterId === user.id && r.targetId === targetId && r.status === 'aberta'))
    throw new Error('Você já tem uma denúncia em análise para este item.');
  update((d) => {
    d.reports.unshift({ id: uid(), reporterId: user.id, targetType, targetId, reason, details: (details || '').trim(), status: 'aberta', createdAt: now() });
    const label = targetType === 'listing' ? `Anúncio "${target.title}"` : `Usuário ${target.name}`;
    notifyAdmins(d, { type: 'denuncia', title: 'Nova denúncia recebida', body: `${label}: ${reason}.`, link: '/admin?aba=denuncias' });
  });
}

export function adminSetUserBlocked(userId, blocked) {
  const admin = requireAdmin();
  if (userId === admin.id) throw new Error('Você não pode bloquear a si mesmo.');
  update((d) => {
    const u = d.users.find((x) => x.id === userId);
    u.blocked = blocked;
    if (!blocked) notify(d, u.id, { type: 'sistema', title: 'Conta desbloqueada', body: 'Sua conta foi reativada pela administração.', link: '/' });
  });
}

export function adminSetEstablishmentStatus(id, status) {
  requireAdmin();
  if (!['aprovado', 'rejeitado', 'pendente'].includes(status)) throw new Error('Status inválido.');
  update((d) => {
    const e = d.establishments.find((x) => x.id === id);
    e.status = status;
    notify(d, e.ownerId, {
      type: 'estabelecimento',
      title: status === 'aprovado' ? `${e.name} foi aprovado!` : `${e.name} não foi aprovado`,
      body: status === 'aprovado' ? 'Você já pode cadastrar produtos no seu cardápio/catálogo.' : 'Entre em contato com a administração para mais informações.',
      link: '/estabelecimento',
    });
  });
}

export function adminRemoveListing(id, reason = 'Anúncio em desacordo com as normas da instituição.') {
  requireAdmin();
  update((d) => {
    const l = d.listings.find((x) => x.id === id);
    l.status = 'removido';
    l.removedReason = reason;
    Object.keys(d.carts).forEach((k) => { d.carts[k] = d.carts[k].filter((c) => c.listingId !== id); });
    notify(d, l.sellerId, { type: 'sistema', title: 'Anúncio removido pela administração', body: `"${l.title}": ${reason}`, link: '/meus-anuncios' });
  });
}

export function adminRestoreListing(id) {
  requireAdmin();
  update((d) => { const l = d.listings.find((x) => x.id === id); l.status = 'ativo'; delete l.removedReason; });
}

export function adminResolveReport(reportId, action) {
  requireAdmin();
  const report = findOrThrow(getDb().reports, reportId, 'Denúncia não encontrada.');
  if (action === 'remover_anuncio' && report.targetType === 'listing') adminRemoveListing(report.targetId);
  if (action === 'bloquear_usuario') {
    const userId = report.targetType === 'user' ? report.targetId : getDb().listings.find((l) => l.id === report.targetId)?.sellerId;
    if (userId) adminSetUserBlocked(userId, true);
  }
  update((d) => {
    const r = d.reports.find((x) => x.id === reportId);
    r.status = action === 'descartar' ? 'descartada' : 'resolvida';
    r.action = action;
    r.resolvedAt = now();
    notify(d, r.reporterId, { type: 'denuncia', title: 'Sua denúncia foi analisada', body: action === 'descartar' ? 'Não identificamos irregularidades.' : 'Tomamos as medidas necessárias. Obrigado!', link: '/notificacoes' });
  });
}
