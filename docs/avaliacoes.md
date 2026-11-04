# Avaliações de hóspedes

A seção de apresentação “Mais tempo para viver bons momentos” foi substituída
pelas avaliações na home. Layout com três colunas em desktop, duas em tablet e
uma em celular. A seção fica oculta sem cadastros; não há depoimentos de exemplo
em produção. A média inclui notas zero e considera todos os cadastros, não apenas
a página atual. As seis avaliações mais recentes aparecem na home. Quando houver
mais, **Visualizar todas as avaliações** abre um modal amplo, com comentários
completos e **Carregar mais avaliações** até chegar ao último cadastro. O título
e o fechamento permanecem disponíveis enquanto o conteúdo interno rola. Ao fechar,
o foco retorna ao botão que abriu o modal.

## Administração

Em **Configurações → Avaliações de hóspedes**, use **Cadastrar avaliação**:

- Nome do cliente: obrigatório, até 100 caracteres.
- Foto: obrigatória ao cadastrar; JPG/PNG até 15 MB, processada com orientação
  EXIF e proporções preservadas. Ao editar, mantenha o campo vazio para conservar
  a foto anterior ou selecione outra para substituí-la.
- Nota inteira entre 0 e 5, inclusive zero.
- Hospedagem: nome em texto, obrigatório, até 160 caracteres. O depoimento
  mantém o contexto mesmo se o anúncio for renomeado ou removido.
- Comentário: obrigatório, até 3000 caracteres; quebras de linha preservadas.
- Contato do cliente: opcional, até 160 caracteres; aparece em texto pequeno.
  `@usuario` vira link para `https://www.instagram.com/usuario/`. Outros textos
  permanecem texto simples, sem interpretar HTML ou links arbitrários.

Fotos e contatos devem ser cadastrados com autorização do cliente. Não há selo
de “verificado” nem validação automática da veracidade. Visitantes podem ler e
consultar o contato informado; somente o administrador pode gravar ou excluir.
A exclusão exige confirmação. O formulário conserva os dados em caso de falha.

## Persistência e API

A migração Flyway `V6__avaliacoes.sql` adiciona somente a tabela `avaliacao` e seu
índice. Não altera imóveis, configurações, mídias existentes ou migrações antigas.
As fotos usam novas chaves em `reviews/` no armazenamento já configurado. Trocas
e exclusões utilizam a fila transacional de remoção. Fotos novas são removidas se
a transação de gravação falhar; falhas de limpeza são registradas no log.

- `GET /api/public/reviews?page=0&size=6`: lista paginada, média e quantidade.
- `GET /api/public/reviews/{id}/photo`: foto do cliente.
- `GET /api/admin/reviews`: lista para administração.
- `POST /api/admin/reviews`: criação multipart com parte JSON `review` e `file`.
- `PUT /api/admin/reviews/{id}`: edição multipart; `file` opcional.
- `DELETE /api/admin/reviews/{id}`: exclusão.

As mutações exigem sessão de administrador e CSRF. O tamanho da página é limitado
a 50. A imagem é validada pelo conteúdo e otimizada no backend, não apenas pelo
nome ou MIME informado pelo navegador.

## Validações

Validação local: build TypeScript/Vite, 8 testes unitários do frontend, 41 testes
Java (incluindo 14 de integração) e cenários Playwright para avaliações e imagens
em desktop, celular vertical e horizontal. PostgreSQL/MinIO usados nos testes são
instâncias locais isoladas, sem credenciais ou conexão com produção.

```bash
cd frontend
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:images
```

A suíte `test:images` inclui as avaliações com APIs simuladas. O teste completo
`mvn test` em `backend/` exige Java 21 e PostgreSQL/MinIO exclusivos de testes com
as variáveis habituais do projeto. Nunca aponte esses testes para produção.

## Implantação futura

O desenvolvimento foi integrado na `main`, incluindo o histórico da feature de
hospedagens e as correções de imagens/logo. Nenhum deploy foi executado.

Na instalação existente, preserve `.env`, projeto Compose e volumes. Faça backup
do banco e das mídias. Verifique se o checkout está limpo, baixe `origin/main` e
mude para `main` sem descartar alterações locais; se já houver uma `main` local,
use `git switch main` seguido de `git pull --ff-only origin main`. Se ainda não
houver, use `git switch --track -c main origin/main`. Confira os commits antes
de prosseguir. Não continue se houver divergência ou alterações locais.

Depois, na mesma pasta e com os mesmos arquivos Compose da instalação atual:

```bash
docker compose build api web
docker compose up -d --no-deps --wait api web
docker compose ps
docker compose logs --tail=80 api web
```

O primeiro início da API aplica V6 automaticamente. Essa versão precisa da API
e do frontend atualizados juntos. Não execute `down -v`, remova volumes ou altere
credenciais. A atualização ainda não foi executada na VPS.
