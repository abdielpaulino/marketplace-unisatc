import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Flag, MessageCircle, GraduationCap, Calendar } from 'lucide-react';
import { sellerRating, useCurrentUser, useDb, userById } from '../core/hooks';
import { ROLES, formatDate } from '../core/rules';
import { changePassword, startConversation, updateProfile } from '../core/services';
import { useAction, useToast } from '../context/Toast';
import { Avatar, Field, Stars } from '../components/ui';
import ListingCard from '../components/ListingCard';
import ReportModal from '../components/ReportModal';
import NotFound from './NotFound';

export function UserProfile() {
  const { id } = useParams();
  const db = useDb();
  const me = useCurrentUser();
  const run = useAction();
  const navigate = useNavigate();
  const [reporting, setReporting] = useState(false);
  const user = userById(db, id);
  if (!user || user.role === 'admin') return <NotFound />;

  const rating = sellerRating(db, user.id);
  const listings = db.listings.filter((l) => l.sellerId === user.id && l.status === 'ativo' && !l.establishmentId);
  const establishments = db.establishments.filter((e) => e.ownerId === user.id && e.status === 'aprovado');
  const reviews = db.reviews.filter((r) => r.sellerId === user.id);

  const chat = async () => {
    if (!me) return navigate('/login');
    const convId = await run(() => startConversation(user.id));
    if (convId) navigate(`/chat/${convId}`);
  };

  return (
    <div>
      <div className="card pad profile-head">
        <Avatar name={user.name} size={80} />
        <div className="list-main">
          <h1>{user.name}</h1>
          <div className="detail-facts">
            <span className={`tag tag-${user.role}`}>{ROLES[user.role]}</span>
            {user.course && <span><GraduationCap size={16} /> {user.course}</span>}
            <span><Calendar size={16} /> Membro desde {formatDate(user.createdAt)}</span>
          </div>
          <Stars value={rating.avg} count={rating.count} />
          {user.blocked && <div className="alert alert-warning">Usuário indisponível.</div>}
        </div>
        {me && me.id !== user.id && !user.blocked && (
          <div className="stack">
            <button className="btn btn-primary" onClick={chat}><MessageCircle size={18} /> Enviar mensagem</button>
            <button className="link-btn danger small" onClick={() => setReporting(true)}><Flag size={14} /> Denunciar usuário</button>
          </div>
        )}
        {me?.id === user.id && <Link to="/perfil" className="btn btn-outline">Editar perfil</Link>}
      </div>

      {establishments.length > 0 && (
        <section className="section">
          <h2>Estabelecimentos</h2>
          <div className="row gap-sm wrap">
            {establishments.map((e) => <Link key={e.id} to={`/estabelecimentos/${e.id}`} className="btn btn-outline">{e.name}</Link>)}
          </div>
        </section>
      )}

      {!user.blocked && (
        <section className="section">
          <h2>Anúncios ({listings.length})</h2>
          {listings.length ? <div className="grid">{listings.map((l) => <ListingCard key={l.id} listing={l} />)}</div> : <p className="muted">Nenhum anúncio ativo.</p>}
        </section>
      )}

      <section className="section card pad">
        <h2>Avaliações como vendedor</h2>
        {reviews.length === 0 ? <p className="muted">Ainda sem avaliações.</p> : (
          <div className="reviews">
            {reviews.map((r) => (
              <div key={r.id} className="review">
                <div className="row between"><strong>{userById(db, r.buyerId)?.name}</strong><Stars value={r.sellerRating} size={13} /></div>
                <span className="muted small">{db.listings.find((l) => l.id === r.listingId)?.title} · {formatDate(r.createdAt)}</span>
                {r.comment && <p>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
      {reporting && <ReportModal targetType="user" targetId={user.id} onClose={() => setReporting(false)} />}
    </div>
  );
}

export function Profile() {
  const user = useCurrentUser();
  const run = useAction();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, course: user.course, phone: user.phone });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });

  const savePwd = async (e) => {
    e.preventDefault();
    if (pwd.next !== pwd.confirm) return toast('As senhas não conferem.', 'error');
    const ok = await run(() => changePassword(pwd.current, pwd.next), 'Senha alterada!');
    if (ok) setPwd({ current: '', next: '', confirm: '' });
  };

  return (
    <div className="narrow">
      <div className="page-head">
        <h1>Meu perfil</h1>
        <Link to={`/usuario/${user.id}`} className="btn btn-outline">Ver perfil público</Link>
      </div>
      <form className="card pad form" onSubmit={(e) => { e.preventDefault(); run(() => updateProfile(form), 'Perfil atualizado!'); }}>
        <h3>Dados pessoais</h3>
        <Field label="E-mail institucional" hint="O e-mail não pode ser alterado."><input value={user.email} disabled /></Field>
        <Field label="Nome completo"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="form-row">
          <Field label="Curso / departamento"><input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} /></Field>
          <Field label="Telefone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <div className="row end"><button className="btn btn-primary">Salvar</button></div>
      </form>

      <form className="card pad form section" onSubmit={savePwd}>
        <h3>Alterar senha</h3>
        <Field label="Senha atual"><input type="password" required value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} autoComplete="current-password" /></Field>
        <div className="form-row">
          <Field label="Nova senha"><input type="password" required minLength={6} value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} autoComplete="new-password" /></Field>
          <Field label="Confirmar nova senha"><input type="password" required value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} autoComplete="new-password" /></Field>
        </div>
        <div className="row end"><button className="btn btn-primary">Alterar senha</button></div>
      </form>
    </div>
  );
}
