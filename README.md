# Career Path AI

Documentação inicial do produto e do domínio antes da implementação.

## Documentos

- [Visão de domínio](docs/domain-model.md)
- [Estrutura do backend](docs/backend-structure.md)
- [Histórico de setup e execução local](docs/historico-setup.md)

## Stack prevista

- Backend: FastAPI + SQLAlchemy + Alembic
- Banco: PostgreSQL
- Fila: Celery + Redis
- Frontend: Next.js + TypeScript + Tailwind + Framer Motion
- Auth: Clerk ou Auth0
- Pagamentos: Stripe + Mercado Pago/Pagar.me
- IA: provedor externo de LLM

## Princípios desta fase

- Modelar o domínio antes de escrever schema, rotas ou jobs.
- Tratar trilha, assinatura e consumo da etapa gratuita como regras centrais.
- Manter IA como mecanismo de personalização sobre conteúdo curado.
- Considerar segurança, LGPD, cobrança e controle de custo desde o MVP.