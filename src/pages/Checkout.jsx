import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { formatPrice } from '../core/rules';
import { placeOrder } from '../core/services';
import { useAction } from '../context/Toast';
import { BackLink, Field } from '../components/ui';
import { useCartGroups } from './Cart';

const PAYMENT = { pix: 'Pix na retirada', dinheiro: 'Dinheiro na retirada', cartao: 'Cartão na retirada' };

export default function Checkout() {
  const run = useAction();
  const navigate = useNavigate();
  const { lines, groups, total, hasBlockers } = useCartGroups();
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  // Snapshot of the total the buyer is reviewing: if prices change meanwhile, the order is refused (RN07).
  const [reviewedTotal] = useState(total);

  if (!lines.length) return <Navigate to="/carrinho" replace />;

  const submit = async () => {
    const orders = await run(() => placeOrder({ confirmed, note, paymentMethod, expectedTotal: reviewedTotal }));
    if (orders) navigate('/pedidos', { state: { created: orders.map((o) => o.number) } });
  };

  return (
    <div>
      <BackLink to="/carrinho">Voltar ao carrinho</BackLink>
      <h1>Revisar e confirmar pedido</h1>
      <div className="two-col">
        <div className="stack">
          {groups.map((g) => (
            <div key={g.seller.link} className="card pad">
              <h3>{g.seller.name}</h3>
              <table className="table">
                <thead><tr><th>Produto</th><th>Qtd.</th><th>Preço unit.</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {g.lines.map(({ listing, qty, blocker }) => (
                    <tr key={listing.id}>
                      <td>
                        {listing.title}
                        {listing.location && <div className="muted small">Retirada: {listing.location}</div>}
                        {blocker && <div className="text-danger small">{blocker}</div>}
                      </td>
                      <td>{qty}</td>
                      <td>{formatPrice(listing.price)}</td>
                      <td>{formatPrice(listing.price * qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="card pad form">
            <Field label="Forma de pagamento" hint="O pagamento é combinado diretamente com o vendedor na retirada.">
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {Object.entries(PAYMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Observações para o vendedor (opcional)">
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: retiro após as 19h, sem cebola…" />
            </Field>
          </div>
        </div>

        <aside className="card pad summary">
          <h3>Total</h3>
          <div className="row between total"><span>{groups.length} pedido(s)</span><strong>{formatPrice(total)}</strong></div>
          {total !== reviewedTotal && <div className="alert alert-warning small">Os valores mudaram desde que você abriu esta página. Volte ao carrinho e revise.</div>}
          <label className="check confirm-box">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>Conferi os produtos, quantidades e valores e quero confirmar o pedido.</span>
          </label>
          <button className="btn btn-primary btn-block btn-lg" disabled={!confirmed || hasBlockers} onClick={submit}>
            <ShieldCheck size={18} /> Confirmar pedido
          </button>
        </aside>
      </div>
    </div>
  );
}
