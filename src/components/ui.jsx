import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Star, X, ImagePlus, Trash2 } from 'lucide-react';
import { useCurrentUser } from '../core/hooks';
import { ORDER_STATUS, SELLER_TYPES } from '../core/rules';

export function RequireAuth({ children, admin = false }) {
  const user = useCurrentUser();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export function Stars({ value = 0, size = 16, count }) {
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'star-on' : 'star-off'} fill="currentColor" />
      ))}
      {count !== undefined && <span className="muted small">{count ? `${value.toFixed(1)} (${count})` : 'Sem avaliações'}</span>}
    </span>
  );
}

export function StarInput({ value, onChange, label }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-input">
      <span className="label">{label}</span>
      <div onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button type="button" key={i} onMouseEnter={() => setHover(i)} onClick={() => onChange(i)} aria-label={`${i} estrela(s)`}>
            <Star size={26} className={i <= (hover || value) ? 'star-on' : 'star-off'} fill="currentColor" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty">
      {Icon && <Icon size={44} strokeWidth={1.5} />}
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

export const StatusBadge = ({ status }) => (
  <span className={`badge badge-${ORDER_STATUS[status]?.tone || 'neutral'}`}>{ORDER_STATUS[status]?.label || status}</span>
);

export const SellerTypeBadge = ({ type }) => <span className={`tag tag-${type}`}>{SELLER_TYPES[type] || type}</span>;

export function Avatar({ name = '?', src, size = 40 }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  if (src) return <img className="avatar" src={src} alt="" style={{ width: size, height: size }} />;
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>;
}

export function Field({ label, error, hint, children }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="label">{label}</span>
      {children}
      {error ? <span className="error-text">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

/** Resizes images in the browser so they fit in local storage. */
async function fileToDataUrl(file, max = 900, quality = 0.75) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ImagesInput({ value = [], onChange, max = 5 }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const onFiles = async (files) => {
    setBusy(true);
    try {
      const imgs = files.filter((f) => f.type.startsWith('image/')).slice(0, max - value.length);
      const urls = await Promise.all(imgs.map((f) => fileToDataUrl(f)));
      onChange([...value, ...urls]);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };
  return (
    <div className="images-input">
      {value.map((src, i) => (
        <div key={i} className="thumb">
          <img src={src} alt={`Imagem ${i + 1}`} />
          {i === 0 && <span className="thumb-main">Capa</span>}
          <button type="button" className="thumb-remove" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remover imagem">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {value.length < max && (
        <button type="button" className="thumb thumb-add" onClick={() => ref.current?.click()} disabled={busy}>
          <ImagePlus size={24} />
          <span>{busy ? 'Processando…' : 'Adicionar foto'}</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles([...e.target.files])} />
    </div>
  );
}

export const BackLink = ({ to, children }) => (
  <Link to={to} className="back-link">← {children}</Link>
);
