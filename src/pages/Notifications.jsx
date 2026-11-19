import { useNavigate } from 'react-router-dom';
import { Bell, Package, MessageCircle, Tag, Store, Flag, Star, Info } from 'lucide-react';
import { useCurrentUser, useDb } from '../core/hooks';
import { timeAgo } from '../core/rules';
import { markAllNotificationsRead, markNotificationRead } from '../core/services';
import { EmptyState } from '../components/ui';

const ICONS = { pedido: Package, mensagem: MessageCircle, oferta: Tag, estabelecimento: Store, denuncia: Flag, avaliacao: Star, sistema: Info };

export default function Notifications() {
  const db = useDb();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const list = db.notifications.filter((n) => n.userId === user.id);
  const unread = list.filter((n) => !n.read).length;

  const open = (n) => {
    if (!n.read) markNotificationRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="narrow">
      <div className="page-head">
        <div>
          <h1>Notificações</h1>
          <p className="muted">Pedidos, mensagens e ofertas dos seus favoritos.</p>
        </div>
        {unread > 0 && <button className="btn btn-outline" onClick={markAllNotificationsRead}>Marcar todas como lidas</button>}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={Bell} title="Nenhuma notificação" />
      ) : (
        <div className="card notif-list">
          {list.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <button key={n.id} className={`notif ${n.read ? '' : 'unread'}`} onClick={() => open(n)}>
                <span className={`notif-icon nt-${n.type}`}><Icon size={18} /></span>
                <span className="notif-main">
                  <strong>{n.title}</strong>
                  <span className="muted small">{n.body}</span>
                </span>
                <span className="muted small nowrap">{timeAgo(n.createdAt)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
