import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Minus, LayoutGrid, Eye } from 'lucide-react';
import { useCurrentUser, useDb, sellerLabel } from '../core/hooks';
import { KINDS, isTradeKind } from '../core/rules';
import { deleteListing, setResolved, updateStock } from '../core/services';
import { useAction } from '../context/Toast';
import { EmptyState } from '../components/ui';
import { priceLabel } from '../components/ListingCard';

const FILTERS = { ativos: 'Ativos', esgotados: 'Sem estoque', achados: 'Achados e perdidos', removidos: 'Removidos' };

export default function MyListings() {
  const db = useDb();
  const user = useCurrentUser();
  const run = useAction();
  const [tab, setTab] = useState('ativos');

  const mine = db.listings.filter((l) => l.sellerId === user.id && l.status !== 'excluido');
  const groups = {
    ativos: mine.filter((l) => l.status === 'ativo' && isTradeKind(l.kind) && l.stock > 0 && l.available),
    esgotados: mine.filter((l) => l.status === 'ativo' && isTradeKind(l.kind) && (l.stock <= 0 || !l.available)),
    achados: mine.filter((l) => l.status === 'ativo' && !isTradeKind(l.kind)),
    removidos: mine.filter((l) => l.status === 'removido'),
  };
  const list = groups[tab];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Meus anúncios</h1>
          <p className="muted">Mantenha informações, preços e estoque sempre atualizados.</p>
        </div>
        <Link to="/anunciar" className="btn btn-primary"><Plus size={18} /> Novo anúncio</Link>
      </div>

      <div className="tabs">
        {Object.entries(FILTERS).map(([k, v]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{v} ({groups[k].length})</button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="Nada por aqui" text="Seus anúncios aparecerão nesta lista." action={<Link to="/anunciar" className="btn btn-primary">Criar anúncio</Link>} />
      ) : (
        <div className="list">
          {list.map((l) => (
            <div key={l.id} className="card list-row">
              <img className="list-thumb" src={l.images[0]} alt="" />
              <div className="list-main">
                <Link to={`/anuncio/${l.id}`} className="strong">{l.title}</Link>
                <div className="muted small">{KINDS[l.kind].label} · {l.category} · {sellerLabel(db, l).name}</div>
                <div className="price">{priceLabel(l)}</div>
                {l.status === 'removido' && <div className="text-danger small">Removido pela administração: {l.removedReason}</div>}
              </div>

              {l.status === 'ativo' && isTradeKind(l.kind) && (
                <div className="stock-ctrl">
                  <span className="label">Estoque</span>
                  <div className="qty">
                    <button onClick={() => run(() => updateStock(l.id, { stock: Math.max(0, l.stock - 1) }))} aria-label="Diminuir estoque"><Minus size={14} /></button>
                    <span>{l.stock}</span>
                    <button onClick={() => run(() => updateStock(l.id, { stock: l.stock + 1 }))} aria-label="Aumentar estoque"><Plus size={14} /></button>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={l.available} onChange={(e) => run(() => updateStock(l.id, { available: e.target.checked }))} />
                    <span>{l.available ? 'Disponível' : 'Pausado'}</span>
                  </label>
                </div>
              )}
              {l.status === 'ativo' && !isTradeKind(l.kind) && (
                <label className="switch">
                  <input type="checkbox" checked={l.resolved} onChange={(e) => run(() => setResolved(l.id, e.target.checked))} />
                  <span>{l.resolved ? 'Resolvido' : 'Em aberto'}</span>
                </label>
              )}

              <div className="list-actions">
                <Link to={`/anuncio/${l.id}`} className="icon-btn" title="Ver"><Eye size={18} /></Link>
                {l.status === 'ativo' && <Link to={`/anuncio/${l.id}/editar`} className="icon-btn" title="Editar"><Pencil size={18} /></Link>}
                <button className="icon-btn danger" title="Excluir" onClick={() => confirm(`Excluir “${l.title}”?`) && run(() => deleteListing(l.id), 'Anúncio excluído.')}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
