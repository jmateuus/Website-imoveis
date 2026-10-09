# Privê Lopes | Hospedagens

Vitrine em português de hospedagens por temporada no Nordeste, responsiva, com contato direto pelo WhatsApp e painel administrativo. React/TypeScript no frontend; API REST em Java 21, Spring Boot 3.5.16 e PostgreSQL. Fotos e vídeos ficam em armazenamento S3 privado. Não há reservas, pagamentos, chatbot ou login de visitantes.

## Executar com Docker

Requisitos: Docker Engine, Docker Compose v2 e Python 3 para gerar a configuração local.

```bash
cd Website-imoveis
python3 scripts/init-local-env.py
docker compose up --build -d postgres minio api web
```

O frontend usa a porta **8088**, a API **8080** e o MinIO **9000** (console **9001**). Essas portas estão vinculadas ao loopback para desenvolvimento. O PostgreSQL usa **5432 somente na rede interna do Docker**; o site completo não reserva essa porta no computador, evitando conflitos com instalações locais do banco e restrições do Windows. Acesse o caminho `/admin` no frontend; o e-mail e a senha inicial ficam no `.env` local, com permissão `600`. Esse arquivo é ignorado pelo Git e nunca deve ser publicado. As credenciais são geradas aleatoriamente; não existe senha padrão no código.

O frontend aguarda a API ficar saudável antes de iniciar. O Nginx consulta o DNS do Docker novamente quando o endereço da API muda, inclusive após recriar o contêiner. Para atualizar uma instalação existente, execute `git pull --ff-only` e `docker compose up --build -d --wait`; isso preserva o `.env` e os volumes. Use `docker compose ps` para conferir a API como `healthy`. Se houver falha, consulte `docker compose logs --tail=80 api web`.

No navegador do seu computador, use os endereços abaixo. O painel do site e o console de armazenamento têm credenciais diferentes:

| Página | Endereço local | Login |
| --- | --- | --- |
| Catálogo de hospedagens | `http://localhost:8088` | Não exige login |
| Painel do proprietário | `http://localhost:8088/admin` | `ADMIN_EMAIL` e `ADMIN_PASSWORD` do `.env` |
| Console MinIO (armazenamento) | `http://localhost:9001` | `S3_ACCESS_KEY` e `S3_SECRET_KEY` do `.env` |

Não é necessário entrar no MinIO para cadastrar hospedagens ou enviar fotos: use o painel do proprietário. A API cria automaticamente o bucket local de armazenamento.

O administrador só é criado se a tabela estiver vazia. Alterar `ADMIN_PASSWORD` posteriormente não altera a senha persistida. A recuperação da conta existente deve ser feita por uma operação administrativa controlada no banco, usando um novo hash BCrypt; não há recuperação pública de senha.

Para ver exemplos, use `python3 scripts/init-local-env.py --demo` antes da primeira inicialização. Se o `.env` já existir, ele será preservado; configure `DEMO_DATA=true` nele. A carga de seis hospedagens demonstrativas só acontece em um banco sem hospedagens. As imagens são ilustrativas, geradas para o projeto, e os anúncios deixam explícito que não são ofertas reais. A migração de identidade configura o número oficial `5581995809198` quando o contato ainda está vazio. Contatos personalizados já cadastrados são preservados e podem ser ajustados no painel.

## Desenvolvimento no ambiente de nuvem

O checkout existente já é isolado por tarefa; não crie um Git worktree.

```bash
bash scripts/cloud-setup.sh
python3 scripts/cloud-dev.py start
python3 scripts/cloud-dev.py status
```

O setup instala dependências com `npm ci`, compila frontend e backend, prepara o JDK 21 e o Maven 3.9.11 a partir de uma imagem oficial fixada por digest e baixa as imagens de infraestrutura. As ferramentas, caches, logs e PIDs ficam em `.local/`, ignorado pelo Git. A verificação TLS permanece ativa; o Maven usa o proxy do ambiente e o truststore Java do sistema quando disponível.

O frontend Vite usa a porta **5173**, com proxy para `/api`; a API usa **8080**. A inicialização verifica a saúde da API, as configurações públicas, a consulta do catálogo e o HTML do frontend. Processos não sobrevivem a uma nova tarefa: execute `cloud-dev.py start` novamente. A restauração do snapshot em uma tarefa nova deve ser verificada separadamente.

Também é possível empacotar os builds já preparados em Docker. Isso evita downloads de Maven/npm dentro do builder quando a rede do ambiente exige um proxy:

```bash
python3 scripts/cloud-dev.py stop
bash scripts/docker-pack.sh
```

Essa variante reutiliza o JAR e `frontend/dist` produzidos pelo setup. Recompile após mudanças de código. Para voltar ao Vite, encerre somente os containers `api` e `web` e execute `cloud-dev.py start`.

```bash
python3 scripts/cloud-dev.py stop    # somente os processos que o script iniciou
python3 scripts/cloud-dev.py start   # reinício, com dados e volumes preservados
```

Em uma máquina com Java 21 e Maven instalados, também é possível executar `mvn spring-boot:run` em `backend/` e `npm run dev` em `frontend/`, com as variáveis abaixo configuradas. PostgreSQL e MinIO devem estar em execução.

Quando a API ou os testes Maven executarem fora do Docker, exponha o banco usando `docker compose -f compose.yaml -f compose.dev.yaml up -d postgres minio`. O helper `cloud-dev.py start` aplica essa configuração automaticamente. A porta do banco no host é `POSTGRES_PORT` do `.env` (padrão `5432`); configure outra porta se houver conflito. Essa opção não é necessária para testar o site completo em Docker.

## Funcionalidades

- Página inicial com pesquisa, hospedagens em destaque, catálogo, apresentação institucional e contato.
- Listagem paginada com filtros por destino/cidade, bairro, tipo, quartos e disponibilidade; ordenados por cadastro recente. Os filtros ficam na URL.
- Detalhes em `/imoveis/:slug`, galeria ampliada acessível por teclado, fotos e vídeos, características opcionais, comodidades, capacidade e hospedagens relacionadas.
- Endereço privado por padrão, com publicação explicitamente controlada pelo administrador.
- Links `wa.me` com mensagem contextual e URL do anúncio codificadas; contato flutuante global quando o número está configurado.
- Painel em `/admin`: dashboard, CRUD, rascunhos, publicação, destaque e confirmação de exclusão.
- Upload múltiplo com prévia e progresso, imagem principal, ordenação por arraste ou setas e exclusão individual confirmada.
- Nome da marca, logotipo, foto principal da home, WhatsApp, e-mail, chamada inicial e rodapé configuráveis.

## Organização

```text
backend/
  src/main/java/br/com/morada/catalog/
    Models.java, Repositories.java        entidades e persistência
    CatalogService.java                  catálogo, filtros, publicação
    MediaService.java, StorageService.java uploads e armazenamento
    SettingsService.java                 identidade e contato
    SecurityConfig.java, AuthController.java sessões e autorização
    CatalogController.java, Errors.java   contratos HTTP e validação
  src/main/resources/db/migration/        migrações Flyway
  src/test/                              integração com PostgreSQL e S3 reais
frontend/
  src/pages/                             área pública e painel
  src/components/                        cartões, galeria e componentes shadcn/ui
  src/lib/                               API, tipos e validação Zod
  e2e/                                   fluxos Playwright em desktop e celular
scripts/                                 setup e gestão dos processos locais
compose.yaml                             serviços e volumes de desenvolvimento
```

## API e autenticação

| Rota | Uso |
| --- | --- |
| `GET /api/public/properties` | Consulta paginada de hospedagens publicadas |
| `GET /api/public/properties/{slug}` | Detalhes públicos |
| `GET /api/public/amenities` | Comodidades disponíveis |
| `GET /api/public/settings` | Configurações públicas |
| `GET /api/public/media/{id}` | Mídia de uma hospedagem publicada, com suporte a Range |
| `GET /api/auth/csrf` | Token e nome do cabeçalho CSRF |
| `POST /api/auth/login` | Login do administrador |
| `POST /api/auth/logout` | Encerramento da sessão |
| `GET /api/auth/me` | Administrador autenticado |
| `/api/admin/properties` | CRUD restrito |
| `/api/admin/properties/{id}/media` | Upload restrito |
| `PUT /api/admin/properties/{id}/media/order` | Lista completa de IDs na ordem desejada |
| `PUT /api/admin/properties/{id}/media/{mediaId}/primary` | Foto principal |
| `DELETE /api/admin/properties/{id}/media/{mediaId}` | Exclusão individual |
| `GET /api/admin/dashboard` | Totais do catálogo |
| `PUT /api/admin/settings` | Configuração do site |
| `POST /api/admin/settings/logo` | Upload de logotipo |
| `POST /api/admin/settings/hero` | Upload da foto principal da home |
| `DELETE /api/admin/settings/hero` | Retorna à imagem ilustrativa |
| `GET /api/public/hero` | Foto principal configurada |

Os parâmetros de listagem são `search`, `city`, `neighborhood`, `type`, `minPrice`, `maxPrice`, `minBedrooms`, `status`, `featured`, `page` (começa em zero), `size` (1–100) e `sort` (`recent`, `price-asc`, `price-desc`). Rascunhos não são acessíveis publicamente, inclusive suas mídias. Disponíveis e indisponíveis são publicados; a interface pública começa mostrando disponíveis.

OpenAPI em `/v3/api-docs` e Swagger em `/swagger-ui/index.html` na API, ambos restritos à sessão administrativa. Primeiro autentique-se no painel usando o mesmo hostname. O Nginx encaminha esses caminhos para a API.

O login usa BCrypt com custo 12, cookie de sessão HttpOnly/SameSite, rotação da sessão e proteção CSRF. Requisições mutáveis, inclusive login, devem enviar o token de `GET /api/auth/csrf` no cabeçalho informado e manter o cookie. O frontend faz isso automaticamente e renova o token depois do login. Não são usados tokens em `localStorage`. O login limita tentativas por endereço remoto. Em implantação com proxy, avalie esse limite conforme a topologia e configure também a limitação de tentativas na borda.

## Mídias e armazenamento

Uploads são realizados pela API autenticada; não é necessário tornar o bucket público ou gravável por visitantes. O PostgreSQL guarda metadados e chaves organizadas por hospedagem. As URLs públicas passam pela API, que confere a publicação antes de ler o objeto. Vídeos suportam requisições de intervalo, permitindo reprodução e avanço no navegador.

- Fotos: JPG/PNG, até 15 MB e 40 megapixels. O backend decodifica e redimensiona para até 1920 px, converte para JPEG e gera miniaturas de 480 px. Metadados EXIF são descartados.
- Vídeos: MP4/WebM, até 100 MB, com validação do cabeçalho do arquivo. Não há transcodificação: utilize codecs aceitos pelos navegadores, como H.264 para MP4 e VP8/VP9 para WebM.
- Até 30 mídias por hospedagem. Vídeos não podem ser imagem principal.
- Exclusão de hospedagem, mídia, logo ou foto principal registra as chaves em uma fila transacional. Um trabalhador tenta remover os objetos a cada 15 segundos, repetindo após falhas. Durante esse intervalo, os registros removidos já não são acessíveis pela API. Monitore a tabela `exclusao_objeto` e os logs se o armazenamento permanecer indisponível.

O MinIO local usa uma distribuição Bitnami Legacy, fixada por digest, pois os registros da distribuição oficial não estavam acessíveis no ambiente. Essa imagem é destinada ao desenvolvimento local e não recebe atualizações automáticas. O software MinIO utiliza AGPLv3; consulte a licença e as obrigações de distribuição. Em produção, utilize R2 ou um serviço S3 mantido.

## Produção com Cloudflare R2

Configure na API, por gerenciador seguro de segredos:

| Variável | Valor/configuração |
| --- | --- |
| `DATABASE_URL` | URL JDBC do PostgreSQL de produção |
| `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Credenciais do banco |
| `S3_ENDPOINT` | Endpoint HTTPS da conta R2 |
| `S3_REGION` | `auto` para R2; região correspondente em outro S3 |
| `S3_BUCKET` | Nome do bucket privado já provisionado |
| `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Credenciais limitadas ao bucket |
| `S3_CREATE_BUCKET` | `false` em produção |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Administrador inicial; senha com 12 caracteres mínimos e 72 bytes máximos |
| `COOKIE_SECURE` | `true` com HTTPS |
| `DEMO_DATA` | `false` |

Sirva frontend e API na mesma origem, com HTTPS na borda. O Nginx inclui fallback das rotas React, cabeçalhos de segurança e limite de upload de 110 MB. O Compose fornecido é de desenvolvimento: substitua as configurações de infraestrutura por serviços gerenciados para produção. Configure backups do PostgreSQL e dos objetos, retenção e observabilidade antes da implantação. Sessões ficam em memória da API e exigem novo login após reinício; o escopo é uma instância e um administrador.

Credenciais R2 e validação de uma implantação de produção não estão incluídas no setup local. Não coloque valores secretos em arquivos versionados, instruções salvas ou mensagens.

## Verificações

Com infraestrutura inicializada e `.env` configurado:

```bash
python3 scripts/cloud-dev.py test
cd frontend
npm run test:e2e
```

Os testes de backend usam o PostgreSQL e MinIO locais, transações revertidas e limpeza dos objetos de teste. Os testes de frontend verificam URLs do WhatsApp e validação do formulário. Os testes de navegador exercitam busca, controle de acesso, cadastro, upload de imagem e vídeo, reordenação, publicação, privacidade do endereço, mensagem contextual, reprodução com Range, confirmação de exclusão e logout, em desktop e celular. A configuração de WhatsApp é restaurada após cada teste.

Para Playwright, defina `CHROMIUM_PATH` para seu navegador Chromium/Chrome instalado; o padrão neste ambiente é `/usr/bin/chromium`. `E2E_BASE_URL` permite apontar para outro servidor de desenvolvimento. Use um banco dedicado ao desenvolvimento/testes, nunca o banco de produção. Screenshots e resultados ficam em diretórios ignorados. A execução da pipeline de CI requer publicar o código no repositório; os comandos foram validados nesta máquina.

Airbnb e Vrbo foram consultados como referências de fotografia, vitrine e navegação por destinos. O Booking retornou uma página de verificação e sua interface não pôde ser avaliada. O desenho da Privê Lopes utiliza composição própria em azul, laranja, areia e branco.

## Avaliar a evolução de hospedagens

A implementação está isolada na branch `feature/prive-lopes-hospedagens`; não há merge automático na `main`.

```bash
git fetch origin
git switch feature/prive-lopes-hospedagens
git pull --ff-only
docker compose -p website-imoveis stop
docker compose -p prive-lopes-avaliacao up --build -d --wait
```

A avaliação usa volumes separados para banco e armazenamento. A instalação original é pausada para liberar as mesmas portas e seus volumes são preservados. Para voltar: encerre os serviços com `docker compose -p prive-lopes-avaliacao stop`, execute `git switch main` e `docker compose up -d`. As novas migrações permanecem apenas no banco de avaliação.

Quem já tem uma instalação deve preservar o `.env` e os volumes. A migração V3 atualiza somente os valores iniciais da marca anterior, preservando configurações personalizadas. As migrações V4/V5 adicionam a foto da home e adaptam somente os exemplos que ainda possuem a descrição original; anúncios reais, descrições editadas, slugs, mídias e credenciais permanecem válidos. Novos ambientes recebem `admin@privelopes.local` como e-mail inicial; instalações existentes continuam com o e-mail de seu próprio `.env`.

Os CTAs gerais usam o link oficial `http://wa.me/5581995809198?text=Oi%2C+tenho+interesse+na+casa`. A mensagem do anúncio inclui o título da hospedagem e sua URL. O WhatsApp continua configurável no painel. Preços e taxas antigos são mantidos como valores de referência no cadastro, sem apresentação de cobrança mensal na vitrine. Não existe calendário de reservas: o visitante consulta datas e valores diretamente pelo WhatsApp.

### Arquivos visuais oficiais pendentes

A logo oficial e a foto real da casa mencionadas na solicitação não estão disponíveis neste checkout nem nos anexos acessíveis. Não foram substituídas por imagens apresentadas como oficiais. Até serem fornecidas, a interface usa um símbolo de sol e a fotografia já existente, identificada como ilustrativa. Em **Configurações do site**, envie a logo em JPG/PNG e a foto em **Foto principal da home**. A logo também atualiza o favicon do navegador. A foto da home utiliza o processamento seguro de imagens e o mesmo armazenamento privado S3 já usado no catálogo.

Não há comando de lint configurado no repositório. A revisão executa a checagem TypeScript incluída no build e `npx prettier --check src index.html e2e/catalog.spec.ts` em `frontend/`, além das suítes existentes e dos novos cenários de configuração/imagem principal.

### Resumo da implementação e arquivos

Foram reaproveitados o catálogo, os filtros, as rotas existentes, a autenticação administrativa, o CRUD, a galeria, os vídeos e o armazenamento S3. A página Contatos e a migração V3 já existiam parcialmente na branch e foram preservadas. A evolução ajusta identidade, linguagem, cards, navegação e apresentação do painel; adiciona configuração da foto principal, metadados por página e migrações incrementais V4/V5.

Arquivos modificados nesta evolução, relativos à raiz do repositório:

- Documentação e configuração: `README.md`, `scripts/init-local-env.py`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/index.html`, `frontend/public/favicon.svg`.
- Backend, em `backend/src/main/java/br/com/morada/catalog/`: `CatalogController.java`, `DemoData.java`, `Dtos.java`, `Models.java`, `SettingsService.java`.
- Migrações novas, em `backend/src/main/resources/db/migration/`: `V4__imagem_principal_site.sql`, `V5__exemplos_hospedagens.sql`.
- Componentes, em `frontend/src/components/`: `Feedback.tsx`, `MediaManager.tsx`, `PropertyCard.tsx`, `PublicLayout.tsx`, `ui/button.tsx` e o novo `Seo.tsx`.
- Área pública, em `frontend/src/`: `App.tsx`, `styles.css`, `pages/Home.tsx`, `pages/Catalog.tsx`, `pages/PropertyDetail.tsx`, `pages/Contacts.tsx`.
- Painel, em `frontend/src/pages/admin/`: `AdminLayout.tsx`, `Dashboard.tsx`, `Login.tsx`, `Properties.tsx`, `PropertyEditor.tsx`, `Settings.tsx`.
- Tipos e validação, em `frontend/src/lib/`: `types.ts`, `utils.ts`, `property-schema.ts`.
- Testes: `backend/src/test/java/br/com/morada/catalog/CatalogIntegrationTest.java`, `frontend/e2e/catalog.spec.ts`, `frontend/src/lib/property-schema.test.ts`, `frontend/src/lib/utils.test.ts`.

Validação nesta implementação: Maven `verify` com 13 testes de integração aprovados; 8 testes unitários do frontend; build TypeScript/Vite e checagem Prettier aprovados; 8 cenários Playwright aprovados na versão Docker, entre desktop e celular. A revisão adicional de home e contatos em larguras de 390, 768 e 1440 px não encontrou erros JavaScript, imagens quebradas ou rolagem horizontal. O projeto Docker de avaliação foi iniciado com volumes novos e as seis hospedagens demonstrativas e suas mídias responderam à consulta pública.
