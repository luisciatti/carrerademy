# Frontend CarrerAdemy

Aplicação Next.js (App Router) com autenticação Clerk.

## Pré-requisitos

- Node.js 22+
- npm

## Variáveis de ambiente

1. Crie o arquivo local:

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/frontend
Copy-Item .env.example .env.local
```

2. Preencha as variáveis no `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

## Rodar nativo (modo desenvolvimento)

Esse é o modo recomendado para desenvolvimento por causa do hot-reload mais rápido.

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/frontend
npm install
npm run dev
```

Acesso: `http://localhost:3000`

Nesse modo, a API deve apontar para:

- `NEXT_PUBLIC_API_URL=http://localhost:8000`

## Rodar com Docker (modo full)

O frontend containerizado sobe em modo produção via profile `full` no Compose do backend:

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/backend
docker compose --profile full up -d
```

Acesso: `http://localhost:3000`

No container, a API precisa apontar para o nome do serviço Docker:

- `NEXT_PUBLIC_API_URL=http://backend:8000`

Esse valor já é forçado no serviço `frontend` do Compose.

## Build local

```powershell
Set-Location C:/Users/luisc/OneDrive/Desktop/CarrerAdemy/frontend
npm run build
npm run start
```

## Troubleshooting rápido

- Erro do Clerk `Missing publishableKey`: confira `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` no `.env.local`.
- Erro de comunicação com backend: valide `NEXT_PUBLIC_API_URL` conforme o modo (nativo vs container).
