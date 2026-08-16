# CarrerAdemy Monorepo

Este repositório unifica backend e frontend em uma única raiz para versionamento e deploy coordenado.

## Estrutura

- `backend/`: API FastAPI, modelos SQLAlchemy, Alembic, Docker Compose e integrações de autenticação.
- `frontend/`: aplicação Next.js com Clerk.
- `docs/`: documentação funcional e técnica do projeto.

## Pré-requisitos

- Docker Desktop ativo (engine Linux)
- Python 3.11+ com ambiente virtual para o backend
- Node.js 20+ e npm

## Como rodar o backend

1. Entre na pasta do backend:

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend
```

2. Suba infraestrutura local:

```powershell
docker compose up -d
```

3. Aplique migrations:

```powershell
C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/.venv/Scripts/alembic.exe upgrade head
```

4. Popule a base curada inicial de conteudo:

```powershell
$env:PYTHONPATH="C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend"
C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/.venv/Scripts/python.exe scripts/seed_content_items.py
```

5. Suba a API:

```powershell
uvicorn app.main:app --reload
```

6. Em outro terminal, suba o worker Celery (Windows):

```powershell
celery -A app.infra.queue.celery_app worker --loglevel=info --pool=solo
```

7. Teste o health check:

- `http://127.0.0.1:8000/health`

## Como rodar o frontend

1. Entre na pasta do frontend:

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/frontend
```

2. Instale dependências (se necessário):

```powershell
npm install
```

3. Garanta a variavel de ambiente da API (arquivo `frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Rode em desenvolvimento:

```powershell
npm run dev
```

5. Acesse:

- `http://localhost:3000`

## Comandos úteis

- Backend lint/testes: definir conforme a evolução do projeto.
- Frontend lint:

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/frontend
npm run lint
```

## Documentação

- `docs/domain-model.md`
- `docs/backend-structure.md`
- `docs/historico-setup.md`
