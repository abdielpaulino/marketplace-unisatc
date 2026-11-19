# UniSatc Marketplace

Marketplace web da comunidade acadêmica UniSatc, para **comprar, vender e doar** itens entre alunos e professores, fazer **pedidos em restaurantes e lojas do campus** e usar os **achados e perdidos**.

Feito **somente com React** (Vite + React Router), sem backend: os dados ficam no `localStorage` do navegador e passam por uma camada de serviços (`src/core/services.js`) que funciona como uma API. Assim, dá para trocar por um backend real depois sem mexer nas telas.

## Como rodar

Pré-requisito: Node.js 20 ou mais recente.

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm test           # testes das regras de negócio (Vitest)
npm run build      # gera a versão de produção em dist/
```

### Contas de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Aluna (compra e vende) | ana.souza@alunosatc.edu.br | 123456 |
| Aluno dono da Cantina | bruno.lima@alunosatc.edu.br | 123456 |
| Aluno dono da Papelaria | diego.rocha@alunosatc.edu.br | 123456 |
| Professora | carla.mendes@satc.edu.br | 123456 |
| Administrador | admin@satc.edu.br | admin123 |

Na tela de login, é só clicar numa conta para preencher os campos. O link **"Restaurar dados de demonstração"**, no rodapé, volta tudo ao estado inicial.

> Dica: abra duas abas (ou uma janela anônima) com usuários diferentes para testar o chat e as notificações. As abas se atualizam sozinhas.

### Domínios de e-mail aceitos

Por padrão: `@satc.edu.br` e `@alunosatc.edu.br`. Para mudar, copie `.env.example` para `.env` e edite `VITE_ALLOWED_EMAIL_DOMAINS`.

## Estrutura

```
src/
  core/
    rules.js       regras de negócio puras (validações, filtros, status de pedidos)
    services.js    "API": cadastro, login, anúncios, carrinho, pedidos, chat, admin…
    db.js          armazenamento local + sincronização entre abas
    seed.js        dados de demonstração
    hooks.js       hooks React e consultas (avaliações, carrinho, etc.)
    crypto.js      hash de senha (SHA-256) e geração de IDs
  components/      Layout (cabeçalho/rodapé), cards, modais, componentes de UI
  pages/           uma página por tela
tests/             testes das regras de negócio
```

## Requisitos atendidos

### Regras de negócio

| Código | Onde |
|---|---|
| RN01: só e-mail institucional | `isInstitutionalEmail` (rules.js) + `register` |
| RN02: e-mail único | `register` (services.js) |
| RN03: login para anunciar/comprar | `currentUser()` nos serviços + rotas protegidas (`RequireAuth`) |
| RN04: nome, descrição, preço e categoria | `validateListing` |
| RN05: vendedor mantém os dados atualizados | Meus anúncios: editar, estoque +/−, pausar/disponível |
| RN06: sem pedido de item indisponível/sem estoque | `getOrderBlocker` no carrinho, no checkout e em `placeOrder` |
| RN07: conferir antes de confirmar | Tela de revisão com caixa de confirmação obrigatória; o pedido é recusado se algum preço mudou durante a revisão |
| RN08: só quem comprou avalia | `canReview`: o pedido precisa estar entregue, e cada item pode ser avaliado uma vez |
| RN09: proibido conteúdo ilícito | Lista de termos proibidos (`PROHIBITED_TERMS`), declaração obrigatória e denúncias |
| RN10: admin bloqueia, remove e gerencia denúncias | Painel `/admin` |

### Requisitos funcionais

| Código | Funcionalidade |
|---|---|
| RF01 | Cadastro de aluno/professor (`/cadastro`) |
| RF02 | Login e logout |
| RF03 | Recuperação de senha com código de 6 dígitos (o código aparece na tela porque não há servidor de e-mail) |
| RF04 | Vitrine de produtos e serviços (`/`) |
| RF05 / RF07 | Cadastro de restaurante ou loja em "Meu estabelecimento", com aprovação do admin |
| RF06 | Cardápio: adicionar, editar e remover produtos do estabelecimento |
| RF08 | Alunos anunciam produtos para venda (e também doações e achados e perdidos) |
| RF09 | Até 5 imagens por anúncio (redimensionadas no navegador), descrição e preço |
| RF10 | Busca por nome ou palavra-chave, sem diferenciar acentos |
| RF11 | Filtros por categoria, faixa de preço, tipo de vendedor (aluno, professor, restaurante, loja) e disponibilidade |
| RF12 | Página de detalhes do anúncio |
| RF13 | Carrinho, agrupado por vendedor |
| RF14 | Checkout: um pedido por vendedor e baixa de estoque |
| RF15 | Acompanhamento do pedido (Aguardando → Confirmado → Pronto para retirada → Entregue) |
| RF16 | Atualização de estoque e disponibilidade |
| RF17 | Chat interno entre comprador e vendedor |
| RF18 | Avaliação do produto e do vendedor (1 a 5 estrelas e comentário) |
| RF19 | Notificações de pedidos, mensagens, avaliações e ofertas (queda de preço ou volta ao estoque de um favorito) |
| RF20 | Painel admin: usuários, estabelecimentos, anúncios e denúncias |

### Requisitos não funcionais

- **RNF01 (usabilidade):** interface simples e responsiva (celular e desktop), com mensagens claras em português.
- **RNF02 (segurança):** senhas guardadas só como hash, controle de acesso em cada serviço (dono do anúncio, participante do chat, admin) e e-mail não exibido publicamente.
- **RNF03 (HTTPS):** publique em Vercel, Netlify ou GitHub Pages, que já servem por HTTPS. `vercel.json` e `public/_redirects` já estão configurados para o roteamento.
- **RNF04 (desempenho):** as operações são locais e instantâneas, e o build gera cerca de 120 KB gzip.
- **RNF05 (compatibilidade):** só usa APIs padrão, compatíveis com Chrome, Firefox e Edge.
- **RNF06 / RNF07 (disponibilidade e escalabilidade):** com hospedagem estática, a disponibilidade fica com o provedor. Para escalar, basta trocar a implementação de `services.js` por chamadas a uma API real (Node, Supabase, Firebase etc.), sem mudar as telas.

## Limitações (por ser só frontend)

- Os dados ficam no navegador de cada pessoa: dois computadores diferentes não compartilham anúncios.
- A recuperação de senha mostra o código na tela, em vez de mandar um e-mail.
- Não há pagamento online: o pagamento é combinado na retirada.
