import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell, MessageCircle, ShoppingCart, Search, Plus, ChevronDown, LogOut, User, Package,
  Store, ShieldCheck, Receipt, Heart, LayoutGrid, Menu,
} from 'lucide-react';
import { cartLines, unreadMessagesCount, useCurrentUser, useDb } from '../core/hooks';
import { logout } from '../core/services';
import { Avatar } from './ui';
import { resetDb } from '../core/db';
import { useToast } from '../context/Toast';

function SearchBox() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState(params.get('q') || '');
  useEffect(() => {
    if (location.pathname === '/') setQ(params.get('q') || '');
  }, [params, location.pathname]);
  const submit = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(location.pathname === '/' ? params : undefined);
    if (q.trim()) next.set('q', q.trim());
    else next.delete('q');
    navigate(`/?${next.toString()}`);
  };
  return (
    <form className="search" onSubmit={submit} role="search">
      <Search size={18} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produtos, serviços, achados…" aria-label="Buscar" />
    </form>
  );
}

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  const items = [
    { to: '/meus-anuncios', icon: LayoutGrid, label: 'Meus anúncios' },
    { to: '/pedidos', icon: Package, label: 'Minhas compras' },
    { to: '/vendas', icon: Receipt, label: 'Minhas vendas' },
    { to: '/favoritos', icon: Heart, label: 'Favoritos' },
    { to: '/estabelecimento', icon: Store, label: 'Meu estabelecimento' },
    { to: '/perfil', icon: User, label: 'Meu perfil' },
  ];
  return (
    <div className="user-menu" ref={ref}>
      <button className="user-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Avatar name={user.name} size={32} />
        <span className="hide-sm">{user.name.split(' ')[0]}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="dropdown">
          <div className="dropdown-head">
            <strong>{user.name}</strong>
            <span className="muted small">{user.email}</span>
          </div>
          {user.role === 'admin' && (
            <Link to="/admin" className="dropdown-item admin-item"><ShieldCheck size={18} /> Painel administrativo</Link>
          )}
          {items.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className="dropdown-item"><Icon size={18} /> {label}</Link>
          ))}
          <button className="dropdown-item danger" onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

function TabLink({ tipo, children }) {
  const location = useLocation();
  const current = new URLSearchParams(location.search).get('tipo');
  const active = location.pathname === '/' && (current || null) === tipo;
  return <Link to={tipo ? `/?tipo=${tipo}` : '/'} className={active ? 'active' : ''}>{children}</Link>;
}

function Header() {
  const db = useDb();
  const user = useCurrentUser();
  const cartCount = user ? cartLines(db, user.id).reduce((s, l) => s + l.qty, 0) : 0;
  const unreadNotifs = user ? db.notifications.filter((n) => n.userId === user.id && !n.read).length : 0;
  const unreadMsgs = unreadMessagesCount(db, user?.id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const Count = ({ n }) => (n > 0 ? <span className="count">{n > 99 ? '99+' : n}</span> : null);

  return (
    <header className="header">
      <div className="container header-row">
        <Link to="/" className="brand" aria-label="Página inicial">
          <span className="brand-logo">U</span>
          <span className="brand-text"><strong>UniSatc</strong><small>Marketplace</small></span>
        </Link>
        <SearchBox />
        <nav className="header-actions">
          {user ? (
            <>
              <Link to="/anunciar" className="btn btn-accent hide-sm"><Plus size={18} /> Anunciar</Link>
              <NavLink to="/chat" className="icon-link" aria-label="Mensagens" title="Mensagens">
                <MessageCircle size={22} /><Count n={unreadMsgs} />
              </NavLink>
              <NavLink to="/notificacoes" className="icon-link" aria-label="Notificações" title="Notificações">
                <Bell size={22} /><Count n={unreadNotifs} />
              </NavLink>
              <NavLink to="/carrinho" className="icon-link" aria-label="Carrinho" title="Carrinho">
                <ShoppingCart size={22} /><Count n={cartCount} />
              </NavLink>
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost-light">Entrar</Link>
              <Link to="/cadastro" className="btn btn-accent hide-sm">Criar conta</Link>
              <button className="icon-link show-sm" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu"><Menu size={22} /></button>
            </>
          )}
        </nav>
      </div>
      <div className="subnav">
        <div className="container subnav-row">
          <TabLink tipo={null}>Início</TabLink>
          <TabLink tipo="venda">À venda</TabLink>
          <TabLink tipo="doacao">Doações</TabLink>
          <TabLink tipo="achados">Achados e perdidos</TabLink>
          <NavLink to="/estabelecimentos">Restaurantes e lojas</NavLink>
          {user && <NavLink to="/anunciar" className="show-sm">+ Anunciar</NavLink>}
          {!user && mobileOpen && <NavLink to="/cadastro">Criar conta</NavLink>}
        </div>
      </div>
    </header>
  );
}

export default function Layout() {
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const restore = async () => {
    if (!confirm('Restaurar os dados de demonstração? Tudo que foi criado neste navegador será apagado.')) return;
    await resetDb();
    toast('Dados de demonstração restaurados.', 'info');
    navigate('/');
  };

  return (
    <div className="app">
      <Header />
      <main className="container main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-row">
          <div>
            <strong>UniSatc Marketplace</strong>
            <p className="muted small">Compra, venda, doações e achados e perdidos da comunidade acadêmica.</p>
          </div>
          <div className="footer-links">
            <Link to="/regras">Regras e normas</Link>
            <button className="link-btn" onClick={restore}>Restaurar dados de demonstração</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
