import { beforeEach, describe, expect, it } from 'vitest';
import { getDb, resetDb, setSession } from '../src/core/db';
import * as S from '../src/core/services';
import { findProhibitedTerms, getOrderBlocker, isInstitutionalEmail, validateListing, filterListings } from '../src/core/rules';

const loginAs = (id) => setSession(id);

beforeEach(async () => {
  await resetDb();
});

describe('RN01 / RN02 – cadastro', () => {
  it('aceita somente e-mail institucional', () => {
    expect(isInstitutionalEmail('joao@alunosatc.edu.br')).toBe(true);
    expect(isInstitutionalEmail('prof@satc.edu.br')).toBe(true);
    expect(isInstitutionalEmail('joao@gmail.com')).toBe(false);
    expect(isInstitutionalEmail('joao@satc.edu.br.fake.com')).toBe(false);
  });

  it('recusa cadastro com e-mail externo', async () => {
    await expect(S.register({ name: 'João Silva', email: 'joao@gmail.com', password: '123456', role: 'aluno' })).rejects.toThrow(/institucional/);
  });

  it('não permite e-mail duplicado', async () => {
    await S.register({ name: 'João Silva', email: 'joao@alunosatc.edu.br', password: '123456', role: 'aluno' });
    await expect(S.register({ name: 'Outro João', email: 'JOAO@alunosatc.edu.br', password: '123456', role: 'aluno' })).rejects.toThrow(/Já existe/);
  });

  it('faz login, logout e recupera senha', async () => {
    await S.login('ana.souza@alunosatc.edu.br', '123456');
    S.logout();
    const code = S.requestPasswordReset('ana.souza@alunosatc.edu.br');
    await S.resetPassword('ana.souza@alunosatc.edu.br', code, 'novaSenha');
    await expect(S.login('ana.souza@alunosatc.edu.br', '123456')).rejects.toThrow();
    await expect(S.login('ana.souza@alunosatc.edu.br', 'novaSenha')).resolves.toBeTruthy();
  });
});

describe('RN03 / RN04 / RN09 – anúncios', () => {
  const valid = { kind: 'venda', title: 'Mochila', description: 'Mochila preta em ótimo estado', price: '50', category: 'Acessórios', stock: 1 };

  it('exige login para anunciar', () => {
    expect(() => S.createListing(valid)).toThrow(/login/);
  });

  it('exige nome, descrição, preço e categoria', () => {
    const errors = validateListing({ kind: 'venda', title: '', description: '', price: '', category: '' });
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(['title', 'description', 'price', 'category']));
  });

  it('bloqueia conteúdo proibido', () => {
    expect(findProhibitedTerms('Vendo gabarito da prova')).toContain('gabarito');
    expect(findProhibitedTerms('Armário de madeira')).toEqual([]);
    loginAs('u-ana');
    expect(() => S.createListing({ ...valid, title: 'Vape descartável' })).toThrow(/não permitidos/);
  });

  it('cria anúncio válido', () => {
    loginAs('u-ana');
    const l = S.createListing(valid);
    expect(getDb().listings.find((x) => x.id === l.id).price).toBe(50);
  });
});

describe('RN06 / RN07 – pedidos', () => {
  it('não permite pedir produto sem estoque', () => {
    loginAs('u-ana');
    expect(() => S.addToCart('l-bolo', 1)).toThrow(/estoque/i);
    const l = getDb().listings.find((x) => x.id === 'l-calc');
    expect(getOrderBlocker(l, l.stock + 1, 'u-ana')).toMatch(/Estoque insuficiente/);
  });

  it('exige confirmação e baixa o estoque', () => {
    loginAs('u-ana');
    S.addToCart('l-coxinha', 2);
    S.addToCart('l-calc', 1);
    expect(() => S.placeOrder({ confirmed: false })).toThrow(/Confirme/);
    const orders = S.placeOrder({ confirmed: true });
    expect(orders).toHaveLength(2); // one order per seller
    expect(getDb().listings.find((x) => x.id === 'l-coxinha').stock).toBe(38);
    expect(getDb().notifications.some((n) => n.userId === 'u-bruno' && n.type === 'pedido')).toBe(true);
  });

  it('recusa pedido se o preço mudou após a revisão', () => {
    loginAs('u-ana');
    S.addToCart('l-coxinha', 1);
    loginAs('u-bruno');
    S.updateListing('l-coxinha', { price: '8' });
    loginAs('u-ana');
    expect(() => S.placeOrder({ confirmed: true, expectedTotal: 6 })).toThrow(/mudaram/);
  });

  it('cancelamento devolve o estoque', () => {
    loginAs('u-ana');
    S.addToCart('l-suco', 3);
    const [order] = S.placeOrder({ confirmed: true });
    S.updateOrderStatus(order.id, 'cancelado');
    expect(getDb().listings.find((x) => x.id === 'l-suco').stock).toBe(25);
  });
});

describe('RN08 – avaliações', () => {
  it('só permite avaliar após compra entregue, uma vez', () => {
    loginAs('u-carla');
    expect(() => S.createReview({ orderId: 'o-1001', listingId: 'l-marmita', productRating: 5, sellerRating: 5 })).toThrow();
    loginAs('u-ana');
    S.createReview({ orderId: 'o-1001', listingId: 'l-marmita', productRating: 5, sellerRating: 4 });
    expect(() => S.createReview({ orderId: 'o-1001', listingId: 'l-marmita', productRating: 5, sellerRating: 4 })).toThrow();
    expect(() => S.createReview({ orderId: 'o-1004', listingId: 'l-caderno', productRating: 5, sellerRating: 5 })).toThrow(); // still pending
  });
});

describe('RN10 – administração', () => {
  it('admin bloqueia usuário e remove anúncio; usuário comum não pode', async () => {
    loginAs('u-ana');
    expect(() => S.adminSetUserBlocked('u-diego', true)).toThrow(/administradores/);
    loginAs('u-admin');
    S.adminSetUserBlocked('u-diego', true);
    S.adminRemoveListing('l-resumos');
    expect(getDb().listings.find((l) => l.id === 'l-resumos').status).toBe('removido');
    await expect(S.login('diego.rocha@alunosatc.edu.br', '123456')).rejects.toThrow(/bloqueada/);
    const visible = filterListings(getDb().listings, {}, getDb());
    expect(visible.some((l) => l.sellerId === 'u-diego')).toBe(false);
  });
});

describe('RF10 / RF11 – busca e filtros', () => {
  it('filtra por palavra-chave, categoria, preço e tipo de vendedor', () => {
    const db = getDb();
    expect(filterListings(db.listings, { q: 'calculo' }, db).map((l) => l.id)).toContain('l-calculo');
    const food = filterListings(db.listings, { categories: ['Alimentação'], maxPrice: 7 }, db);
    expect(food.every((l) => l.category === 'Alimentação' && l.price <= 7)).toBe(true);
    const stores = filterListings(db.listings, { sellerTypes: ['loja'] }, db);
    expect(stores.every((l) => l.establishmentId === 'e-papelaria')).toBe(true);
    const lost = filterListings(db.listings, { kind: 'achados' }, db);
    expect(lost.every((l) => ['perdido', 'encontrado'].includes(l.kind))).toBe(true);
  });
});
