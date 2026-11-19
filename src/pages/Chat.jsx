import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { useCurrentUser, useDb, userById } from '../core/hooks';
import { formatDate, timeAgo } from '../core/rules';
import { markConversationRead, sendMessage } from '../core/services';
import { useAction } from '../context/Toast';
import { Avatar, EmptyState } from '../components/ui';

export default function Chat() {
  const { id } = useParams();
  const db = useDb();
  const user = useCurrentUser();
  const run = useAction();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const endRef = useRef(null);

  const conversations = db.conversations
    .filter((c) => c.participants.includes(user.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const active = conversations.find((c) => c.id === id);
  const messages = active ? db.messages.filter((m) => m.conversationId === active.id) : [];
  const other = active && userById(db, active.participants.find((p) => p !== user.id));
  const listing = active?.listingId && db.listings.find((l) => l.id === active.listingId);

  useEffect(() => {
    if (active) markConversationRead(active.id);
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [active?.id, messages.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const ok = await run(() => sendMessage(active.id, text));
    if (ok) setText('');
  };

  if (!conversations.length)
    return <EmptyState icon={MessageCircle} title="Nenhuma conversa ainda" text="Converse com vendedores pela página de um anúncio." action={<Link to="/" className="btn btn-primary">Ver anúncios</Link>} />;

  return (
    <div className={`chat card ${active ? 'has-active' : ''}`}>
      <aside className="chat-list">
        <h2>Mensagens</h2>
        {conversations.map((c) => {
          const o = userById(db, c.participants.find((p) => p !== user.id));
          const msgs = db.messages.filter((m) => m.conversationId === c.id);
          const last = msgs.at(-1);
          const unread = msgs.filter((m) => !m.readBy.includes(user.id)).length;
          const l = c.listingId && db.listings.find((x) => x.id === c.listingId);
          return (
            <Link key={c.id} to={`/chat/${c.id}`} className={`chat-item ${c.id === id ? 'active' : ''}`}>
              <Avatar name={o?.name} size={40} />
              <div className="chat-item-main">
                <div className="row between"><strong className="truncate">{o?.name}</strong><span className="muted small">{last && timeAgo(last.createdAt)}</span></div>
                {l && <span className="small accent truncate">{l.title}</span>}
                <span className="muted small truncate">{last ? last.text : 'Nova conversa'}</span>
              </div>
              {unread > 0 && <span className="count static">{unread}</span>}
            </Link>
          );
        })}
      </aside>

      <section className="chat-main">
        {active ? (
          <>
            <div className="chat-head">
              <button className="icon-btn show-sm" onClick={() => navigate('/chat')} aria-label="Voltar"><ArrowLeft size={20} /></button>
              <Avatar name={other?.name} size={36} />
              <div>
                <Link to={`/usuario/${other?.id}`} className="strong">{other?.name}</Link>
                {listing && <div className="small"><Link to={`/anuncio/${listing.id}`}>Sobre: {listing.title}</Link></div>}
              </div>
            </div>
            <div className="messages">
              {messages.length === 0 && <p className="muted center">Envie a primeira mensagem 👋</p>}
              {messages.map((m) => (
                <div key={m.id} className={`msg ${m.senderId === user.id ? 'mine' : ''}`}>
                  <p>{m.text}</p>
                  <span className="msg-time">{formatDate(m.createdAt, true)}</span>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {other?.blocked ? (
              <div className="alert alert-warning">Este usuário está indisponível.</div>
            ) : (
              <form className="chat-input" onSubmit={send}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma mensagem…" maxLength={1000} aria-label="Mensagem" />
                <button className="btn btn-primary" disabled={!text.trim()} aria-label="Enviar"><Send size={18} /></button>
              </form>
            )}
          </>
        ) : (
          <EmptyState icon={MessageCircle} title="Selecione uma conversa" />
        )}
      </section>
    </div>
  );
}
