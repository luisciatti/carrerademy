# Histórico de Setup e Execução Local

## Objetivo deste documento

Consolidar tudo que já foi feito no projeto até agora, o que está funcionando, o que bloqueou, e o passo a passo para rodar localmente.

## Resumo executivo

- A base documental do produto foi criada e refinada.
- O scaffold inicial do backend foi criado com FastAPI, SQLAlchemy, Alembic, Celery e Docker Compose.
- O carregamento da aplicação e do metadata ORM foi validado com sucesso.
- A primeira migration ainda não foi gerada porque o PostgreSQL local não subiu (daemon do Docker indisponível durante os testes).

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

## Status atual

### Pronto

- Estrutura de pastas do backend.
- Configuração de settings por variáveis de ambiente.
- Sessão de banco com SQLAlchemy.
- App FastAPI com endpoint de saúde.
- Configuração inicial do Alembic apontando para o metadata dos models.

### Pendente

- Subir Postgres e Redis localmente via Docker.
- Gerar a primeira migration.
- Aplicar migration no banco local.

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

1. Abrir terminal na pasta do projeto:
C:\Users\luisc\OneDrive\Desktop\CarrerAdemy\carrerademy

2. Subir infraestrutura local:
docker compose up -d

3. Verificar containers:
docker compose ps

4. Gerar primeira migration:
c:/Users/luisc/OneDrive/Desktop/CarrerAdemy/.venv/Scripts/python.exe -m alembic revision --autogenerate -m initial_schema

5. Aplicar migration:
c:/Users/luisc/OneDrive/Desktop/CarrerAdemy/.venv/Scripts/python.exe -m alembic upgrade head

6. Subir API para teste rápido:
c:/Users/luisc/OneDrive/Desktop/CarrerAdemy/.venv/Scripts/python.exe -m uvicorn app.main:app --reload

7. Testar health check:
http://127.0.0.1:8000/health

Resposta esperada: status ok.

## Checklist de confirmação final

- Docker compose em execução sem erro.
- Banco PostgreSQL aceitando conexão em localhost:5432.
- Arquivo de migration criado em alembic/versions.
- Alembic upgrade head executado com sucesso.
- Endpoint /health respondendo corretamente.

## Próxima etapa depois do setup

- Implementar autenticação.
- Implementar rotas de negócio.
- Implementar geração assíncrona de trilha.
- Implementar integração de assinatura e webhooks.

Esses itens ficam fora da etapa atual de setup.