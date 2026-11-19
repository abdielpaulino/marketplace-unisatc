import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { RequireAuth } from './components/ui';
import Home from './pages/Home';
import { Login, Register, ForgotPassword } from './pages/Auth';
import ListingDetail from './pages/ListingDetail';
import ListingForm from './pages/ListingForm';
import MyListings from './pages/MyListings';
import Favorites from './pages/Favorites';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import { Purchases, Sales } from './pages/Orders';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import { MyEstablishments, EstablishmentPage, EstablishmentsList } from './pages/Establishments';
import { UserProfile, Profile } from './pages/Profile';
import Admin from './pages/Admin';
import Rules from './pages/Rules';
import NotFound from './pages/NotFound';

const auth = (el, admin = false) => <RequireAuth admin={admin}>{el}</RequireAuth>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="cadastro" element={<Register />} />
        <Route path="recuperar-senha" element={<ForgotPassword />} />
        <Route path="regras" element={<Rules />} />
        <Route path="anuncio/:id" element={<ListingDetail />} />
        <Route path="anuncio/:id/editar" element={auth(<ListingForm />)} />
        <Route path="anunciar" element={auth(<ListingForm />)} />
        <Route path="meus-anuncios" element={auth(<MyListings />)} />
        <Route path="favoritos" element={auth(<Favorites />)} />
        <Route path="carrinho" element={auth(<Cart />)} />
        <Route path="checkout" element={auth(<Checkout />)} />
        <Route path="pedidos" element={auth(<Purchases />)} />
        <Route path="vendas" element={auth(<Sales />)} />
        <Route path="chat" element={auth(<Chat />)} />
        <Route path="chat/:id" element={auth(<Chat />)} />
        <Route path="notificacoes" element={auth(<Notifications />)} />
        <Route path="estabelecimento" element={auth(<MyEstablishments />)} />
        <Route path="estabelecimentos" element={<EstablishmentsList />} />
        <Route path="estabelecimentos/:id" element={<EstablishmentPage />} />
        <Route path="usuario/:id" element={<UserProfile />} />
        <Route path="perfil" element={auth(<Profile />)} />
        <Route path="admin" element={auth(<Admin />, true)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
