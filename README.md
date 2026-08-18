# CarrerAdemy Monorepo

Monorepo com backend FastAPI e frontend Next.js, versionados juntos para desenvolvimento e deploy coordenado.

## Estrutura

- `backend/`: API FastAPI, SQLAlchemy, Alembic, Celery e Docker Compose.
- `frontend/`: aplicação Next.js com Clerk.
- `docs/`: documentação funcional e técnica.

## Pré-requisitos

- Docker Desktop ativo (engine Linux).
- Python 3.11+.
- Node.js 22+ e npm.

## Modos de execução

### 1) Modo dia a dia (recomendado para desenvolvimento)

Esse é o fluxo recomendado porque mantém o hot-reload do Next.js mais rápido, rodando nativo fora do Docker.

1. Suba backend + infraestrutura:

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend
docker compose up -d
```

Isso sobe `postgres`, `redis`, `backend` e `worker`.

2. Rode o frontend nativo:

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/frontend
npm install
npm run dev
```

3. Acesse:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/health`

### 2) Modo completo (stack inteira)

Use para validar a stack completa antes de deploy, ensaios de demonstração e testes integrados de execução containerizada.

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend
docker compose --profile full up -d
```

Isso sobe tudo, incluindo `frontend` containerizado em modo produção na porta `3000`.

## Parar ambiente

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend
docker compose down
```

## Deploy (inicial/provisório)

### Build das imagens de produção

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend
docker compose build backend worker
docker compose --profile full build frontend
```

### Próximos passos de infraestrutura

- Reservado para definição do provedor de produção (Railway/Render/OCI).
- Reservado para pipeline CI/CD com publicação de imagens.
- Reservado para estratégia de variáveis secretas e observabilidade.

## Documentação

- `docs/domain-model.md`
- `docs/backend-structure.md`
- `docs/historico-setup.md`
