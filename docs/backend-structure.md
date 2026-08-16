# Career Path AI - Estrutura Obrigatória do Backend

## Objetivo

Registrar a estrutura de pastas obrigatória do backend para orientar scaffold, organização de responsabilidades e revisão de arquitetura.

## Árvore definida

```text
career-path-ai-backend/
├── app/
│   ├── main.py                      # criação da app FastAPI, registro de routers
│   │
│   ├── core/                        # configuração transversal
│   │   ├── config.py                # settings (env vars via pydantic-settings)
│   │   ├── security.py              # hashing, verificação de token/JWT
│   │   └── deps.py                  # dependências reutilizáveis (get_db, get_current_user)
│   │
│   ├── domain/                      # entidades puras — SEM import de FastAPI/Celery
│   │   ├── enums.py                 # GoalType, PathStepStatus, etc.
│   │   └── models.py                # modelos SQLAlchemy (já implementado)
│   │
│   ├── schemas/                     # contratos Pydantic de entrada/saída da API
│   │   ├── onboarding.py
│   │   ├── career_path.py
│   │   └── subscription.py
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── router.py            # agrega todos os sub-routers
│   │       ├── onboarding.py        # POST /onboarding
│   │       ├── career_paths.py      # GET /career-paths, GET /career-paths/{id}
│   │       ├── progress.py          # POST /path-steps/{id}/complete
│   │       ├── subscriptions.py     # POST /subscriptions, GET /subscriptions/me
│   │       └── webhooks.py          # POST /webhooks/stripe, /webhooks/mercado-pago
│   │
│   ├── services/                    # regra de negócio — API chama services, nunca infra direto
│   │   ├── onboarding_service.py
│   │   ├── path_generation_service.py
│   │   ├── progress_service.py
│   │   └── subscription_service.py
│   │
│   ├── infra/                       # integrações externas — só services chamam infra
│   │   ├── db/
│   │   │   ├── session.py           # engine + SessionLocal
│   │   │   └── base.py              # Base declarativa (import central dos models)
│   │   ├── ai_provider/
│   │   │   └── client.py            # wrapper da chamada de IA
│   │   ├── payments/
│   │   │   ├── stripe_client.py
│   │   │   └── mercado_pago_client.py
│   │   └── queue/
│   │       └── celery_app.py        # configuração do Celery
│   │
│   ├── tasks/                       # jobs assíncronos (Celery)
│   │   └── generate_career_path.py  # task que chama path_generation_service
│   │
│   └── shared/                      # utilitários genéricos
│       ├── exceptions.py            # exceções de domínio
│       └── utils.py
│
├── alembic/
│   ├── versions/
│   └── env.py
│
├── tests/
│   ├── unit/                        # testes de services
│   └── integration/                 # testes de rotas com banco de teste
│
├── .env.example                     # nunca commitar .env real
├── pyproject.toml                   # ou requirements.txt
├── docker-compose.yml               # Postgres + Redis locais
└── README.md
```

## Regras arquiteturais derivadas

- `domain/` não importa FastAPI, Celery ou clientes externos.
- `api/` orquestra entrada e saída HTTP, mas não implementa regra de negócio diretamente.
- `services/` concentra os casos de uso e chama `infra/` quando necessário.
- `infra/` encapsula banco, fila, IA e pagamentos para evitar vazamento de detalhes técnicos.
- `tasks/` expõe jobs assíncronos finos e delega a regra de negócio para `services/`.
- `schemas/` define contratos de API separados dos modelos ORM.
- `shared/` guarda utilitários transversais sem acoplamento de camada.

## Regras obrigatórias de dependência entre camadas

### Dependências permitidas

- `api/` pode depender de `schemas/`, `services/`, `core/` e `shared/`.
- `services/` pode depender de `domain/`, `infra/`, `shared/` e, quando necessário, de `schemas/` como DTOs internos de borda.
- `tasks/` pode depender de `services/`, `core/`, `infra/queue/` e `shared/`.
- `infra/` pode depender de `domain/`, `core/` e `shared/` para materializar integrações.
- `domain/` pode depender apenas de seus próprios módulos e de bibliotecas de modelagem/persistência estritamente necessárias ao núcleo definido.

### Dependências proibidas

- `domain/` não importa nada de `api/`, `services/`, `infra/` ou `tasks/`.
- `api/` nunca chama `infra/` diretamente.
- `api/` nunca acessa banco, Stripe, Mercado Pago, Redis, Celery ou cliente de IA diretamente.
- `services/` não deve depender de detalhes HTTP de FastAPI para executar regra de negócio.
- `infra/` não conhece fluxo de negócio, política de desbloqueio, regra da etapa gratuita ou decisão de assinatura.
- `tasks/` não implementa regra de negócio própria; apenas delega para `services/`.

### Fluxo arquitetural esperado

```text
HTTP Request -> api/ -> services/ -> infra/
Celery Task -> tasks/ -> services/ -> infra/

domain/ permanece no centro como núcleo do sistema.
```

### Motivação da separação

- Trocar o provedor de IA deve exigir ajuste apenas em `infra/ai_provider/` e, no máximo, em contratos usados por `services/`.
- Trocar o provedor de pagamento deve ficar restrito a `infra/payments/` e ao mapeamento que `services/` usa.
- Rotas e jobs devem continuar estáveis mesmo quando integrações externas mudarem.
- A regra de negócio precisa continuar testável de forma isolada, sem subir FastAPI, Celery ou provedores externos.

## Limites importantes

- Rotas não acessam Stripe, Mercado Pago, Celery ou cliente de IA diretamente.
- Models SQLAlchemy permanecem em `domain/models.py` por decisão já tomada.
- Enums ficam centralizados em `domain/enums.py`.
- Dependências transversais de autenticação e banco ficam em `core/` e `core/deps.py`.
- O import central da base declarativa deve evitar ciclos entre `infra/db/base.py` e `domain/models.py`.

## Ordem sugerida para scaffold futuro

1. Criar a espinha dorsal de `app/`, `alembic/` e `tests/`.
2. Materializar `infra/db/base.py` e `infra/db/session.py`.
3. Conectar `app/main.py` ao router agregado de `api/v1/router.py`.
4. Adicionar `core/config.py` e `core/deps.py`.
5. Só então preencher services, rotas, tasks e integrações externas.

## Observação de fase

Esta estrutura está registrada como contrato de arquitetura. Neste momento, o repositório ainda não foi scaffoldado para refletir essa árvore.