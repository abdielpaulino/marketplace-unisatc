import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { cartLines, sellerLabel, useCurrentUser, useDb, userById } from '../core/hooks';
import { formatPrice, getOrderBlocker } from '../core/rules';
import { removeFromCart, setCartQty } from '../core/services';
import { useAction } from '../context/Toast';
import { EmptyState, SellerTypeBadge } from '../components/ui';

/** Groups cart lines by seller and attaches the current order blocker for each line (RN06). */
export function useCartGroups() {
  const db = useDb();
  const user = useCurrentUser();
  const lines = cartLines(db, user.id).map((line) => ({
    ...line,
    blocker: getOrderBlocker(line.listing, line.qty, user.id, userById(db, line.listing.sellerId)),
  }));
  const groups = {};
  lines.forEach((line) => {
    const key = line.listing.establishmentId || line.listing.sellerId;
    (groups[key] ||= { seller: sellerLabel(db, line.listing), lines: [] }).lines.push(line);
  });
  const total = lines.reduce((s, l) => s + l.listing.price * l.qty, 0);
  return { lines, groups: Object.values(groups), total, hasBlockers: lines.some((l) => l.blocker) };
}

export default function Cart() {
  const run = useAction();
  const navigate = useNavigate();
  const { lines, groups, total, hasBlockers } = useCartGroups();

  if (!lines.length)
    return <EmptyState icon={ShoppingCart} title="Seu carrinho está vazio" text="Explore os anúncios e adicione produtos." action={<Link to="/" className="btn btn-primary">Ver anúncios</Link>} />;

  return (
    <div>
      <h1>Carrinho</h1>
      <div className="two-col">
        <div className="stack">
          {groups.map((g) => (
            <div key={g.seller.link} className="card pad">
              <div className="row gap-sm group-head">
                <SellerTypeBadge type={g.seller.type} /> <Link to={g.seller.link} className="strong">{g.seller.name}</Link>
              </div>
              {g.lines.map(({ listing, qty, blocker }) => (
                <div key={listing.id} className="cart-line">
                  <img src={listing.images[0]} alt="" className="list-thumb" />
                  <div className="list-main">
                    <Link to={`/anuncio/${listing.id}`} className="strong">{listing.title}</Link>
                    <span className="muted small">{listing.kind === 'doacao' ? 'Doação' : `${formatPrice(listing.price)} cada`}</span>
                    {blocker && <span className="text-danger small"><AlertTriangle size={14} /> {blocker}</span>}
                  </div>
                  <div className="qty">
                    <button onClick={() => run(() => setCartQty(listing.id, qty - 1))} aria-label="Diminuir"><Minus size={14} /></button>
                    <span>{qty}</span>
                    <button onClick={() => run(() => setCartQty(listing.id, qty + 1))} aria-label="Aumentar"><Plus size={14} /></button>
                  </div>
                  <strong className="line-total">{formatPrice(listing.price * qty)}</strong>
                  <button className="icon-btn danger" onClick={() => run(() => removeFromCart(listing.id))} aria-label="Remover"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <aside className="card pad summary">
          <h3>Resumo</h3>
          <div className="row between"><span>Itens</span><span>{lines.reduce((s, l) => s + l.qty, 0)}</span></div>
          <div className="row between"><span>Vendedores</span><span>{groups.length}</span></div>
          <div className="row between total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
          {hasBlockers && <div className="alert alert-warning small">Remova ou ajuste os itens indisponíveis para continuar.</div>}
          <button className="btn btn-primary btn-block btn-lg" disabled={hasBlockers} onClick={() => navigate('/checkout')}>Revisar pedido</button>
          <p className="muted small center">Um pedido será criado para cada vendedor.</p>
        </aside>
      </div>
    </div>
  );
}
