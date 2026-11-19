import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Users, Store, LayoutGrid, Flag, Package, ShieldCheck } from 'lucide-react';
import { sellerLabel, useCurrentUser, useDb, userById } from '../core/hooks';
import { KINDS, ROLES, formatDate, normalize } from '../core/rules';
import {
  adminRemoveListing, adminResolveReport, adminRestoreListing, adminSetEstablishmentStatus, adminSetUserBlocked,
} from '../core/services';
import { useAction } from '../context/Toast';
import { Avatar, SellerTypeBadge } from '../components/ui';
import { priceLabel } from '../components/ListingCard';

const TABS = [
  ['geral', 'Visão geral', ShieldCheck],
  ['usuarios', 'Usuários', Users],
  ['estabelecimentos', 'Estabelecimentos', Store],
  ['anuncios', 'Anúncios', LayoutGrid],
  ['denuncias', 'Denúncias', Flag],
];

function Search({ value, onChange, placeholder }) {
  return <input className="admin-search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

function Overview({ db, go }) {
  const stats = [
    ['Usuários', db.users.filter((u) => u.role !== 'admin').length, Users, 'usuarios'],
    ['Anúncios ativos', db.listings.filter((l) => l.status === 'ativo').length, LayoutGrid, 'anuncios'],
    ['Estabelecimentos pendentes', db.establishments.filter((e) => e.status === 'pendente').length, Store, 'estabelecimentos'],
    ['Denúncias abertas', db.reports.filter((r) => r.status === 'aberta').length, Flag, 'denuncias'],
    ['Pedidos realizados', db.orders.length, Package, null],
  ];
  return (
    <div className="stats">
      {stats.map(([label, value, Icon, tab]) => (
        <button key={label} className="card pad stat" onClick={() => tab && go(tab)}>
          <Icon size={22} />
          <strong>{value}</strong>
          <span className="muted small">{label}</span>
        </button>
      ))}
    </div>
  );
}

function UsersTab({ db, me }) {
  const run = useAction();
  const [q, setQ] = useState('');
  const list = db.users.filter((u) => normalize(`${u.name} ${u.email}`).includes(normalize(q)));
  return (
    <>
      <Search value={q} onChange={setQ} placeholder="Buscar por nome ou e-mail…" />
      <div className="table-wrap card">
        <table className="table">
          <thead><tr><th>Usuário</th><th>Perfil</th><th>Cadastro</th><th>Anúncios</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td><div className="row gap-sm"><Avatar name={u.name} size={32} /><div><Link to={`/usuario/${u.id}`}>{u.name}</Link><div className="muted small">{u.email}</div></div></div></td>
                <td>{ROLES[u.role]}</td>
                <td>{formatDate(u.createdAt)}</td>
                <td>{db.listings.filter((l) => l.sellerId === u.id && l.status === 'ativo').length}</td>
                <td>{u.blocked ? <span className="badge badge-danger">Bloqueado</span> : <span className="badge badge-success">Ativo</span>}</td>
                <td className="right">
                  {u.id !== me.id && u.role !== 'admin' && (
                    u.blocked
                      ? <button className="btn btn-sm btn-outline" onClick={() => run(() => adminSetUserBlocked(u.id, false), 'Usuário desbloqueado.')}>Desbloquear</button>
                      : <button className="btn btn-sm btn-outline-danger" onClick={() => confirm(`Bloquear ${u.name}? Ele não poderá mais acessar a plataforma.`) && run(() => adminSetUserBlocked(u.id, true), 'Usuário bloqueado.')}>Bloquear</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EstablishmentsTab({ db }) {
  const run = useAction();
  const order = { pendente: 0, aprovado: 1, rejeitado: 2 };
  const list = [...db.establishments].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <div className="table-wrap card">
      <table className="table">
        <thead><tr><th>Estabelecimento</th><th>Responsável</th><th>Local</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {list.map((e) => (
            <tr key={e.id}>
              <td><div className="row gap-sm"><Avatar name={e.name} src={e.logo} size={32} /><div>{e.status === 'aprovado' ? <Link to={`/estabelecimentos/${e.id}`}>{e.name}</Link> : e.name}<div><SellerTypeBadge type={e.type} /></div></div></div></td>
              <td>{userById(db, e.ownerId)?.name}</td>
              <td>{e.location}</td>
              <td><span className={`badge badge-${{ pendente: 'warning', aprovado: 'success', rejeitado: 'danger' }[e.status]}`}>{{ pendente: 'Pendente', aprovado: 'Aprovado', rejeitado: 'Rejeitado' }[e.status]}</span></td>
              <td className="right nowrap">
                {e.status !== 'aprovado' && <button className="btn btn-sm btn-primary" onClick={() => run(() => adminSetEstablishmentStatus(e.id, 'aprovado'), 'Estabelecimento aprovado.')}>Aprovar</button>}{' '}
                {e.status !== 'rejeitado' && <button className="btn btn-sm btn-outline-danger" onClick={() => run(() => adminSetEstablishmentStatus(e.id, 'rejeitado'), 'Estabelecimento rejeitado.')}>{e.status === 'aprovado' ? 'Suspender' : 'Rejeitar'}</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListingsTab({ db }) {
  const run = useAction();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ativo');
  const list = db.listings.filter((l) => l.status === status && normalize(`${l.title} ${l.description}`).includes(normalize(q)));
  const remove = (l) => {
    const reason = prompt('Motivo da remoção (será enviado ao anunciante):', 'Anúncio em desacordo com as normas da instituição.');
    if (reason) run(() => adminRemoveListing(l.id, reason), 'Anúncio removido.');
  };
  return (
    <>
      <div className="row gap-sm wrap">
        <Search value={q} onChange={setQ} placeholder="Buscar anúncios…" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="ativo">Ativos</option>
          <option value="removido">Removidos</option>
          <option value="excluido">Excluídos pelo vendedor</option>
        </select>
      </div>
      <div className="table-wrap card">
        <table className="table">
          <thead><tr><th>Anúncio</th><th>Tipo</th><th>Vendedor</th><th>Preço</th><th>Denúncias</th><th></th></tr></thead>
          <tbody>
            {list.map((l) => {
              const reports = db.reports.filter((r) => r.targetId === l.id && r.status === 'aberta').length;
              return (
                <tr key={l.id}>
                  <td><div className="row gap-sm"><img src={l.images[0]} alt="" className="list-thumb sm" /><Link to={`/anuncio/${l.id}`}>{l.title}</Link></div></td>
                  <td>{KINDS[l.kind].label}</td>
                  <td>{sellerLabel(db, l).name}</td>
                  <td>{priceLabel(l)}</td>
                  <td>{reports > 0 ? <span className="badge badge-danger">{reports}</span> : '—'}</td>
                  <td className="right">
                    {l.status === 'ativo' && <button className="btn btn-sm btn-outline-danger" onClick={() => remove(l)}>Remover</button>}
                    {l.status === 'removido' && <button className="btn btn-sm btn-outline" onClick={() => run(() => adminRestoreListing(l.id), 'Anúncio restaurado.')}>Restaurar</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReportsTab({ db }) {
  const run = useAction();
  const [status, setStatus] = useState('aberta');
  const list = db.reports.filter((r) => r.status === status || (status === 'fechadas' && r.status !== 'aberta'));
  const actionLabel = { remover_anuncio: 'Anúncio removido', bloquear_usuario: 'Usuário bloqueado', descartar: 'Descartada' };
  return (
    <>
      <div className="tabs">
        <button className={status === 'aberta' ? 'active' : ''} onClick={() => setStatus('aberta')}>Abertas ({db.reports.filter((r) => r.status === 'aberta').length})</button>
        <button className={status === 'fechadas' ? 'active' : ''} onClick={() => setStatus('fechadas')}>Analisadas</button>
      </div>
      {list.length === 0 && <p className="muted">Nenhuma denúncia.</p>}
      <div className="stack">
        {list.map((r) => {
          const listing = r.targetType === 'listing' && db.listings.find((l) => l.id === r.targetId);
          const target = r.targetType === 'user' ? userById(db, r.targetId) : listing;
          return (
            <div key={r.id} className="card pad report">
              <div className="row between wrap">
                <div>
                  <span className="badge badge-danger">{r.reason}</span>
                  <h3>
                    {r.targetType === 'listing' ? 'Anúncio: ' : 'Usuário: '}
                    <Link to={r.targetType === 'listing' ? `/anuncio/${r.targetId}` : `/usuario/${r.targetId}`}>{target?.title || target?.name}</Link>
                  </h3>
                  <span className="muted small">Denunciado por {userById(db, r.reporterId)?.name} em {formatDate(r.createdAt, true)}</span>
                  {r.details && <p>“{r.details}”</p>}
                  {listing && <p className="muted small">Status do anúncio: {listing.status}</p>}
                </div>
                {r.status === 'aberta' ? (
                  <div className="row gap-sm wrap">
                    <button className="btn btn-sm btn-ghost" onClick={() => run(() => adminResolveReport(r.id, 'descartar'), 'Denúncia descartada.')}>Descartar</button>
                    {r.targetType === 'listing' && listing?.status === 'ativo' && (
                      <button className="btn btn-sm btn-outline-danger" onClick={() => run(() => adminResolveReport(r.id, 'remover_anuncio'), 'Anúncio removido.')}>Remover anúncio</button>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => confirm('Bloquear o usuário responsável?') && run(() => adminResolveReport(r.id, 'bloquear_usuario'), 'Usuário bloqueado.')}>Bloquear usuário</button>
                  </div>
                ) : (
                  <span className="badge badge-neutral">{actionLabel[r.action] || r.status}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** RF20 / RN10 – administration panel. */
export default function Admin() {
  const db = useDb();
  const me = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const tab = params.get('aba') || 'geral';
  const go = (t) => setParams(t === 'geral' ? {} : { aba: t });
  const badges = {
    estabelecimentos: db.establishments.filter((e) => e.status === 'pendente').length,
    denuncias: db.reports.filter((r) => r.status === 'aberta').length,
  };

  return (
    <div>
      <div className="page-head"><div><h1>Painel administrativo</h1><p className="muted">Gerencie usuários, estabelecimentos, anúncios e denúncias.</p></div></div>
      <div className="tabs">
        {TABS.map(([k, label, Icon]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => go(k)}>
            <Icon size={16} /> {label} {badges[k] > 0 && <span className="count static">{badges[k]}</span>}
          </button>
        ))}
      </div>
      {tab === 'geral' && <Overview db={db} go={go} />}
      {tab === 'usuarios' && <UsersTab db={db} me={me} />}
      {tab === 'estabelecimentos' && <EstablishmentsTab db={db} />}
      {tab === 'anuncios' && <ListingsTab db={db} />}
      {tab === 'denuncias' && <ReportsTab db={db} />}
    </div>
  );
}
