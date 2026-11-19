import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Package, MessageCircle, Star, Receipt, Check } from 'lucide-react';
import { useCurrentUser, useDb, userById } from '../core/hooks';
import { ORDER_FLOW, ORDER_STATUS, canReview, canTransitionOrder, formatDate, formatPrice } from '../core/rules';
import { createReview, startConversation, updateOrderStatus } from '../core/services';
import { useAction } from '../context/Toast';
import { EmptyState, Field, Modal, StarInput, StatusBadge } from '../components/ui';

function Timeline({ order }) {
  if (order.status === 'cancelado')
    return <div className="timeline cancelled">Pedido cancelado em {formatDate(order.history.at(-1).at, true)}</div>;
  const idx = ORDER_FLOW.indexOf(order.status);
  return (
    <ol className="timeline">
      {ORDER_FLOW.map((s, i) => {
        const h = order.history.find((x) => x.status === s);
        return (
          <li key={s} className={i <= idx ? 'done' : ''}>
            <span className="dot">{i <= idx && <Check size={12} />}</span>
            <span className="tl-label">{ORDER_STATUS[s].label}</span>
            {h && <span className="muted small">{formatDate(h.at, true)}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function ReviewModal({ order, item, onClose }) {
  const run = useAction();
  const [productRating, setProduct] = useState(0);
  const [sellerRating, setSeller] = useState(0);
  const [comment, setComment] = useState('');
  const submit = async () => {
    const ok = await run(() => createReview({ orderId: order.id, listingId: item.listingId, productRating, sellerRating, comment }), 'Obrigado pela avaliação!');
    if (ok) onClose();
  };
  return (
    <Modal title={`Avaliar: ${item.title}`} onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!productRating || !sellerRating} onClick={submit}>Enviar avaliação</button>
      </>
    }>
      <div className="form">
        <StarInput label="Produto" value={productRating} onChange={setProduct} />
        <StarInput label="Vendedor" value={sellerRating} onChange={setSeller} />
        <Field label="Comentário (opcional)">
          <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
        </Field>
      </div>
    </Modal>
  );
}

function OrderCard({ order, perspective }) {
  const db = useDb();
  const user = useCurrentUser();
  const run = useAction();
  const navigate = useNavigate();
  const [reviewing, setReviewing] = useState(null);
  const other = userById(db, perspective === 'buyer' ? order.sellerId : order.buyerId);
  const est = order.items[0]?.establishmentId && db.establishments.find((e) => e.id === order.items[0].establishmentId);

  const chat = async () => {
    const id = await run(() => startConversation(other.id, order.items[0]?.listingId || null));
    if (id) navigate(`/chat/${id}`);
  };
  const nextStatus = { pendente: 'confirmado', confirmado: 'pronto', pronto: 'entregue' }[order.status];
  const nextLabel = { confirmado: 'Confirmar pedido', pronto: 'Marcar como pronto', entregue: 'Marcar como entregue' }[nextStatus];

  return (
    <div className="card pad order">
      <div className="order-head">
        <div>
          <strong>Pedido #{order.number}</strong>
          <span className="muted small"> · {formatDate(order.createdAt, true)}</span>
          <div className="muted small">
            {perspective === 'buyer' ? 'Vendedor: ' : 'Comprador: '}
            <Link to={`/usuario/${other?.id}`}>{est && perspective === 'buyer' ? est.name : other?.name}</Link>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <Timeline order={order} />

      <div className="order-items">
        {order.items.map((it) => (
          <div key={it.listingId} className="order-item">
            {it.image && <img src={it.image} alt="" className="list-thumb sm" />}
            <div className="list-main">
              <Link to={`/anuncio/${it.listingId}`}>{it.title}</Link>
              <span className="muted small">{it.qty} × {formatPrice(it.price)}</span>
            </div>
            {perspective === 'buyer' && canReview(order, it.listingId, user.id, db.reviews) && (
              <button className="btn btn-sm btn-accent" onClick={() => setReviewing(it)}><Star size={14} /> Avaliar</button>
            )}
            {perspective === 'buyer' && order.status === 'entregue' && !canReview(order, it.listingId, user.id, db.reviews) && (
              <span className="muted small"><Check size={14} /> Avaliado</span>
            )}
          </div>
        ))}
      </div>
      {order.note && <div className="note"><strong>Observação:</strong> {order.note}</div>}

      <div className="order-foot">
        <span>Total: <strong>{formatPrice(order.total)}</strong></span>
        <div className="row gap-sm wrap">
          <button className="btn btn-sm btn-ghost" onClick={chat}><MessageCircle size={16} /> Conversar</button>
          {canTransitionOrder(order, 'cancelado', user.id) && (
            <button className="btn btn-sm btn-outline-danger" onClick={() => confirm('Cancelar este pedido?') && run(() => updateOrderStatus(order.id, 'cancelado'), 'Pedido cancelado.')}>Cancelar</button>
          )}
          {perspective === 'seller' && nextStatus && (
            <button className="btn btn-sm btn-primary" onClick={() => run(() => updateOrderStatus(order.id, nextStatus), 'Status atualizado. O comprador foi notificado.')}>{nextLabel}</button>
          )}
        </div>
      </div>
      {reviewing && <ReviewModal order={order} item={reviewing} onClose={() => setReviewing(null)} />}
    </div>
  );
}

function OrdersPage({ perspective }) {
  const db = useDb();
  const user = useCurrentUser();
  const location = useLocation();
  const [filter, setFilter] = useState('abertos');
  const all = db.orders.filter((o) => (perspective === 'buyer' ? o.buyerId : o.sellerId) === user.id);
  const isOpen = (o) => !['entregue', 'cancelado'].includes(o.status);
  const list = all.filter((o) => (filter === 'abertos' ? isOpen(o) : filter === 'finalizados' ? !isOpen(o) : true));
  const created = location.state?.created;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{perspective === 'buyer' ? 'Minhas compras' : 'Minhas vendas'}</h1>
          <p className="muted">{perspective === 'buyer' ? 'Acompanhe o status dos seus pedidos.' : 'Confirme os pedidos e atualize o status para os compradores.'}</p>
        </div>
      </div>
      {created && <div className="alert alert-success">Pedido(s) #{created.join(', #')} realizado(s)! O vendedor foi notificado.</div>}
      <div className="tabs">
        {[['abertos', 'Em andamento'], ['finalizados', 'Finalizados'], ['todos', 'Todos']].map(([k, v]) => (
          <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
            {v} ({all.filter((o) => (k === 'abertos' ? isOpen(o) : k === 'finalizados' ? !isOpen(o) : true)).length})
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="stack">{list.map((o) => <OrderCard key={o.id} order={o} perspective={perspective} />)}</div>
      ) : (
        <EmptyState icon={perspective === 'buyer' ? Package : Receipt} title="Nenhum pedido aqui" text={perspective === 'buyer' ? 'Seus pedidos aparecerão aqui.' : 'Quando alguém comprar seus produtos, o pedido aparecerá aqui.'} />
      )}
    </div>
  );
}

export const Purchases = () => <OrdersPage perspective="buyer" />;
export const Sales = () => <OrdersPage perspective="seller" />;
