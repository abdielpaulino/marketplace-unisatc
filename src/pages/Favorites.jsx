import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrentUser, useDb } from '../core/hooks';
import ListingCard from '../components/ListingCard';
import { EmptyState } from '../components/ui';

export default function Favorites() {
  const db = useDb();
  const user = useCurrentUser();
  const ids = db.favorites.filter((f) => f.userId === user.id).map((f) => f.listingId);
  const listings = db.listings.filter((l) => ids.includes(l.id) && l.status === 'ativo');
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Favoritos</h1>
          <p className="muted">Você recebe notificações quando um favorito baixa de preço ou volta ao estoque.</p>
        </div>
      </div>
      {listings.length ? (
        <div className="grid">{listings.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
      ) : (
        <EmptyState icon={Heart} title="Nenhum favorito ainda" text="Toque no coração de um anúncio para salvá-lo." action={<Link to="/" className="btn btn-primary">Explorar anúncios</Link>} />
      )}
    </div>
  );
}
