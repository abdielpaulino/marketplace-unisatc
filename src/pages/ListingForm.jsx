import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useCurrentUser, useDb } from '../core/hooks';
import { CATEGORIES, KINDS, isTradeKind } from '../core/rules';
import { createListing, updateListing } from '../core/services';
import { useToast } from '../context/Toast';
import { BackLink, Field, ImagesInput } from '../components/ui';
import NotFound from './NotFound';

const KIND_HELP = {
  venda: 'Venda de produtos ou serviços para a comunidade.',
  doacao: 'Doe algo que você não usa mais. O item aparece como “Grátis”.',
  perdido: 'Perdeu algo no campus? Descreva para que alguém encontre.',
  encontrado: 'Encontrou algo? Publique para o dono entrar em contato.',
};

export default function ListingForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const db = useDb();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const toast = useToast();
  const existing = id ? db.listings.find((l) => l.id === id) : null;
  const myEstablishments = db.establishments.filter((e) => e.ownerId === user.id && e.status === 'aprovado');

  const [form, setForm] = useState(() =>
    existing
      ? { ...existing, price: existing.kind === 'venda' ? String(existing.price) : '', stock: String(existing.stock), establishmentId: existing.establishmentId || '' }
      : {
          kind: params.get('tipo') || 'venda', title: '', description: '', category: params.get('est') ? 'Alimentação' : '',
          price: '', stock: '1', condition: 'novo', location: '', images: [], establishmentId: params.get('est') || '', available: true,
        },
  );
  const [errors, setErrors] = useState({});
  const [agree, setAgree] = useState(Boolean(existing));

  if (id && (!existing || existing.sellerId !== user.id)) return <NotFound />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const trade = isTradeKind(form.kind);

  const submit = (e) => {
    e.preventDefault();
    if (!agree) return setErrors({ agree: 'Confirme que o anúncio segue as normas da instituição.' });
    try {
      const data = { ...form, stock: Number(form.stock), establishmentId: trade ? form.establishmentId || null : null };
      if (existing) {
        updateListing(existing.id, data);
        toast('Anúncio atualizado!');
        navigate(`/anuncio/${existing.id}`);
      } else {
        const created = createListing(data);
        toast('Anúncio publicado!');
        navigate(`/anuncio/${created.id}`);
      }
    } catch (err) {
      setErrors(err.errors || { general: err.message });
      if (!err.errors) toast(err.message, 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="narrow">
      <BackLink to={existing ? `/anuncio/${existing.id}` : '/meus-anuncios'}>Voltar</BackLink>
      <h1>{existing ? 'Editar anúncio' : 'Novo anúncio'}</h1>

      <form className="card pad form" onSubmit={submit}>
        {(errors.content || errors.general) && (
          <div className="alert alert-error"><ShieldAlert size={18} /> {errors.content || errors.general}</div>
        )}

        <div>
          <span className="label">O que você quer publicar?</span>
          <div className="kind-picker">
            {Object.entries(KINDS).map(([k, v]) => (
              <button type="button" key={k} disabled={Boolean(existing)} className={form.kind === k ? 'active' : ''} onClick={() => setForm({ ...form, kind: k })}>
                <strong>{v.label}</strong>
                <small>{KIND_HELP[k]}</small>
              </button>
            ))}
          </div>
        </div>

        {trade && myEstablishments.length > 0 && (
          <Field label="Anunciar como" hint="Produtos de restaurantes/lojas aparecem no cardápio/catálogo do estabelecimento.">
            <select value={form.establishmentId} onChange={set('establishmentId')}>
              <option value="">{user.name} ({user.role === 'professor' ? 'professor' : 'aluno'})</option>
              {myEstablishments.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
            </select>
          </Field>
        )}

        <Field label={trade ? 'Nome do produto ou serviço *' : 'O que foi ' + (form.kind === 'perdido' ? 'perdido' : 'encontrado') + '? *'} error={errors.title}>
          <input value={form.title} onChange={set('title')} maxLength={80} placeholder={trade ? 'Ex.: Livro de Cálculo Vol. 1' : 'Ex.: Garrafa térmica azul'} />
        </Field>

        <Field label="Descrição *" error={errors.description} hint="Detalhe estado, tamanho, cor, como retirar etc.">
          <textarea rows={5} value={form.description} onChange={set('description')} maxLength={1500} />
        </Field>

        <div className="form-row">
          <Field label="Categoria *" error={errors.category}>
            <select value={form.category} onChange={set('category')}>
              <option value="">Selecione…</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          {form.kind === 'venda' && (
            <Field label="Preço (R$) *" error={errors.price}>
              <input type="number" min="0.01" step="0.01" value={form.price} onChange={set('price')} placeholder="0,00" />
            </Field>
          )}
          {form.kind === 'doacao' && (
            <Field label="Preço"><input value="Grátis" disabled /></Field>
          )}
        </div>

        {trade && (
          <div className="form-row">
            <Field label="Quantidade em estoque *" error={errors.stock}>
              <input type="number" min="0" step="1" value={form.stock} onChange={set('stock')} />
            </Field>
            <Field label="Condição">
              <select value={form.condition} onChange={set('condition')}>
                <option value="novo">Novo</option>
                <option value="usado">Usado</option>
              </select>
            </Field>
          </div>
        )}

        <Field label={trade ? 'Local de retirada' : form.kind === 'perdido' ? 'Onde você acha que perdeu?' : 'Onde foi encontrado?'}>
          <input value={form.location} onChange={set('location')} placeholder="Ex.: Bloco B, sala 204" />
        </Field>

        <div>
          <span className="label">Fotos (até 5)</span>
          <ImagesInput value={form.images} onChange={(images) => setForm({ ...form, images })} />
        </div>

        {existing && trade && (
          <label className="check">
            <input type="checkbox" checked={form.available} onChange={set('available')} /> Disponível para pedidos
          </label>
        )}

        <label className={`check ${errors.agree ? 'has-error' : ''}`}>
          <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErrors({ ...errors, agree: undefined }); }} />
          <span>Declaro que este anúncio não envolve produtos ou serviços ilícitos e está de acordo com as <Link to="/regras" target="_blank">normas da instituição</Link>, e que manterei as informações, preços e disponibilidade atualizados.</span>
        </label>
        {errors.agree && <span className="error-text">{errors.agree}</span>}

        <div className="row end gap-sm">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancelar</button>
          <button className="btn btn-primary">{existing ? 'Salvar alterações' : 'Publicar anúncio'}</button>
        </div>
      </form>
    </div>
  );
}
