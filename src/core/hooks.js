import { useSyncExternalStore } from 'react';
import { getDb, getSession, subscribe } from './db';
import { average, isTradeKind, sellerTypeOf } from './rules';

export const useDb = () => useSyncExternalStore(subscribe, getDb);
export const useSessionId = () => useSyncExternalStore(subscribe, getSession);

export function useCurrentUser() {
  const db = useDb();
  const id = useSessionId();
  const user = db.users.find((u) => u.id === id);
  return user && !user.blocked ? user : null;
}

/* ── Read helpers (selectors) ── */

export const userById = (db, id) => db.users.find((u) => u.id === id);

export function sellerLabel(db, listing) {
  if (listing.establishmentId) {
    const est = db.establishments.find((e) => e.id === listing.establishmentId);
    if (est) return { name: est.name, type: est.type, link: `/estabelecimentos/${est.id}` };
  }
  const user = userById(db, listing.sellerId);
  return { name: user?.name || 'Usuário', type: sellerTypeOf(listing, db.users, db.establishments), link: `/usuario/${listing.sellerId}` };
}

export function listingRating(db, listingId) {
  const rs = db.reviews.filter((r) => r.listingId === listingId);
  return { avg: average(rs.map((r) => r.productRating)), count: rs.length };
}

export function sellerRating(db, sellerId) {
  const rs = db.reviews.filter((r) => r.sellerId === sellerId);
  return { avg: average(rs.map((r) => r.sellerRating)), count: rs.length };
}

export function establishmentRating(db, estId) {
  const ids = new Set(db.listings.filter((l) => l.establishmentId === estId).map((l) => l.id));
  const rs = db.reviews.filter((r) => ids.has(r.listingId));
  return { avg: average(rs.map((r) => r.productRating)), count: rs.length };
}

export function cartLines(db, userId) {
  return (db.carts[userId] || [])
    .map((line) => ({ ...line, listing: db.listings.find((l) => l.id === line.listingId) }))
    .filter((l) => l.listing);
}

export function unreadMessagesCount(db, userId) {
  if (!userId) return 0;
  const convIds = new Set(db.conversations.filter((c) => c.participants.includes(userId)).map((c) => c.id));
  return db.messages.filter((m) => convIds.has(m.conversationId) && !m.readBy.includes(userId)).length;
}

export const isOutOfStock = (l) => isTradeKind(l.kind) && (!l.available || l.stock <= 0);
