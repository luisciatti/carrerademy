# Career Path AI - Modelagem de Domínio Inicial

## Objetivo

Definir o domínio do produto antes da implementação para alinhar linguagem, regras de negócio, entidades, fluxos e limites do MVP.

## Decisões já fechadas

- Backend em FastAPI.
- Persistência com SQLAlchemy e migrations com Alembic.
- Banco PostgreSQL.
- Processamento assíncrono com Celery e Redis.
- Chaves primárias em UUID.
- Uma etapa gratuita única por conta, controlada por `User.free_step_used`.
- Uma trilha por onboarding no MVP.
- Uma assinatura relevante por usuário no MVP.
- `PathStep.status` representa o estado atual da etapa.
- `UserProgress` representa o histórico de conclusão, não substitui `PathStep.status`.
- Enums fechados por ora, isolados em Python para facilitar expansão futura.
- `CareerPath.onboarding_response_id` deve ser único.
- `Payment.provider_payment_id` deve ser único para evitar duplicidade de webhook.

## Resumo do produto

Career Path AI é uma plataforma SaaS que gera trilhas personalizadas de desenvolvimento de carreira. O usuário informa seu contexto profissional e objetivo principal, e o sistema monta uma trilha em formato de mapa de etapas combinando IA com uma base curada de conteúdo.

O modelo comercial é por assinatura. A primeira etapa é liberada gratuitamente como demonstração de valor. As etapas seguintes dependem de assinatura ativa.

## Problema que o produto resolve

- Falta de clareza sobre próximos passos de carreira.
- Excesso de conteúdo genérico e sem priorização.
- Dificuldade em converter metas amplas em um plano de execução.
- Necessidade de preparação direcionada para mercado internacional ou mudança de país.

## Personas principais

- Profissional que quer crescer na carreira atual.
- Profissional que quer trocar de área ou emprego.
- Profissional que busca vaga fora do país.
- Profissional que avalia morar fora e precisa se preparar melhor.

## Proposta de valor

- Personalização do plano de carreira com base no contexto do usuário.
- Sequenciamento prático de etapas em vez de apenas recomendações soltas.
- Experiência gamificada para aumentar constância e percepção de progresso.
- Combinação de IA com conteúdo curado para reduzir alucinação e aumentar qualidade.

## Fluxo principal do usuário

1. Usuário cria conta ou faz login.
2. Usuário responde onboarding curto.
3. Sistema gera uma trilha personalizada.
4. Usuário visualiza a trilha como mapa de nós.
5. A primeira etapa aparece liberada.
6. As demais etapas aparecem bloqueadas com preview limitado.
7. Usuário conclui a etapa gratuita.
8. Ao tentar avançar, encontra o paywall.
9. Se assinar, libera o restante da trilha.
10. O progresso passa a alimentar o loop diário do produto.

## Linguagem ubíqua inicial

- Usuário: pessoa autenticada na plataforma.
- Onboarding: conjunto de respostas que descreve contexto e objetivo.
- Trilha de carreira: plano gerado para um usuário a partir do onboarding.
- Etapa: unidade de progresso dentro da trilha.
- Conteúdo curado: item previamente cadastrado e validado pelo sistema.
- Etapa gratuita: primeira etapa liberada uma única vez por conta.
- Assinatura: vínculo comercial que libera etapas pagas.
- Geração: execução do processo que monta a trilha.
- Progresso: evidência de conclusão de uma etapa.

## Capacidades centrais do domínio

### 1. Identidade e acesso

Responsável por autenticação, vínculo do usuário com provedores de auth e proteção de rotas.

### 2. Diagnóstico inicial

Responsável por capturar o estado atual do usuário, objetivo e disponibilidade.

### 3. Geração de trilha

Responsável por combinar onboarding, conteúdo curado e IA para produzir uma sequência coerente de etapas.

### 4. Consumo da trilha

Responsável por desbloqueio, visualização, progresso e regras da etapa gratuita.

### 5. Cobrança e assinatura

Responsável por planos, status da assinatura, pagamentos e continuidade de acesso até o fim do ciclo pago.

### 6. Observabilidade de IA

Responsável por limites, custo por usuário, logs de geração e prevenção de abuso.

## Regras de negócio críticas

### Etapa gratuita

- A etapa gratuita é única por conta.
- O controle não pertence à trilha; pertence ao usuário.
- Gerar uma nova trilha não renova a gratuidade.
- A regra deve ser aplicada mesmo se a trilha anterior for arquivada.

### Geração de trilha

- A geração deve respeitar limite por usuário por dia.
- A IA não deve criar conteúdo educacional arbitrário como fonte principal.
- A base curada deve ser a principal origem de cursos, artigos, certificações e tarefas.
- A IA decide seleção, ordem, narrativa e priorização.
- O processo deve ser assíncrono para não bloquear a interface.

### Acesso por assinatura

- Sem assinatura ativa, apenas a etapa gratuita pode ser consumida.
- Assinatura cancelada mantém acesso até `current_period_end`.
- O sistema não deve encerrar acesso imediatamente ao cancelar.
- Estados de cobrança precisam refletir o provedor de pagamento, sem guardar cartão.

### Comunicação do produto

- O produto promete preparação, não resultado garantido.
- Toda cópia do sistema deve evitar linguagem de garantia de vaga, visto ou aprovação.

### Privacidade e exclusão

- Dados de carreira e emprego são dados pessoais.
- O MVP já precisa permitir exclusão de conta e dados associados.
- Soft delete no usuário ajuda conformidade, auditoria e recuperação controlada.

## Entidades iniciais e responsabilidades

### User

Representa a conta principal.

Campos iniciais:

- `id`
- `email`
- `name`
- `password_hash` se auth local existir
- `created_at`
- `deleted_at`
- `free_step_used`

Responsabilidades:

- Identificar o titular da conta.
- Marcar consumo da etapa gratuita.
- Ser âncora para onboarding, trilhas, progresso e assinatura.

### OnboardingResponse

Representa um snapshot do contexto informado pelo usuário.

Campos iniciais:

- `id`
- `user_id`
- `current_job`
- `dream_job`
- `goal`
- `experience_level`
- `weekly_time_availability`
- `created_at`

Responsabilidades:

- Registrar o contexto que originou a trilha.
- Preservar histórico caso o usuário gere novas trilhas no futuro.

### CareerPath

Representa a trilha gerada para o usuário.

Campos iniciais:

- `id`
- `user_id`
- `onboarding_response_id`
- `title`
- `generated_at`
- `status`

Responsabilidades:

- Servir como contêiner da sequência de etapas.
- Permitir múltiplas trilhas ao longo do tempo.
- Manter vínculo com o onboarding que a originou.

### PathStep

Representa cada etapa da trilha.

Campos iniciais:

- `id`
- `career_path_id`
- `order_index`
- `title`
- `description`
- `content_reference_id`
- `is_free`
- `status`

Responsabilidades:

- Materializar a sequência de aprendizado/execução.
- Indicar se a etapa faz parte da demonstração gratuita.
- Viabilizar estados de bloqueio, liberação e conclusão.

Observação:

- `PathStep.status` representa o estado operacional atual da etapa para aquela trilha do usuário.
- `UserProgress` coexistirá como histórico de conclusão e trilha de auditoria de progresso.

### ContentItem

Representa a base curada usada pela IA.

Campos iniciais:

- `id`
- `type`
- `title`
- `description`
- `external_url`
- `tags`
- `is_active`

Responsabilidades:

- Ser a fonte principal de recomendações.
- Permitir curadoria, ativação e desativação de itens.
- Suportar filtragem por tipo e tags.

### UserProgress

Representa a conclusão de uma etapa por um usuário.

Campos iniciais:

- `id`
- `user_id`
- `path_step_id`
- `completed_at`

Responsabilidades:

- Registrar progresso individual.
- Alimentar métricas futuras como streak, readiness score e badges.

Observação:

- No MVP, funciona como log histórico de conclusão e não como fonte única do estado atual da etapa.
- Em iterações futuras, pode ganhar `started_at`, `status`, `notes` ou `evidence_url`.

### Subscription

Representa o acesso pago do usuário.

Campos iniciais:

- `id`
- `user_id`
- `plan`
- `status`
- `provider`
- `provider_subscription_id`
- `current_period_end`
- `created_at`

Responsabilidades:

- Controlar elegibilidade de acesso às etapas pagas.
- Refletir o estado de cobrança vindo do provedor.
- Permitir regra de acesso até o fim do período pago.

### Payment

Representa eventos de cobrança associados à assinatura.

Campos iniciais:

- `id`
- `subscription_id`
- `amount`
- `currency`
- `status`
- `provider_payment_id`
- `created_at`

Responsabilidades:

- Fornecer trilha de auditoria financeira.
- Facilitar reconciliação com o provedor.

### AIGenerationLog

Representa o custo e uso do processo de geração.

Campos iniciais:

- `id`
- `user_id`
- `career_path_id`
- `prompt_tokens`
- `completion_tokens`
- `cost_estimate`
- `created_at`

Responsabilidades:

- Monitorar custo por usuário e por trilha.
- Sustentar limites e alertas operacionais.
- Oferecer insumo para otimização de prompts e cache.

## Relações do domínio

- Um usuário pode ter várias respostas de onboarding.
- Uma resposta de onboarding origina exatamente uma trilha no MVP.
- Um usuário pode ter várias trilhas ao longo do tempo.
- Uma trilha possui várias etapas ordenadas.
- Uma etapa pode referenciar zero ou um item de conteúdo curado.
- Um usuário pode ter vários registros de progresso.
- Um usuário pode ter uma assinatura relevante por vez no MVP.
- Uma assinatura pode ter vários pagamentos.
- Uma trilha pode ter vários logs de geração ao longo da evolução da solução.

## Estados e ciclos de vida

### CareerPath.status

- `ACTIVE`: trilha em uso.
- `COMPLETED`: trilha concluída.
- `ARCHIVED`: trilha encerrada ou substituída.

### PathStep.status

- `LOCKED`: não acessível ainda.
- `UNLOCKED`: acessível.
- `COMPLETED`: concluída.

### Subscription.status

- `ACTIVE`: acesso liberado.
- `CANCELED`: cancelada, mas ainda pode manter acesso até fim do período.
- `PAST_DUE`: cobrança com problema; política exata de bloqueio precisa ser definida com base no provedor.

## Eventos importantes do domínio

- Usuário criado.
- Onboarding respondido.
- Geração de trilha solicitada.
- Geração de trilha concluída.
- Etapa gratuita consumida.
- Etapa concluída.
- Assinatura ativada.
- Assinatura cancelada.
- Pagamento confirmado.
- Conta excluída.

Esses eventos não precisam virar event bus no MVP, mas ajudam a desenhar automações, auditoria e filas.

## Invariantes importantes

- Cada trilha deve ter ordem consistente de etapas.
- Apenas uma etapa da trilha deve ser marcada como gratuita.
- `free_step_used` não volta para `false` por gerar nova trilha.
- `onboarding_response_id` deve ser único em `CareerPath`.
- Progresso não deve existir para etapa de outra conta sem vínculo legítimo.
- Assinatura nunca deve depender de armazenamento local de dados de cartão.
- `provider_payment_id` deve ser único em `Payment` para evitar reprocessamento do mesmo evento financeiro.
- Webhooks de pagamento só podem alterar estado após validação de assinatura.

## Decisões de modelagem fechadas para o schema inicial

### 1. Estado em `PathStep` versus histórico em `UserProgress`

`PathStep.status` guarda o estado atual da etapa para a trilha persistida do usuário. `UserProgress` armazena o histórico de conclusão. Os dois coexistem por atenderem responsabilidades diferentes.

### 2. Cardinalidade entre onboarding e trilha

No MVP, cada `OnboardingResponse` gera exatamente um `CareerPath`. Essa regra deve ser reforçada por unicidade de `onboarding_response_id` em `CareerPath`.

### 3. Assinatura única por usuário

Para o MVP, existe uma assinatura relevante por usuário. O histórico permanece nas tabelas `Subscription` e `Payment`.

### 4. Enumerações abertas

`goal`, `experience_level`, `plan`, `provider` e `status` nascem como enums fechados, definidos em Python e isolados para permitir extensão futura sem espalhar acoplamento.

### 5. Estratégia de identificadores e unicidade

- Todas as entidades principais usam UUID como chave primária.
- `provider_payment_id` deve ser único para blindar o processamento idempotente de pagamentos.
- `onboarding_response_id` único em `CareerPath` garante a regra de uma trilha por onboarding.

## Fronteiras técnicas derivadas do domínio

A organização física do backend seguirá a estrutura obrigatória documentada em [docs/backend-structure.md](docs/backend-structure.md).

### Backend API

- Cadastro e sessão.
- Onboarding.
- Solicitação e consulta de geração de trilha.
- Consulta de trilha e etapas.
- Marcação de progresso.
- Assinatura, paywall e webhooks.
- Exclusão de conta.

### Processamento assíncrono

- Geração de trilha por fila.
- Enriquecimento com conteúdo curado.
- Registro de custo de IA.
- Aplicação de cache e limites.

### Painel administrativo futuro

- Gestão de conteúdo curado.
- Acompanhamento de custo de IA.
- Monitoramento de assinaturas e pagamentos.

## Requisitos não funcionais refletidos no domínio

### Segurança

- Rotas autenticadas por padrão.
- Validação de entrada em todas as fronteiras.
- Rate limiting em login e geração de trilha.
- Secrets fora do código.

### Privacidade

- Exclusão de conta desde o MVP.
- Soft delete e política clara de retenção.
- Tratamento de dados profissionais como dados pessoais.

### Pagamentos

- Tokenização via provedor.
- Webhooks assinados.
- Auditoria mínima de pagamentos.

### Custos de IA

- Limites por usuário.
- Registro por geração.
- Preferência por conteúdo curado.
- Cache de resultados quando aplicável.

### Performance

- Geração assíncrona.
- UI desacoplada do tempo de resposta do LLM.

## Fora de escopo no MVP

- Reajuste dinâmico da trilha conforme progresso.
- Leaderboards ou componentes sociais.
- Simulados de avaliação.
- App mobile nativo.
- Suporte multilíngue.

## Recomendações para a próxima etapa

Antes de escrever código, a próxima modelagem deveria fechar estes pontos:

1. Definir bounded contexts iniciais do backend.
2. Revisar o schema existente contra estas invariantes e constraints.
3. Especificar estados e transições que exigirão validação transacional.
4. Desenhar os fluxos assíncronos de geração e cobrança.
5. Escolher o provedor inicial de auth para não duplicar modelagem.