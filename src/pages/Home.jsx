import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, SearchX, Plus, Gift, HelpCircle, ShoppingBag, X } from 'lucide-react';
import { useCurrentUser, useDb } from '../core/hooks';
import { CATEGORIES, SELLER_TYPES, filterListings } from '../core/rules';
import ListingCard from '../components/ListingCard';
import { EmptyState } from '../components/ui';

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'venda', label: 'À venda' },
  { id: 'doacao', label: 'Doações' },
  { id: 'achados', label: 'Achados e perdidos' },
];

const emptyFilters = { categories: [], sellerTypes: [], minPrice: '', maxPrice: '', onlyAvailable: false, sort: 'recentes' };

export default function Home() {
  const db = useDb();
  const user = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const kind = params.get('tipo') || 'todos';
  const [filters, setFilters] = useState(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);

  const results = useMemo(
    () => filterListings(db.listings, { ...filters, q, kind }, db),
    [db, filters, q, kind],
  );

  const setKind = (id) => {
    const next = new URLSearchParams(params);
    if (id === 'todos') next.delete('tipo');
    else next.set('tipo', id);
    setParams(next);
  };
  const toggleIn = (key, value) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));
  const activeCount = filters.categories.length + filters.sellerTypes.length + (filters.minPrice !== '' ? 1 : 0) + (filters.maxPrice !== '' ? 1 : 0) + (filters.onlyAvailable ? 1 : 0);

  const clearSearch = () => {
    const next = new URLSearchParams(params);
    next.delete('q');
    setParams(next);
  };

  return (
    <>
      {!q && kind === 'todos' && (
        <section className="hero">
          <img src="/logo.png" alt="" className="hero-watermark" aria-hidden="true" />
          <div>
            <h1>O marketplace da comunidade UniSatc</h1>
            <p>Compre, venda e doe entre alunos e professores, peça na cantina sem fila e encontre o que foi perdido no campus.</p>
            <div className="hero-actions">
              <Link to={user ? '/anunciar' : '/cadastro'} className="btn btn-white btn-lg"><Plus size={18} /> {user ? 'Criar anúncio' : 'Criar minha conta'}</Link>
              <Link to="/estabelecimentos" className="btn btn-ghost-light btn-lg">Ver restaurantes e lojas</Link>
            </div>
          </div>
          <div className="hero-cards">
            <button onClick={() => setKind('venda')}><ShoppingBag /> <span><strong>Comprar e vender</strong><small>Livros, eletrônicos, serviços…</small></span></button>
            <button onClick={() => setKind('doacao')}><Gift /> <span><strong>Doações</strong><small>Passe adiante o que não usa</small></span></button>
            <button onClick={() => setKind('achados')}><HelpCircle /> <span><strong>Achados e perdidos</strong><small>Perdeu algo no campus?</small></span></button>
          </div>
        </section>
      )}

      <div className="catalog">
        <aside className={`filters card ${showFilters ? 'open' : ''}`}>
          <div className="filters-head">
            <h3>Filtros</h3>
            {activeCount > 0 && <button className="link-btn" onClick={() => setFilters(emptyFilters)}>Limpar</button>}
            <button className="icon-btn show-sm" onClick={() => setShowFilters(false)} aria-label="Fechar filtros"><X size={18} /></button>
          </div>

          <div className="filter-group">
            <span className="label">Categoria</span>
            {CATEGORIES.map((c) => (
              <label key={c} className="check">
                <input type="checkbox" checked={filters.categories.includes(c)} onChange={() => toggleIn('categories', c)} /> {c}
              </label>
            ))}
          </div>

          {kind !== 'achados' && (
            <div className="filter-group">
              <span className="label">Preço (R$)</span>
              <div className="row gap-sm">
                <input type="number" min="0" placeholder="Mín." value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} aria-label="Preço mínimo" />
                <input type="number" min="0" placeholder="Máx." value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} aria-label="Preço máximo" />
              </div>
            </div>
          )}

          <div className="filter-group">
            <span className="label">Tipo de vendedor</span>
            {Object.entries(SELLER_TYPES).map(([id, label]) => (
              <label key={id} className="check">
                <input type="checkbox" checked={filters.sellerTypes.includes(id)} onChange={() => toggleIn('sellerTypes', id)} /> {label}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <label className="check">
              <input type="checkbox" checked={filters.onlyAvailable} onChange={(e) => setFilters({ ...filters, onlyAvailable: e.target.checked })} />
              Somente disponíveis
            </label>
          </div>
        </aside>

        <section>
          <div className="results-head">
            <div>
              {q ? (
                <h2>Resultados para “{q}” <button className="link-btn" onClick={clearSearch}>limpar busca</button></h2>
              ) : (
                <h2>{TABS.find((t) => t.id === kind)?.id === 'todos' ? 'Anúncios recentes' : TABS.find((t) => t.id === kind)?.label}</h2>
              )}
              <span className="muted small">{results.length} anúncio(s)</span>
            </div>
            <div className="row gap-sm">
              <button className="btn btn-outline show-sm" onClick={() => setShowFilters(true)}>
                <SlidersHorizontal size={16} /> Filtros {activeCount > 0 && `(${activeCount})`}
              </button>
              <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })} aria-label="Ordenar">
                <option value="recentes">Mais recentes</option>
                <option value="menor_preco">Menor preço</option>
                <option value="maior_preco">Maior preço</option>
                <option value="nome">Nome (A–Z)</option>
              </select>
            </div>
          </div>

          {results.length ? (
            <div className="grid">
              {results.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          ) : (
            <EmptyState icon={SearchX} title="Nenhum anúncio encontrado" text="Tente outras palavras-chave ou remova alguns filtros." />
          )}
        </section>
      </div>
    </>
  );
}
