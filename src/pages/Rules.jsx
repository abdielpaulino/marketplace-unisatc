import { ALLOWED_EMAIL_DOMAINS } from '../core/rules';

const RULES = [
  ['RN01', `Somente alunos e professores com e-mail institucional da SATC (${ALLOWED_EMAIL_DOMAINS.map((d) => '@' + d).join(', ')}) podem se cadastrar.`],
  ['RN02', 'Cada usuário possui um cadastro único: o mesmo e-mail não pode ser usado em mais de uma conta.'],
  ['RN03', 'Somente usuários cadastrados e autenticados podem anunciar e comprar produtos.'],
  ['RN04', 'Todo produto anunciado deve ter nome, descrição, preço e categoria.'],
  ['RN05', 'Os vendedores são responsáveis por manter atualizadas as informações, preços e disponibilidade dos produtos.'],
  ['RN06', 'Não é permitido realizar pedidos de produtos indisponíveis ou sem estoque.'],
  ['RN07', 'Os compradores devem verificar as informações e os valores antes de confirmar um pedido.'],
  ['RN08', 'Somente compradores que realizaram uma compra podem avaliar o produto e o vendedor.'],
  ['RN09', 'É proibido anunciar produtos ou serviços ilícitos, proibidos ou em desacordo com as normas da instituição (armas, drogas, bebidas alcoólicas, cigarros eletrônicos, provas/gabaritos, trabalhos prontos, produtos falsificados ou piratas etc.).'],
  ['RN10', 'Os administradores podem bloquear usuários, remover anúncios irregulares e gerenciar denúncias.'],
];

export default function Rules() {
  return (
    <div className="narrow">
      <h1>Regras e normas da plataforma</h1>
      <p className="muted">Ao usar o UniSatc Marketplace você concorda com as regras abaixo. Anúncios irregulares podem ser removidos e contas podem ser bloqueadas.</p>
      <div className="card rules">
        {RULES.map(([code, text]) => (
          <div key={code} className="rule"><span className="rule-code">{code}</span><p>{text}</p></div>
        ))}
      </div>
      <div className="card pad section">
        <h3>Privacidade</h3>
        <p className="muted">Seus dados pessoais são usados apenas para identificar você na plataforma. Senhas são armazenadas de forma criptografada (hash) e o e-mail não é exibido publicamente.</p>
      </div>
    </div>
  );
}
