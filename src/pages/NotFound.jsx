import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <EmptyState icon={SearchX} title="Página não encontrada" text="O conteúdo que você procura não existe ou foi removido." action={<Link to="/" className="btn btn-primary">Voltar ao início</Link>} />
  );
}
