import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { isOutOfStock, listingRating, sellerLabel, useDb } from '../core/hooks';
import { KINDS, formatPrice, timeAgo } from '../core/rules';
import { SellerTypeBadge, Stars } from './ui';

export function priceLabel(l) {
  if (l.kind === 'venda') return formatPrice(l.price);
  if (l.kind === 'doacao') return 'Grátis';
  return KINDS[l.kind].label;
}

export default function ListingCard({ listing }) {
  const db = useDb();
  const seller = sellerLabel(db, listing);
  const rating = listingRating(db, listing.id);
  const out = isOutOfStock(listing);
  return (
    <Link to={`/anuncio/${listing.id}`} className="card listing-card">
      <div className="listing-img">
        {listing.images[0] ? <img src={listing.images[0]} alt={listing.title} loading="lazy" /> : <div className="no-img">Sem foto</div>}
        <span className={`kind kind-${listing.kind}`}>{KINDS[listing.kind].label}</span>
        {out && <span className="overlay">{listing.available ? 'Esgotado' : 'Indisponível'}</span>}
        {listing.resolved && <span className="overlay">{listing.kind === 'perdido' ? 'Encontrado' : 'Devolvido'}</span>}
      </div>
      <div className="listing-body">
        <span className="muted small">{listing.category}</span>
        <h3 className="listing-title">{listing.title}</h3>
        <div className={`price ${listing.kind !== 'venda' ? `price-${listing.kind}` : ''}`}>{priceLabel(listing)}</div>
        {rating.count > 0 && <Stars value={rating.avg} size={13} count={rating.count} />}
        <div className="listing-meta">
          <span className="seller-line"><SellerTypeBadge type={seller.type} /> <span className="truncate">{seller.name}</span></span>
        </div>
        <div className="listing-foot muted small">
          {listing.location && <span className="truncate"><MapPin size={12} /> {listing.location}</span>}
          <span>{timeAgo(listing.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
