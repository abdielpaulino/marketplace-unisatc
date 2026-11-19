import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, MessageCircle, ShoppingCart, Flag, MapPin, Pencil, Package, CheckCircle2, Minus, Plus, Calendar } from 'lucide-react';
import { isOutOfStock, listingRating, sellerLabel, sellerRating, useCurrentUser, useDb, userById } from '../core/hooks';
import { KINDS, formatDate, isTradeKind, getOrderBlocker } from '../core/rules';
import { addToCart, setResolved, startConversation, toggleFavorite } from '../core/services';
import { useAction } from '../context/Toast';
import { Avatar, BackLink, SellerTypeBadge, Stars } from '../components/ui';
import { priceLabel } from '../components/ListingCard';
import ReportModal from '../components/ReportModal';
import NotFound from './NotFound';

export default function ListingDetail() {
  const { id } = useParams();
  const db = useDb();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const run = useAction();
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [reporting, setReporting] = useState(false);

  const listing = db.listings.find((l) => l.id === id);
  const isOwner = user && listing?.sellerId === user.id;
  if (!listing || (listing.status !== 'ativo' && !isOwner && user?.role !== 'admin')) return <NotFound />;

  const seller = userById(db, listing.sellerId);
  const label = sellerLabel(db, listing);
  const rating = listingRating(db, listing.id);
  const sRating = sellerRating(db, listing.sellerId);
  const reviews = db.reviews.filter((r) => r.listingId === listing.id);
  const trade = isTradeKind(listing.kind);
  const out = isOutOfStock(listing);
  const fav = user && db.favorites.some((f) => f.userId === user.id && f.listingId === listing.id);
  const inCart = user ? (db.carts[user.id] || []).find((c) => c.listingId === listing.id)?.qty || 0 : 0;
  const blocker = user ? getOrderBlocker(listing, qty + inCart, user.id, seller) : null;

  const requireLogin = () => {
    if (!user) {
      navigate('/login', { state: { from: `/anuncio/${listing.id}` } });
      return true;
    }
    return false;
  };

  const onAdd = async (buyNow) => {
    if (requireLogin()) return;
    const ok = await run(() => addToCart(listing.id, qty), buyNow ? null : 'Adicionado ao carrinho!');
    if (ok && buyNow) navigate('/carrinho');
    if (ok) setQty(1);
  };

  const onChat = async () => {
    if (requireLogin()) return;
    const convId = await run(() => startConversation(listing.sellerId, listing.id));
    if (convId) navigate(`/chat/${convId}`);
  };

  return (
    <div>
      <BackLink to="/">Voltar aos anúncios</BackLink>
      {listing.status === 'removido' && <div className="alert alert-error">Anúncio removido pela administração: {listing.removedReason}</div>}
      {listing.status === 'excluido' && <div className="alert alert-info">Você excluiu este anúncio. Ele não aparece mais para outros usuários.</div>}

      <div className="detail">
        <div className="gallery">
          <div className="gallery-main card">
            {listing.images[imgIdx] ? <img src={listing.images[imgIdx]} alt={listing.title} /> : <div className="no-img">Sem foto</div>}
            <span className={`kind kind-${listing.kind}`}>{KINDS[listing.kind].label}</span>
          </div>
          {listing.images.length > 1 && (
            <div className="gallery-thumbs">
              {listing.images.map((src, i) => (
                <button key={i} className={i === imgIdx ? 'active' : ''} onClick={() => setImgIdx(i)} aria-label={`Imagem ${i + 1}`}>
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <div className="card pad">
            <div className="row between">
              <span className="muted small">{listing.category}{trade && ` · ${listing.condition === 'usado' ? 'Usado' : 'Novo'}`}</span>
              {user && !isOwner && (
                <button className={`icon-btn fav ${fav ? 'on' : ''}`} onClick={() => run(() => toggleFavorite(listing.id), fav ? 'Removido dos favoritos' : 'Salvo nos favoritos. Avisaremos sobre ofertas!')} aria-label="Favoritar">
                  <Heart size={22} fill={fav ? 'currentColor' : 'none'} />
                </button>
              )}
            </div>
            <h1 className="detail-title">{listing.title}</h1>
            {rating.count > 0 && <Stars value={rating.avg} count={rating.count} />}
            <div className={`price price-xl ${listing.kind !== 'venda' ? `price-${listing.kind}` : ''}`}>{priceLabel(listing)}</div>

            <div className="detail-facts">
              {listing.location && <span><MapPin size={16} /> {listing.location}</span>}
              <span><Calendar size={16} /> Publicado em {formatDate(listing.createdAt)}</span>
              {trade && (
                <span className={out ? 'text-danger' : 'text-success'}>
                  <Package size={16} /> {!listing.available ? 'Indisponível no momento' : listing.stock > 0 ? `${listing.stock} em estoque` : 'Sem estoque'}
                </span>
              )}
              {listing.resolved && <span className="text-success"><CheckCircle2 size={16} /> {listing.kind === 'perdido' ? 'Item já foi encontrado' : 'Item já foi devolvido ao dono'}</span>}
            </div>

            {isOwner ? (
              <div className="stack">
                <div className="alert alert-info">Este anúncio é seu.</div>
                <Link to={`/anuncio/${listing.id}/editar`} className="btn btn-primary btn-block"><Pencil size={18} /> Editar anúncio</Link>
                {!trade && (
                  <button className="btn btn-outline btn-block" onClick={() => run(() => setResolved(listing.id, !listing.resolved), 'Anúncio atualizado.')}>
                    <CheckCircle2 size={18} /> {listing.resolved ? 'Reabrir anúncio' : listing.kind === 'perdido' ? 'Marcar como encontrado' : 'Marcar como devolvido'}
                  </button>
                )}
              </div>
            ) : trade ? (
              <div className="stack">
                {!out && (
                  <div className="qty-row">
                    <span className="label">Quantidade</span>
                    <div className="qty">
                      <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir"><Minus size={16} /></button>
                      <span>{qty}</span>
                      <button onClick={() => setQty((q) => Math.min(listing.stock, q + 1))} aria-label="Aumentar"><Plus size={16} /></button>
                    </div>
                  </div>
                )}
                {inCart > 0 && <span className="muted small">Você já tem {inCart} no carrinho.</span>}
                {user && blocker && !out && <div className="alert alert-warning">{blocker}</div>}
                <button className="btn btn-primary btn-block btn-lg" disabled={out || (user && !!blocker)} onClick={() => onAdd(true)}>
                  {out ? 'Indisponível' : listing.kind === 'doacao' ? 'Solicitar doação' : 'Comprar agora'}
                </button>
                <button className="btn btn-outline btn-block" disabled={out || (user && !!blocker)} onClick={() => onAdd(false)}>
                  <ShoppingCart size={18} /> Adicionar ao carrinho
                </button>
                <button className="btn btn-ghost btn-block" onClick={onChat}><MessageCircle size={18} /> Conversar com o vendedor</button>
              </div>
            ) : (
              <div className="stack">
                <div className="alert alert-info">
                  {listing.kind === 'perdido'
                    ? 'Viu este item pelo campus? Fale com quem perdeu pelo chat.'
                    : 'É seu? Fale com quem encontrou pelo chat e descreva o item para confirmar.'}
                </div>
                <button className="btn btn-primary btn-block btn-lg" onClick={onChat} disabled={listing.resolved}>
                  <MessageCircle size={18} /> {listing.kind === 'perdido' ? 'Eu encontrei!' : 'É meu!'}
                </button>
              </div>
            )}
          </div>

          <Link to={label.link} className="card pad seller-card">
            <Avatar name={label.name} src={listing.establishmentId ? db.establishments.find((e) => e.id === listing.establishmentId)?.logo : null} size={48} />
            <div>
              <strong>{label.name}</strong>
              <div className="row gap-sm"><SellerTypeBadge type={label.type} /> <Stars value={sRating.avg} size={13} count={sRating.count} /></div>
              {listing.establishmentId && <span className="muted small">Responsável: {seller?.name}</span>}
            </div>
          </Link>

          {user && !isOwner && (
            <button className="link-btn danger small" onClick={() => setReporting(true)}><Flag size={14} /> Denunciar anúncio</button>
          )}
        </div>
      </div>

      <section className="card pad section">
        <h2>Descrição</h2>
        <p className="pre-line">{listing.description}</p>
      </section>

      {trade && (
        <section className="card pad section">
          <h2>Avaliações {reviews.length > 0 && <Stars value={rating.avg} count={rating.count} />}</h2>
          {reviews.length === 0 ? (
            <p className="muted">Este produto ainda não foi avaliado. Somente quem comprou pode avaliar.</p>
          ) : (
            <div className="reviews">
              {reviews.map((r) => (
                <div key={r.id} className="review">
                  <div className="row gap-sm">
                    <Avatar name={userById(db, r.buyerId)?.name} size={32} />
                    <div>
                      <strong>{userById(db, r.buyerId)?.name}</strong>
                      <div className="muted small">{formatDate(r.createdAt)}</div>
                    </div>
                  </div>
                  <div className="review-scores">
                    <span>Produto: <Stars value={r.productRating} size={13} /></span>
                    <span>Vendedor: <Stars value={r.sellerRating} size={13} /></span>
                  </div>
                  {r.comment && <p>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {reporting && <ReportModal targetType="listing" targetId={listing.id} onClose={() => setReporting(false)} />}
    </div>
  );
}
