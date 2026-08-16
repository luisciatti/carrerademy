# Histórico de Setup e Execução Local

## Objetivo deste documento

Consolidar tudo que já foi feito no projeto até agora, o que está funcionando, o que bloqueou, e o passo a passo para rodar localmente.

## Resumo executivo

- A base documental do produto foi criada e refinada.
- O scaffold inicial do backend foi criado com FastAPI, SQLAlchemy, Alembic, Celery e Docker Compose.
- O carregamento da aplicação e do metadata ORM foi validado com sucesso.
- O Docker subiu corretamente com Postgres e Redis em estado healthy.
- A primeira migration foi gerada com sucesso em alembic/versions/cca771ed5ba7_initial_schema.py.
- O comando de upgrade do Alembic foi executado sem erro.
- A API subiu e o endpoint /health respondeu 200 OK.

## Linha do tempo do que foi feito

### 1. Modelagem inicial de domínio

- Criação e expansão da documentação de domínio.
- Registro de regras de negócio principais e invariantes.
- Ajuste da modelagem para as decisões fechadas do MVP.

Arquivos relacionados:

- docs/domain-model.md
- README.md

### 2. Estrutura arquitetural obrigatória

- Documentação da árvore de pastas do backend.
- Definição explícita de separação por camadas.
- Definição de regras de dependência permitidas e proibidas.

Arquivos relacionados:

- docs/backend-structure.md
- README.md

### 3. Scaffold técnico do backend

Criação da estrutura base de projeto em:

- app/
- alembic/
- tests/

Principais arquivos criados:

- app/main.py
- app/core/config.py
- app/core/deps.py
- app/infra/db/base.py
- app/infra/db/session.py
- app/domain/enums.py
- app/domain/models.py
- alembic.ini
- alembic/env.py
- docker-compose.yml
- pyproject.toml
- .env.example
- .gitignore

Observação:

- O arquivo app/domain/models.py foi materializado no workspace para viabilizar o fluxo de metadata e migration, já que ele não estava presente no checkout visível no início.

### 4. Validações já executadas com sucesso

- Import da aplicação FastAPI funcionando.
- Endpoint /health registrado na aplicação.
- Base.metadata carregando as tabelas esperadas:
- users
- onboarding_responses
- career_paths
- path_steps
- content_items
- user_progress
- subscriptions
- payments
- ai_generation_logs

### 5. Bloqueios encontrados

- docker compose up -d falhou por indisponibilidade do daemon Docker no Windows (pipe do Docker Desktop Linux Engine não encontrada).
- Sem PostgreSQL ativo em localhost:5432, o comando de autogeração do Alembic falhou por timeout de conexão.
- Por esse motivo, a pasta alembic/versions ficou sem arquivo de migration gerado.

### 6. Reteste bem-sucedido

- Docker daemon foi iniciado e o comando docker compose up -d concluiu com sucesso.
- docker compose ps confirmou postgres e redis com status healthy.
- O comando de autogeração criou a migration inicial:
	- alembic/versions/cca771ed5ba7_initial_schema.py
- O comando de upgrade head foi executado sem falhas.
- A API foi executada com Uvicorn.
- O endpoint /health retornou 200 OK.

## Status atual

### Pronto

- Estrutura de pastas do backend.
- Configuração de settings por variáveis de ambiente.
- Sessão de banco com SQLAlchemy.
- App FastAPI com endpoint de saúde.
- Configuração inicial do Alembic apontando para o metadata dos models.

### Pendente

- Nenhum item bloqueante para o setup inicial.
- Próxima etapa: começar implementação das regras de negócio.

## O que é necessário para rodar localmente

## Pré-requisitos

- Docker Desktop instalado e iniciado.
- Engine Linux do Docker ativa.
- Python com ambiente virtual do projeto disponível.

## Variáveis de ambiente

1. Garantir que existe o arquivo .env na raiz do projeto.
2. Se não existir, criar a partir de .env.example.

Valores esperados principais:

- DATABASE_URL com PostgreSQL local.
- REDIS_URL com Redis local.

## Passo a passo de primeira execução

1. Abrir terminal na pasta do backend:
C:\Users\luisc\OneDrive\Desktop\CarrerAdemy\backend

2. Subir infraestrutura local:
docker compose up -d

3. Verificar containers:
docker compose ps

4. Gerar primeira migration:
python -m alembic revision --autogenerate -m initial_schema

5. Aplicar migration:
python -m alembic upgrade head

6. Subir API para teste rápido:
python -m uvicorn app.main:app --reload

7. Testar health check:
http://127.0.0.1:8000/health

Resposta esperada: status ok.

## Erros comuns e correções

1. Erro: No script_location key found in configuration.
- Causa: comando executado fora da raiz do repositório (por exemplo, dentro de .venv/Scripts).
- Correção: voltar para a pasta raiz do projeto antes de chamar o Alembic.

2. Erro: Set-Location com parâmetro -m ao tentar rodar upgrade.
- Causa: uso de cd para executar comando Python.
- Correção: não usar cd para executar Python. Execute diretamente o comando do interpretador.

3. Erro: timeout em localhost:5432.
- Causa: Docker daemon desligado ou containers não iniciados.
- Correção: iniciar Docker Desktop, rodar docker compose up -d e confirmar via docker compose ps.

## Checklist de confirmação final

- Docker compose em execução sem erro.
- Banco PostgreSQL aceitando conexão em localhost:5432.
- Arquivo de migration criado em alembic/versions.
- Alembic upgrade head executado com sucesso.
- Endpoint /health respondendo corretamente.

Status atual do checklist:

- Concluído.

## Próxima etapa depois do setup

- Implementar autenticação.
- Implementar rotas de negócio.
- Implementar geração assíncrona de trilha.
- Implementar integração de assinatura e webhooks.

Esses itens ficam fora da etapa atual de setup.

## Etapas adicionais concluídas: autenticação Clerk

### Backend (FastAPI)

- Implementada validação de JWT do Clerk via JWKS com cache local.
- Middleware da API configurado para autenticação por padrão com allowlist de rotas públicas.
- Dependência autenticada criada para sincronizar usuário local por clerk_user_id.
- Endpoint protegido de verificação criado em /api/v1/me.
- Webhook Clerk implementado com validação Svix para user.created e user.deleted.
- Migration adicional aplicada para incluir users.clerk_user_id com índice e unicidade.

Arquivos principais desta etapa:

- app/core/config.py
- app/core/deps.py
- app/core/security.py
- app/infra/auth/clerk.py
- app/api/v1/me.py
- app/api/v1/webhooks.py
- app/domain/models.py
- alembic/versions/82208cb819c4_clerk_auth_user_link.py

Validações registradas:

- /health sem token retorna 200.
- /api/v1/me sem token retorna 401.
- Alembic upgrade head concluído incluindo revisão de Clerk.

### Frontend (Next.js + Clerk)

- Clerk CLI autenticado e app vinculado com sucesso ao projeto CarrerAdemy.
- Frontend consolidado no monorepo em:
	- C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/frontend
- Integração manual concluída após falha do fluxo automático do `clerk init` com erro EEXIST.
- Dependência @clerk/nextjs presente no projeto.
- ClerkProvider adicionado no layout.
- Páginas de autenticação criadas:
	- app/sign-in/[[...sign-in]]/page.tsx
	- app/sign-up/[[...sign-up]]/page.tsx
- Arquivo proxy.ts criado com matcher incluindo:
	- /(api|trpc)(.*)
	- /__clerk/:path*
- Página inicial ajustada para exibir:
	- estado deslogado com SignInButton e SignUpButton
	- estado logado com UserButton
- Variáveis puxadas com clerk env pull para .env.local.
- `clerk doctor` executado com status final "All checks passing".
- `npm run lint` executado sem erros.
- `npm run dev` validado com servidor ativo em http://localhost:3000.

## Observações operacionais recentes

1. `clerk env pull` não aceita caminho como argumento.
- Exemplo inválido: clerk env pull .env.local
- Uso correto: clerk env pull

2. Em alguns cenários, `clerk init` em projeto já existente pode tentar criar pasta e falhar com EEXIST.
- Fallback recomendado: aplicar integração manual (provider, proxy, rotas sign-in/sign-up, env) e validar com clerk doctor.

## Reorganização para monorepo

Estrutura consolidada em uma única raiz:

- C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend
- C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/frontend
- C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/docs

Mudanças executadas:

- Conteúdo antigo de carrerademy movido para backend.
- Conteúdo antigo de my-clerk-next-app movido para frontend.
- Documentação centralizada em docs na raiz.
- `.git` consolidado na raiz para manter um único repositório.
- `.gitignore` único criado na raiz cobrindo backend e frontend.

Validação pós-migração:

- `docker compose up -d` funcional a partir de backend.
- API respondeu 200 em `/health`.
- Frontend subiu com `npm run dev` e respondeu 200 em `/`.
- Ajuste de compatibilidade com Clerk Core 3 aplicado na home.
- `git status` na raiz não listou `.venv`, `node_modules`, `.env` nem `.env.local` como arquivos a commitar.