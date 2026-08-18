# Backend CarrerAdemy

API FastAPI com PostgreSQL, Redis, Alembic e Celery.

## Pré-requisitos

- Python 3.11+
- Docker Desktop (engine Linux)

## Setup local

1. Entre na pasta do backend:

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend
```

2. Configure variáveis de ambiente:

```powershell
Copy-Item .env.example .env
```

Variáveis mínimas para rodar local:

- `DATABASE_URL`
- `REDIS_URL`
- `CORS_ALLOWED_ORIGINS`

Variáveis de autenticação (quando usar Clerk):

- `CLERK_SECRET_KEY`
- `CLERK_ISSUER`
- `CLERK_JWKS_URL`
- `CLERK_WEBHOOK_SIGNING_SECRET`

3. (Opcional) Ambiente virtual Python e dependências:

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy
python -m venv .venv
.\.venv\Scripts\Activate.ps1
Set-Location .\backend
pip install -e .[dev]
```

4. Suba serviços base com Docker Compose:

```powershell
docker compose up -d
```

Esse comando sobe `postgres`, `redis`, `backend` e `worker`.

5. Aplique migrations:

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy
.\.venv\Scripts\alembic.exe -c backend/alembic.ini upgrade head
```

6. Popule conteúdo inicial:

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend
$env:PYTHONPATH="C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend"
C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/.venv/Scripts/python.exe scripts/seed_content_items.py
```

## Rodando sem container para API/worker

Você pode manter apenas `postgres` e `redis` no Docker e rodar API/worker nativos:

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend
uvicorn app.main:app --reload
```

Worker Celery no Windows (importante usar `--pool=solo`):

```powershell
celery -A app.infra.queue.celery_app worker --loglevel=info --pool=solo
```

## Modo full com frontend containerizado

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend
docker compose --profile full up -d
```

## Testes

Todos os testes:

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend
pytest
```

Teste específico existente:

```powershell
pytest tests/test_standard_soft_skills_access.py
```

## Health check

- `http://localhost:8000/health`

## Referências

- `../docs/domain-model.md`
- `../docs/backend-structure.md`
- `../docs/historico-setup.md`