import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Store, Plus, Clock, MapPin, Pencil, UtensilsCrossed } from 'lucide-react';
import { establishmentRating, useCurrentUser, useDb, userById } from '../core/hooks';
import { createEstablishment, updateEstablishment } from '../core/services';
import { useAction } from '../context/Toast';
import { Avatar, EmptyState, Field, ImagesInput, Modal, SellerTypeBadge, Stars } from '../components/ui';
import ListingCard from '../components/ListingCard';
import NotFound from './NotFound';

const STATUS = { pendente: ['Aguardando aprovação', 'warning'], aprovado: ['Aprovado', 'success'], rejeitado: ['Rejeitado', 'danger'] };

function EstablishmentForm({ initial, onClose }) {
  const run = useAction();
  const [form, setForm] = useState(initial || { name: '', type: 'restaurante', description: '', location: '', hours: '', logo: null });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async () => {
    const ok = await run(
      () => (initial ? updateEstablishment(initial.id, form) : createEstablishment(form)),
      initial ? 'Dados atualizados.' : 'Cadastro enviado! Aguarde a aprovação da administração.',
    );
    if (ok) onClose();
  };
  return (
    <Modal title={initial ? 'Editar estabelecimento' : 'Cadastrar estabelecimento'} onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit}>{initial ? 'Salvar' : 'Enviar para aprovação'}</button>
      </>
    }>
      <div className="form">
        {!initial && (
          <div className="segmented">
            {[['restaurante', 'Restaurante / lanchonete'], ['loja', 'Loja']].map(([v, l]) => (
              <button type="button" key={v} className={form.type === v ? 'active' : ''} onClick={() => setForm({ ...form, type: v })}>{l}</button>
            ))}
          </div>
        )}
        <Field label="Nome *"><input value={form.name} onChange={set('name')} /></Field>
        <Field label="Descrição"><textarea rows={2} value={form.description} onChange={set('description')} /></Field>
        <div className="form-row">
          <Field label="Localização no campus *"><input value={form.location} onChange={set('location')} placeholder="Ex.: Bloco A – térreo" /></Field>
          <Field label="Horário de funcionamento"><input value={form.hours} onChange={set('hours')} placeholder="Seg a sex, 8h às 22h" /></Field>
        </div>
        <div>
          <span className="label">Logo</span>
          <ImagesInput max={1} value={form.logo ? [form.logo] : []} onChange={(imgs) => setForm({ ...form, logo: imgs[0] || null })} />
        </div>
      </div>
    </Modal>
  );
}

/** RF05 / RF07 – the user's restaurants and stores. */
export function MyEstablishments() {
  const db = useDb();
  const user = useCurrentUser();
  const [editing, setEditing] = useState(null); // null | 'new' | establishment
  const mine = db.establishments.filter((e) => e.ownerId === user.id);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Meu estabelecimento</h1>
          <p className="muted">Cadastre seu restaurante, lanchonete ou loja do campus e gerencie o cardápio/catálogo.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}><Plus size={18} /> Cadastrar estabelecimento</button>
      </div>

      {mine.length === 0 ? (
        <EmptyState icon={Store} title="Você ainda não tem estabelecimentos" text="Após o cadastro, a administração analisa e aprova o estabelecimento." />
      ) : (
        <div className="stack">
          {mine.map((e) => {
            const products = db.listings.filter((l) => l.establishmentId === e.id && l.status === 'ativo');
            const [label, tone] = STATUS[e.status];
            return (
              <div key={e.id} className="card pad">
                <div className="est-head">
                  <Avatar name={e.name} src={e.logo} size={56} />
                  <div className="list-main">
                    <div className="row gap-sm wrap"><h3>{e.name}</h3><SellerTypeBadge type={e.type} /><span className={`badge badge-${tone}`}>{label}</span></div>
                    <span className="muted small"><MapPin size={12} /> {e.location} {e.hours && <> · <Clock size={12} /> {e.hours}</>}</span>
                  </div>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditing(e)}><Pencil size={16} /> Editar</button>
                </div>
                {e.status === 'aprovado' ? (
                  <>
                    <div className="row between section-sm">
                      <strong>{e.type === 'restaurante' ? 'Cardápio' : 'Produtos'} ({products.length})</strong>
                      <div className="row gap-sm">
                        <Link to={`/estabelecimentos/${e.id}`} className="btn btn-sm btn-outline">Ver página</Link>
                        <Link to={`/anunciar?est=${e.id}`} className="btn btn-sm btn-primary"><Plus size={16} /> Adicionar produto</Link>
                      </div>
                    </div>
                    <div className="mini-list">
                      {products.map((p) => (
                        <Link key={p.id} to={`/anuncio/${p.id}/editar`} className="mini-item">
                          <img src={p.images[0]} alt="" />
                          <span className="truncate">{p.title}</span>
                          <span className={p.stock > 0 && p.available ? 'muted small' : 'text-danger small'}>{p.available ? `${p.stock} un.` : 'Pausado'}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="muted small section-sm">
                    {e.status === 'pendente' ? 'Assim que for aprovado você poderá adicionar produtos.' : 'Procure a administração para mais informações.'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {editing && <EstablishmentForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export function EstablishmentsList() {
  const db = useDb();
  const [type, setType] = useState('todos');
  const list = db.establishments.filter((e) => e.status === 'aprovado' && (type === 'todos' || e.type === type));
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Restaurantes e lojas</h1>
          <p className="muted">Faça seu pedido e retire no balcão, sem fila.</p>
        </div>
      </div>
      <div className="tabs">
        {[['todos', 'Todos'], ['restaurante', 'Restaurantes'], ['loja', 'Lojas']].map(([k, v]) => (
          <button key={k} className={type === k ? 'active' : ''} onClick={() => setType(k)}>{v}</button>
        ))}
      </div>
      {list.length ? (
        <div className="grid est-grid">
          {list.map((e) => {
            const r = establishmentRating(db, e.id);
            return (
              <Link key={e.id} to={`/estabelecimentos/${e.id}`} className="card pad est-card">
                <Avatar name={e.name} src={e.logo} size={64} />
                <div>
                  <h3>{e.name}</h3>
                  <SellerTypeBadge type={e.type} />
                  <p className="muted small">{e.description}</p>
                  <Stars value={r.avg} size={13} count={r.count} />
                  <div className="muted small"><MapPin size={12} /> {e.location}</div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={UtensilsCrossed} title="Nenhum estabelecimento" />
      )}
    </div>
  );
}

export function EstablishmentPage() {
  const { id } = useParams();
  const db = useDb();
  const est = db.establishments.find((e) => e.id === id);
  if (!est || est.status !== 'aprovado') return <NotFound />;
  const owner = userById(db, est.ownerId);
  const products = db.listings.filter((l) => l.establishmentId === est.id && l.status === 'ativo');
  const r = establishmentRating(db, est.id);
  const byCategory = products.reduce((acc, p) => ((acc[p.category] ||= []).push(p), acc), {});
  return (
    <div>
      <div className="card pad est-hero">
        <Avatar name={est.name} src={est.logo} size={88} />
        <div>
          <div className="row gap-sm wrap"><h1>{est.name}</h1><SellerTypeBadge type={est.type} /></div>
          <p>{est.description}</p>
          <div className="detail-facts">
            <span><MapPin size={16} /> {est.location}</span>
            {est.hours && <span><Clock size={16} /> {est.hours}</span>}
            <Stars value={r.avg} count={r.count} />
          </div>
          <span className="muted small">Responsável: <Link to={`/usuario/${owner?.id}`}>{owner?.name}</Link></span>
        </div>
      </div>
      {products.length === 0 && <EmptyState icon={Store} title="Nenhum produto cadastrado ainda" />}
      {Object.entries(byCategory).map(([cat, items]) => (
        <section key={cat} className="section">
          <h2>{cat}</h2>
          <div className="grid">{items.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
        </section>
      ))}
    </div>
  );
}
