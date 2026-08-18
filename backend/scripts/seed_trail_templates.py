from __future__ import annotations

import uuid

from sqlalchemy import delete, select

from app.domain.enums import CareerType, ContentItemType
from app.domain.models import ContentItem, TrailTemplate, TrailTemplateStep
from app.infra.db.session import SessionLocal


def _has_tags(item: ContentItem, required: set[str]) -> bool:
    item_tags = {tag.lower() for tag in (item.tags or [])}
    return required.issubset(item_tags)


def _pick_items(items: list[ContentItem], *, include_any: set[str], include_all: set[str], limit: int = 6) -> list[ContentItem]:
    selected = [
        item
        for item in items
        if _has_tags(item, include_all)
        and bool({tag.lower() for tag in (item.tags or [])}.intersection({t.lower() for t in include_any}))
    ]

    def sort_key(item: ContentItem) -> tuple[int, int, str]:
        is_video = 0 if item.type.value == "VIDEO" else 1
        has_follow_up = 0 if item.follow_up_content_item_id is not None else 1
        return (is_video, has_follow_up, item.title.lower())

    return sorted(selected, key=sort_key)[:limit]


def _pick_starter_items(items: list[ContentItem], career_type: CareerType, limit: int = 6) -> list[ContentItem]:
    career_tag = f"career-type:{career_type.value.lower()}"
    selected = [
        item
        for item in items
        if _has_tags(item, {"soft-skill", career_tag})
    ]

    def sort_key(item: ContentItem) -> tuple[int, int, str]:
        is_video = 0 if item.type.value == "VIDEO" else 1
        has_follow_up = 0 if item.follow_up_content_item_id is not None else 1
        return (is_video, has_follow_up, item.title.lower())

    return sorted(selected, key=sort_key)[:limit]


def _ensure_template_content_item(
    *,
    db,
    cache: dict[str, ContentItem],
    template_slug: str,
    step_slug: str,
    content_type: ContentItemType,
    title: str,
    description: str,
    reward_description: str,
    video_url: str | None = None,
    form_schema: dict | None = None,
    quiz_schema: dict | None = None,
    matching_schema: dict | None = None,
    dialogue_schema: dict | None = None,
    scenario_schema: dict | None = None,
    rules_schema: dict | None = None,
) -> ContentItem:
    key = f"{template_slug}:{step_slug}"
    existing = cache.get(key)
    if existing is None:
        existing = db.scalar(
            select(ContentItem).where(
                ContentItem.type == content_type,
                ContentItem.title == title,
            )
        )

    tags = ["soft-skill", "template-catalog", f"template:{template_slug}", f"step:{step_slug}"]

    if existing is None:
        existing = ContentItem(
            id=uuid.uuid4(),
            type=content_type,
            title=title,
            description=description,
            video_url=video_url,
            form_schema=form_schema,
            quiz_schema=quiz_schema,
            matching_schema=matching_schema,
            dialogue_schema=dialogue_schema,
            scenario_schema=scenario_schema,
            rules_schema=rules_schema,
            reward_description=reward_description,
            tags=tags,
            is_active=True,
        )
        db.add(existing)
        db.flush()
    else:
        existing.type = content_type
        existing.title = title
        existing.description = description
        existing.video_url = video_url
        existing.form_schema = form_schema
        existing.quiz_schema = quiz_schema
        existing.matching_schema = matching_schema
        existing.dialogue_schema = dialogue_schema
        existing.scenario_schema = scenario_schema
        existing.rules_schema = rules_schema
        existing.reward_description = reward_description
        existing.tags = tags
        existing.is_active = True
        db.flush()

    cache[key] = existing
    return existing


def _quiz_schema(*, questions: list[tuple[str, list[str], int]]) -> dict:
    return {
        "questions": [
            {"prompt": prompt, "options": options, "correctIndex": correct_index}
            for prompt, options, correct_index in questions
        ]
    }


def _matching_schema(*, prompt: str, pairs: list[tuple[str, str]], success: str, error: str) -> dict:
    return {
        "prompt": prompt,
        "pairs": [{"left": left, "right": right} for left, right in pairs],
        "successMessage": success,
        "errorMessage": error,
    }


def _dialogue_schema(*, title: str, nodes: list[dict]) -> dict:
    return {
        "title": title,
        "startNodeId": nodes[0]["id"],
        "nodes": nodes,
    }


def _scenario_order_schema(*, prompt: str, pieces: list[tuple[str, str]], correct_order: list[str], explanation: str) -> dict:
    return {
        "mode": "order",
        "prompt": prompt,
        "pieces": [{"id": piece_id, "label": label, "category": "etapa"} for piece_id, label in pieces],
        "correctOrder": correct_order,
        "explanation": explanation,
    }


def _rules_schema(*, center_title: str, rules: list[tuple[str, str, str]]) -> dict:
    return {
        "centerTitle": center_title,
        "rules": [{"id": rid, "title": title, "description": description} for rid, title, description in rules],
    }


def _form_schema(prompt: str) -> dict:
    return {
        "fields": [
            {
                "name": "reflection",
                "label": prompt,
                "type": "textarea",
                "placeholder": "Escreva com contexto, emocao e acao tomada.",
            }
        ]
    }


def _build_thematic_catalog(*, db) -> list[tuple[TrailTemplate, list[ContentItem]]]:
    cache: dict[str, ContentItem] = {}
    all_career_types: list[str] = []

    catalog_definitions = [
        {
            "slug": "comunicacao_assertiva",
            "title": "Comunicacao Assertiva",
            "description": "Aprenda a expressar suas ideias com clareza e seguranca, sem passar por cima dos outros nem se anular.",
            "category": "Comunicacao",
            "icon": "message-circle",
            "bonus_type": ContentItemType.SCENARIO_BUILDER,
        },
        {
            "slug": "gestao_tempo",
            "title": "Gestao de Tempo",
            "description": "Pare de reagir a agenda dos outros e comece a priorizar o que realmente importa no seu dia.",
            "category": "Produtividade",
            "icon": "clock",
            "bonus_type": ContentItemType.RULES_RADIAL,
        },
        {
            "slug": "lideranca",
            "title": "Lideranca",
            "description": "Os primeiros passos pra liderar pessoas, mesmo sem ter gerente no cargo ainda.",
            "category": "Lideranca",
            "icon": "users",
            "bonus_type": ContentItemType.SCENARIO_BUILDER,
        },
        {
            "slug": "negociacao",
            "title": "Negociacao",
            "description": "Negocie prazos, salario e escopo sem sair da conversa se sentindo derrotado.",
            "category": "Comunicacao",
            "icon": "handshake",
            "bonus_type": ContentItemType.RULES_RADIAL,
        },
        {
            "slug": "gestao_conflitos",
            "title": "Gestao de Conflitos",
            "description": "Lide com desacordos de equipe sem evitar a conversa nem deixar virar briga.",
            "category": "Comunicacao",
            "icon": "shield",
            "bonus_type": ContentItemType.SCENARIO_BUILDER,
        },
        {
            "slug": "produtividade_pessoal",
            "title": "Produtividade Pessoal",
            "description": "Sistemas simples pra parar de depender so de forca de vontade pra render bem.",
            "category": "Produtividade",
            "icon": "zap",
            "bonus_type": ContentItemType.RULES_RADIAL,
        },
    ]

    templates_with_steps: list[tuple[TrailTemplate, list[ContentItem]]] = []

    for definition in catalog_definitions:
        template = TrailTemplate(
            id=uuid.uuid4(),
            title=definition["title"],
            description=definition["description"],
            category=definition["category"],
            career_type_tags=all_career_types,
            icon=definition["icon"],
            is_starter=False,
            is_active=True,
        )
        db.add(template)
        db.flush()

        slug = definition["slug"]

        if slug == "comunicacao_assertiva":
            steps = [
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="video",
                    content_type=ContentItemType.VIDEO,
                    title="O que e comunicacao assertiva (e o que nao e)",
                    description="Entenda os pilares da assertividade e como diferenciar fala passiva, agressiva e assertiva.",
                    reward_description="Voce ganhou +1 de Clareza para iniciar conversas dificeis com respeito.",
                    video_url="https://www.youtube.com/watch?v=REPLACE_ASSERTIVE_COMM_VIDEO",
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="form",
                    content_type=ContentItemType.INTERACTIVE_FORM,
                    title="Quando voce se calou por medo da reacao",
                    description="Traga para o papel uma situacao real em que voce evitou se posicionar.",
                    reward_description="Voce ganhou +1 de Autoconsciencia para nomear travas de comunicacao.",
                    form_schema=_form_schema("Descreva uma vez que voce evitou dizer o que pensava por medo da reacao da outra pessoa."),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="quiz",
                    content_type=ContentItemType.QUIZ,
                    title="Quiz: passiva, agressiva ou assertiva?",
                    description="Treine o olhar para distinguir estilos de comunicacao em frases comuns de trabalho.",
                    reward_description="Voce ganhou +1 de Discernimento para escolher melhor seu tom.",
                    quiz_schema=_quiz_schema(
                        questions=[
                            (
                                "Qual frase e assertiva?",
                                [
                                    "Voce sempre estraga tudo na reuniao.",
                                    "Tudo bem, deixa como esta, nem vou comentar.",
                                    "Quando sou interrompido, perco a linha de raciocinio. Podemos combinar de eu concluir e depois voce entra?",
                                ],
                                2,
                            ),
                            (
                                "Qual opcao representa comunicacao passiva?",
                                [
                                    "Nao concordo com o prazo, precisamos revisar.",
                                    "Claro, eu faco tudo sozinho, sem problema.",
                                    "Se continuar assim, nao vou responder mais.",
                                ],
                                1,
                            ),
                            (
                                "Qual frase e agressiva?",
                                [
                                    "Esse prazo e absurdo, so alguem sem nocao aprovaria.",
                                    "Preciso de 2 dias extras para manter a qualidade.",
                                    "Podemos renegociar entregaveis para manter a data?",
                                ],
                                0,
                            ),
                        ]
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="matching",
                    content_type=ContentItemType.MATCHING_GAME,
                    title="Associe frases aos estilos de comunicacao",
                    description="Conecte cada frase ao estilo correto para reforcar repertorio rapido.",
                    reward_description="Voce ganhou +1 de Leitura Social para interpretar sinais na conversa.",
                    matching_schema=_matching_schema(
                        prompt="Associe cada frase ao estilo de comunicacao.",
                        pairs=[
                            ("Tudo bem, eu aceito qualquer decisao.", "Passiva"),
                            ("Se nao fizer do meu jeito, o problema e seu.", "Agressiva"),
                            ("Quero alinhar expectativas para chegarmos em um bom acordo.", "Assertiva"),
                            ("Nao vou discutir isso agora.", "Evasiva"),
                        ],
                        success="Boa! Voce esta diferenciando estilos com mais precisao.",
                        error="Revise o impacto de cada frase no relacionamento e no resultado.",
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="dialogue",
                    content_type=ContentItemType.DIALOGUE_SIMULATOR,
                    title="Simulacao: interrupcoes em reunioes",
                    description="Pratique como pedir para um colega parar de te interromper em reunioes sem escalar conflito.",
                    reward_description="Voce ganhou +1 de Coragem Conversacional para sustentar limites com respeito.",
                    dialogue_schema=_dialogue_schema(
                        title="Pedir para um colega parar de te interromper em reunioes",
                        nodes=[
                            {
                                "id": "n1",
                                "speaker": "Colega",
                                "text": "Eu so interrompo porque quero acelerar a discussao.",
                                "options": [
                                    {"id": "n1o1", "label": "Voce sempre faz isso e atrapalha tudo.", "nextNodeId": "n2a"},
                                    {"id": "n1o2", "label": "Entendo a intencao. Quando sou interrompido, perco a linha. Podemos combinar turnos?", "nextNodeId": "n2b"},
                                ],
                            },
                            {
                                "id": "n2a",
                                "speaker": "Colega",
                                "text": "Desse jeito fica dificil conversar.",
                                "options": [
                                    {"id": "n2ao1", "label": "Ok, deixa pra la.", "outcome": {"title": "Fim neutro", "evaluation": "Voce evitou o conflito, mas nao resolveu o problema."}},
                                ],
                            },
                            {
                                "id": "n2b",
                                "speaker": "Colega",
                                "text": "Faz sentido. Qual combinacao voce sugere?",
                                "options": [
                                    {"id": "n2bo1", "label": "Eu concluo o ponto e depois abro para contrapontos.", "nextNodeId": "n3"},
                                    {"id": "n2bo2", "label": "Nao sei, so para de interromper.", "outcome": {"title": "Fim parcial", "evaluation": "Voce definiu limite, mas sem acordo pratico."}},
                                ],
                            },
                            {
                                "id": "n3",
                                "speaker": "Colega",
                                "text": "Combinado. Vamos testar na proxima reuniao.",
                                "options": [
                                    {"id": "n3o1", "label": "Fechado, e se nao funcionar a gente ajusta.", "outcome": {"title": "Fim assertivo", "evaluation": "Voce alinhou limite, acordo e revisao futura com maturidade."}},
                                ],
                            },
                        ],
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="bonus",
                    content_type=ContentItemType.SCENARIO_BUILDER,
                    title="Bonus: pedido assertivo em 4 passos",
                    description="Ordene os passos de um pedido assertivo claro para consolidar o metodo.",
                    reward_description="Voce ganhou +1 de Estrutura Mental para conversas objetivas.",
                    scenario_schema=_scenario_order_schema(
                        prompt="Ordene os passos de um pedido assertivo claro.",
                        pieces=[
                            ("p1", "Descreva o fato observado sem julgamento"),
                            ("p2", "Explique o impacto concreto para voce ou para o time"),
                            ("p3", "Apresente o pedido especifico"),
                            ("p4", "Confirme combinacao e proximo passo"),
                        ],
                        correct_order=["p1", "p2", "p3", "p4"],
                        explanation="A sequencia fato-impacto-pedido-combinacao reduz defensividade e aumenta colaboracao.",
                    ),
                ),
            ]
        elif slug == "gestao_tempo":
            steps = [
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="video",
                    content_type=ContentItemType.VIDEO,
                    title="Por que listas de tarefas gigantes nao funcionam",
                    description="Entenda como excesso de itens sem criterio drena energia e foco.",
                    reward_description="Voce ganhou +1 de Priorizacao para cortar ruido na sua agenda.",
                    video_url="https://www.youtube.com/watch?v=REPLACE_TIME_MANAGEMENT_VIDEO",
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="form",
                    content_type=ContentItemType.INTERACTIVE_FORM,
                    title="Mapeie seus maiores consumidores de tempo",
                    description="Liste tarefas e contextos que mais capturam sua semana.",
                    reward_description="Voce ganhou +1 de Clareza Operacional para enxergar gargalos de rotina.",
                    form_schema=_form_schema("Liste as 3 tarefas que mais consomem seu tempo numa semana comum."),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="quiz",
                    content_type=ContentItemType.QUIZ,
                    title="Quiz: urgente x importante",
                    description="Teste sua leitura da matriz para decidir melhor sob pressao.",
                    reward_description="Voce ganhou +1 de Decisao para proteger prioridades reais.",
                    quiz_schema=_quiz_schema(
                        questions=[
                            (
                                "Qual atividade vai para o quadrante importante e nao urgente?",
                                ["Planejar objetivos da semana", "Responder mensagens a cada 2 minutos", "Apagar incendio de ultima hora"],
                                0,
                            ),
                            (
                                "Tarefa urgente e importante normalmente deve:",
                                ["Ser adiada sem prazo", "Receber execucao imediata", "Ser ignorada ate sobrar tempo"],
                                1,
                            ),
                            (
                                "Qual pratica reduz tarefas urgentes recorrentes?",
                                ["Planejamento preventivo", "Acumular tudo para sexta", "Aceitar qualquer demanda sem filtro"],
                                0,
                            ),
                        ]
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="matching",
                    content_type=ContentItemType.MATCHING_GAME,
                    title="Associe tarefas aos quadrantes da matriz",
                    description="Treine classificacao rapida para priorizar com criterio.",
                    reward_description="Voce ganhou +1 de Foco para agir com intencao.",
                    matching_schema=_matching_schema(
                        prompt="Associe cada tarefa ao quadrante correto.",
                        pairs=[
                            ("Planejar trimestre", "Importante e nao urgente"),
                            ("Cliente com sistema parado", "Urgente e importante"),
                            ("Notificacao sem relevancia", "Nao urgente e nao importante"),
                            ("Reuniao sem pauta", "Urgente e nao importante"),
                        ],
                        success="Excelente. Sua triagem esta mais estrategica.",
                        error="Reveja impacto no longo prazo e urgencia real de cada item.",
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="dialogue",
                    content_type=ContentItemType.DIALOGUE_SIMULATOR,
                    title="Simulacao: recusar tarefa extra com respeito",
                    description="Pratique como dizer nao sem parecer desengajado.",
                    reward_description="Voce ganhou +1 de Limite Saudavel para proteger entregas criticas.",
                    dialogue_schema=_dialogue_schema(
                        title="Recusar uma tarefa extra sem parecer desengajado",
                        nodes=[
                            {
                                "id": "n1",
                                "speaker": "Gestor",
                                "text": "Consegue pegar mais essa demanda hoje?",
                                "options": [
                                    {"id": "o1", "label": "Nao da, to cheio.", "nextNodeId": "n2a"},
                                    {"id": "o2", "label": "Quero ajudar. Hoje estou alocado em X e Y. Podemos priorizar juntos?", "nextNodeId": "n2b"},
                                ],
                            },
                            {
                                "id": "n2a",
                                "speaker": "Gestor",
                                "text": "Precisamos de mais colaboracao.",
                                "options": [
                                    {"id": "o3", "label": "Entendi.", "outcome": {"title": "Fim fraco", "evaluation": "Voce negou sem contextualizar impacto nem alternativa."}},
                                ],
                            },
                            {
                                "id": "n2b",
                                "speaker": "Gestor",
                                "text": "Ok, o que voce sugere?",
                                "options": [
                                    {"id": "o4", "label": "Posso assumir amanha cedo, ou trocamos prioridade com Y.", "outcome": {"title": "Fim forte", "evaluation": "Voce protegeu foco e ofereceu opcao viavel."}},
                                ],
                            },
                        ],
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="bonus",
                    content_type=ContentItemType.RULES_RADIAL,
                    title="Bonus: 5 regras para proteger foco",
                    description="Visualize regras praticas para defender blocos de trabalho profundo.",
                    reward_description="Voce ganhou +1 de Consistencia para manter ritmo sem dispersao.",
                    rules_schema=_rules_schema(
                        center_title="Protecao de Foco",
                        rules=[
                            ("r1", "Agenda blocos de foco", "Reserve horarios fixos no calendario para tarefas importantes."),
                            ("r2", "Defina 3 prioridades", "Limite o dia a no maximo tres entregas de alto impacto."),
                            ("r3", "Silencie interrupcoes", "Desative notificacoes durante execucao profunda."),
                            ("r4", "Tenha criterio para reunioes", "Entre apenas quando houver pauta e decisao clara."),
                            ("r5", "Revise o dia", "Feche o expediente com retrospectiva de foco e ajustes."),
                        ],
                    ),
                ),
            ]
        elif slug == "lideranca":
            steps = [
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="video",
                    content_type=ContentItemType.VIDEO,
                    title="Liderar nao e mandar: autoridade x influencia",
                    description="Entenda como gerar adesao sem depender de hierarquia formal.",
                    reward_description="Voce ganhou +1 de Influencia para mobilizar pessoas com confianca.",
                    video_url="https://www.youtube.com/watch?v=REPLACE_LEADERSHIP_VIDEO",
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="form",
                    content_type=ContentItemType.INTERACTIVE_FORM,
                    title="Quem te influenciou sem cargo",
                    description="Reflita sobre comportamentos de lideranca que nao dependem de titulo.",
                    reward_description="Voce ganhou +1 de Modelo Mental para lideranca na pratica.",
                    form_schema=_form_schema("Descreva um momento em que alguem te influenciou sem usar hierarquia."),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="quiz",
                    content_type=ContentItemType.QUIZ,
                    title="Quiz: lideranca situacional",
                    description="Treine a adaptacao de estilo conforme maturidade e contexto da equipe.",
                    reward_description="Voce ganhou +1 de Adaptabilidade para liderar diferentes perfis.",
                    quiz_schema=_quiz_schema(
                        questions=[
                            (
                                "Com colaborador iniciante em tarefa nova, qual estilo tende a funcionar melhor?",
                                ["Direcao clara com acompanhamento", "Delegacao total sem checkpoints", "Ausencia de orientacao"],
                                0,
                            ),
                            (
                                "Com profissional experiente e autonomo, o melhor e:",
                                ["Microgerenciar cada passo", "Delegar com objetivo e autonomia", "Retirar totalmente contexto"],
                                1,
                            ),
                            (
                                "Quando a equipe esta insegura, lideranca eficaz pede:",
                                ["Ironia para pressionar", "Suporte e clareza de caminho", "Silencio e espera"],
                                1,
                            ),
                        ]
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="matching",
                    content_type=ContentItemType.MATCHING_GAME,
                    title="Associe situacoes ao estilo de lideranca",
                    description="Conecte cenarios de equipe ao estilo mais adequado.",
                    reward_description="Voce ganhou +1 de Leitura de Contexto para ajustar sua abordagem.",
                    matching_schema=_matching_schema(
                        prompt="Associe cada situacao ao estilo mais adequado.",
                        pairs=[
                            ("Novo membro sem experiencia no processo", "Direcionar"),
                            ("Especialista motivado e consistente", "Delegar"),
                            ("Profissional competente mas desmotivado", "Apoiar"),
                            ("Equipe em transicao de responsabilidade", "Coaching"),
                        ],
                        success="Otimo. Voce esta calibrando melhor a lideranca por contexto.",
                        error="Reveja maturidade tecnica e motivacao antes de escolher estilo.",
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="dialogue",
                    content_type=ContentItemType.DIALOGUE_SIMULATOR,
                    title="Simulacao: delegar para pessoa insegura",
                    description="Delegue uma tarefa importante para alguem com receio de assumir responsabilidade.",
                    reward_description="Voce ganhou +1 de Desenvolvimento de Pessoas para elevar autonomia do time.",
                    dialogue_schema=_dialogue_schema(
                        title="Delegar tarefa importante para alguem inseguro",
                        nodes=[
                            {
                                "id": "n1",
                                "speaker": "Colaborador",
                                "text": "Nao sei se dou conta dessa entrega sozinho.",
                                "options": [
                                    {"id": "o1", "label": "Entao deixa, eu faco.", "outcome": {"title": "Fim curto", "evaluation": "Voce resolveu rapido, mas nao desenvolveu a pessoa."}},
                                    {"id": "o2", "label": "Vamos quebrar em etapas e combinar checkpoints.", "nextNodeId": "n2"},
                                ],
                            },
                            {
                                "id": "n2",
                                "speaker": "Colaborador",
                                "text": "Com checkpoints eu topo tentar.",
                                "options": [
                                    {"id": "o3", "label": "Fechado: objetivo claro, apoio e autonomia progressiva.", "outcome": {"title": "Fim lideranca", "evaluation": "Voce delegou com seguranca psicologica e estrutura."}},
                                ],
                            },
                        ],
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="bonus",
                    content_type=ContentItemType.SCENARIO_BUILDER,
                    title="Bonus: estrutura de 1:1 eficaz",
                    description="Monte uma reuniao de 1:1 equilibrando performance, desenvolvimento e apoio.",
                    reward_description="Voce ganhou +1 de Ritual de Lideranca para conversas de desenvolvimento.",
                    scenario_schema=_scenario_order_schema(
                        prompt="Monte a estrutura ideal de uma reuniao 1:1 com um liderado.",
                        pieces=[
                            ("p1", "Check-in rapido de contexto e energia"),
                            ("p2", "Revisao de avancos e bloqueios"),
                            ("p3", "Feedback de mao dupla"),
                            ("p4", "Plano de acao e proximos passos"),
                        ],
                        correct_order=["p1", "p2", "p3", "p4"],
                        explanation="A ordem cria seguranca, foco e compromisso com evolucao continua.",
                    ),
                ),
            ]
        elif slug == "negociacao":
            steps = [
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="video",
                    content_type=ContentItemType.VIDEO,
                    title="O erro mais comum em negociacao: ceder cedo demais",
                    description="Aprenda a sustentar valor antes de oferecer concessoes.",
                    reward_description="Voce ganhou +1 de Firmeza para negociar com mais estrategia.",
                    video_url="https://www.youtube.com/watch?v=REPLACE_NEGOTIATION_VIDEO",
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="form",
                    content_type=ContentItemType.INTERACTIVE_FORM,
                    title="Sua ultima negociacao em detalhes",
                    description="Reflita sobre contexto, resultado e pontos que poderia melhorar.",
                    reward_description="Voce ganhou +1 de Aprendizado Tatico para proximas conversas.",
                    form_schema=_form_schema("Descreva a ultima vez que voce negociou algo (salario, prazo, escopo) e como foi."),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="quiz",
                    content_type=ContentItemType.QUIZ,
                    title="Quiz: ancora, concessao e silencio",
                    description="Teste seu repertorio de taticas classicas de negociacao.",
                    reward_description="Voce ganhou +1 de Estrategia para conduzir conversas de valor.",
                    quiz_schema=_quiz_schema(
                        questions=[
                            (
                                "Qual e o objetivo da ancora em negociacao?",
                                ["Fixar referencia inicial de valor", "Encerrar conversa rapido", "Evitar contraproposta"],
                                0,
                            ),
                            (
                                "Concessao eficaz geralmente deve ser:",
                                ["Imediata e unilateral", "Condicionada a contrapartida", "Sem criterio"],
                                1,
                            ),
                            (
                                "O silencio estrategico pode ajudar porque:",
                                ["Cria espaco para a outra parte revelar informacoes", "Sempre constrange e piora", "Substitui preparacao"],
                                0,
                            ),
                        ]
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="matching",
                    content_type=ContentItemType.MATCHING_GAME,
                    title="Associe taticas aos objetivos",
                    description="Entenda quando cada tatica aumenta chance de acordo sustentavel.",
                    reward_description="Voce ganhou +1 de Leitura Tatica para escolher o movimento certo.",
                    matching_schema=_matching_schema(
                        prompt="Associe cada tatica ao objetivo principal.",
                        pairs=[
                            ("Ancora", "Definir faixa inicial de referencia"),
                            ("Silencio", "Estimular a outra parte a detalhar"),
                            ("Concessao gradual", "Proteger margem de valor"),
                            ("Resumo de alinhamento", "Validar entendimento comum"),
                        ],
                        success="Boa. Seu repertorio de negociacao esta mais consciente.",
                        error="Revise o efeito de cada tatica na dinamica da conversa.",
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="dialogue",
                    content_type=ContentItemType.DIALOGUE_SIMULATOR,
                    title="Simulacao: prazo apertado com cliente",
                    description="Negocie um prazo de entrega apertado preservando qualidade e relacao.",
                    reward_description="Voce ganhou +1 de Negociacao de Escopo para acordos realistas.",
                    dialogue_schema=_dialogue_schema(
                        title="Negociar um prazo apertado com um cliente",
                        nodes=[
                            {
                                "id": "n1",
                                "speaker": "Cliente",
                                "text": "Preciso disso entregue em 3 dias.",
                                "options": [
                                    {"id": "o1", "label": "Impossivel.", "outcome": {"title": "Fim abrupto", "evaluation": "Voce protegeu limite, mas sem alternativa."}},
                                    {"id": "o2", "label": "Entendo a urgencia. Posso propor opcoes com escopo e risco?", "nextNodeId": "n2"},
                                ],
                            },
                            {
                                "id": "n2",
                                "speaker": "Cliente",
                                "text": "Pode, quais opcoes?",
                                "options": [
                                    {"id": "o3", "label": "Opcao A: escopo reduzido em 3 dias. Opcao B: escopo completo em 6 dias.", "outcome": {"title": "Fim negociado", "evaluation": "Voce equilibrou prazo, escopo e transparencia."}},
                                ],
                            },
                        ],
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="bonus",
                    content_type=ContentItemType.RULES_RADIAL,
                    title="Bonus: 4 regras pre-negociacao",
                    description="Cheque pontos-chave antes de conversas de alta pressao.",
                    reward_description="Voce ganhou +1 de Preparacao para entrar forte em negociacoes dificeis.",
                    rules_schema=_rules_schema(
                        center_title="Antes de Negociar",
                        rules=[
                            ("r1", "Defina seu minimo aceitavel", "Saiba seu limite antes da conversa comecar."),
                            ("r2", "Mapeie interesses da outra parte", "Entenda o que realmente importa para o outro lado."),
                            ("r3", "Tenha alternativas", "Leve opcoes de escopo, prazo ou formato."),
                            ("r4", "Nomeie riscos", "Seja transparente sobre impacto de cada escolha."),
                        ],
                    ),
                ),
            ]
        elif slug == "gestao_conflitos":
            steps = [
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="video",
                    content_type=ContentItemType.VIDEO,
                    title="Conflito nao e o problema: a reacao e",
                    description="Aprenda a usar conflito como fonte de alinhamento e melhoria.",
                    reward_description="Voce ganhou +1 de Maturidade Relacional para lidar com tensao com calma.",
                    video_url="https://www.youtube.com/watch?v=REPLACE_CONFLICT_VIDEO",
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="form",
                    content_type=ContentItemType.INTERACTIVE_FORM,
                    title="Conflito recente que ainda incomoda",
                    description="Traga um caso real para transformar em plano de conversa.",
                    reward_description="Voce ganhou +1 de Autoanalise para sair do piloto automatico no conflito.",
                    form_schema=_form_schema("Descreva um conflito de trabalho recente que ainda te incomoda."),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="quiz",
                    content_type=ContentItemType.QUIZ,
                    title="Quiz: estilos de resposta a conflito",
                    description="Diferencie evitar, competir, colaborar, ceder e comprometer.",
                    reward_description="Voce ganhou +1 de Estrategia Relacional para responder com intencao.",
                    quiz_schema=_quiz_schema(
                        questions=[
                            (
                                "Qual estilo busca alto ganho para ambas as partes?",
                                ["Competir", "Colaborar", "Evitar"],
                                1,
                            ),
                            (
                                "Qual estilo prioriza relacao mesmo com perda de interesse proprio?",
                                ["Ceder", "Competir", "Evitar"],
                                0,
                            ),
                            (
                                "Comprometer normalmente significa:",
                                ["Sem acordo nenhum", "Ganho total de um lado", "Concessoes reciprocas parciais"],
                                2,
                            ),
                        ]
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="matching",
                    content_type=ContentItemType.MATCHING_GAME,
                    title="Associe conflitos ao estilo produtivo",
                    description="Treine selecao de abordagem conforme contexto e risco.",
                    reward_description="Voce ganhou +1 de Julgamento para escolher a resposta mais funcional.",
                    matching_schema=_matching_schema(
                        prompt="Associe cada situacao ao estilo mais produtivo.",
                        pairs=[
                            ("Crise com impacto imediato no cliente", "Competir com foco em decisao rapida"),
                            ("Tema sensivel com relacao de longo prazo", "Colaborar"),
                            ("Assunto de baixa relevancia", "Evitar temporariamente"),
                            ("Divergencia de prioridade entre times", "Comprometer"),
                        ],
                        success="Muito bom. Seu repertorio de resposta esta mais contextual.",
                        error="Considere urgencia, relacao e impacto antes de escolher estilo.",
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="dialogue",
                    content_type=ContentItemType.DIALOGUE_SIMULATOR,
                    title="Simulacao: mediar desacordo entre colegas",
                    description="Conduza uma conversa para reduzir ruido e gerar acordo entre duas pessoas.",
                    reward_description="Voce ganhou +1 de Mediacao para facilitar alinhamentos sob tensao.",
                    dialogue_schema=_dialogue_schema(
                        title="Mediar um desacordo entre dois colegas de equipe",
                        nodes=[
                            {
                                "id": "n1",
                                "speaker": "Colega A",
                                "text": "Ele nunca entrega no prazo combinado.",
                                "options": [
                                    {"id": "o1", "label": "Vamos por partes: fatos, impacto e expectativa de cada um.", "nextNodeId": "n2"},
                                    {"id": "o2", "label": "Vocês dois estao errados.", "outcome": {"title": "Fim defensivo", "evaluation": "A abordagem aumentou resistencia."}},
                                ],
                            },
                            {
                                "id": "n2",
                                "speaker": "Colega B",
                                "text": "Eu recebo demandas sem contexto e sem tempo.",
                                "options": [
                                    {"id": "o3", "label": "Vamos definir um acordo: briefing minimo e prazo com buffer.", "outcome": {"title": "Fim mediado", "evaluation": "Voce estruturou acordo pratico e verificavel."}},
                                ],
                            },
                        ],
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="bonus",
                    content_type=ContentItemType.SCENARIO_BUILDER,
                    title="Bonus: conversa de resolucao de conflito",
                    description="Ordene os passos de uma conversa para resolver desacordo sem escalada.",
                    reward_description="Voce ganhou +1 de Estrutura de Dialogo para destravar impasses.",
                    scenario_schema=_scenario_order_schema(
                        prompt="Ordene os passos de uma conversa de resolucao de conflito.",
                        pieces=[
                            ("p1", "Definir objetivo comum da conversa"),
                            ("p2", "Ouvir as versoes sem interrupcao"),
                            ("p3", "Sintetizar pontos de convergencia"),
                            ("p4", "Firmar acordo com responsaveis e prazo"),
                        ],
                        correct_order=["p1", "p2", "p3", "p4"],
                        explanation="Objetivo comum e escuta estruturada reduzem atrito e facilitam acordo.",
                    ),
                ),
            ]
        else:
            steps = [
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="video",
                    content_type=ContentItemType.VIDEO,
                    title="Motivacao e instavel, sistemas nao",
                    description="Construa produtividade sustentavel com rotina e ambiente, nao apenas vontade.",
                    reward_description="Voce ganhou +1 de Consistencia para produzir mesmo em dias dificeis.",
                    video_url="https://www.youtube.com/watch?v=REPLACE_PRODUCTIVITY_VIDEO",
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="form",
                    content_type=ContentItemType.INTERACTIVE_FORM,
                    title="Seu maior ladrao de tempo",
                    description="Identifique o principal gatilho de dispersao no seu contexto atual.",
                    reward_description="Voce ganhou +1 de Diagnostico para atacar a raiz da dispersao.",
                    form_schema=_form_schema("Descreva seu maior ladrao de tempo no trabalho hoje."),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="quiz",
                    content_type=ContentItemType.QUIZ,
                    title="Quiz: principios de foco profundo",
                    description="Teste fundamentos de deep work para elevar qualidade de entrega.",
                    reward_description="Voce ganhou +1 de Profundidade para trabalhar com menos fragmentacao.",
                    quiz_schema=_quiz_schema(
                        questions=[
                            (
                                "Deep work e melhor descrito como:",
                                ["Multitarefa constante", "Blocos sem interrupcao em tarefa cognitivamente exigente", "Responder tudo em tempo real"],
                                1,
                            ),
                            (
                                "Qual acao protege foco profundo?",
                                ["Checar notificacoes a cada minuto", "Definir inicio e fim do bloco", "Abrir varias abas sem criterio"],
                                1,
                            ),
                            (
                                "Qual sinal indica superficialidade excessiva?",
                                ["Troca de contexto continua", "Planejamento semanal", "Pausas intencionais"],
                                0,
                            ),
                        ]
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="matching",
                    content_type=ContentItemType.MATCHING_GAME,
                    title="Associe distracoes a antidotos",
                    description="Relacione interrupcoes comuns com estrategias praticas de neutralizacao.",
                    reward_description="Voce ganhou +1 de Defesa de Ambiente para manter concentracao.",
                    matching_schema=_matching_schema(
                        prompt="Associe cada distracao a estrategia mais eficaz.",
                        pairs=[
                            ("Notificacoes constantes", "Modo nao perturbe em blocos de foco"),
                            ("Reunioes sem pauta", "Criticos de entrada com objetivo claro"),
                            ("Troca de tarefa impulsiva", "Lista de captura para ideias paralelas"),
                            ("Celular por perto", "Distancia fisica durante trabalho profundo"),
                        ],
                        success="Perfeito. Sua higiene de foco ficou mais robusta.",
                        error="Pense em reduzir atrito para o foco e aumentar atrito para a distracao.",
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="dialogue",
                    content_type=ContentItemType.DIALOGUE_SIMULATOR,
                    title="Simulacao: proteger bloco de foco",
                    description="Peça para nao ser interrompido durante bloco de foco sem soar arrogante.",
                    reward_description="Voce ganhou +1 de Comunicacao de Limites para sustentar produtividade.",
                    dialogue_schema=_dialogue_schema(
                        title="Pedir para nao ser interrompido durante bloco de foco",
                        nodes=[
                            {
                                "id": "n1",
                                "speaker": "Colega",
                                "text": "Posso te chamar a qualquer momento hoje?",
                                "options": [
                                    {"id": "o1", "label": "Nao, estou ocupado.", "outcome": {"title": "Fim seco", "evaluation": "Voce protegeu tempo, mas sem acordo colaborativo."}},
                                    {"id": "o2", "label": "Das 9h as 11h vou estar em foco profundo. Depois disso te respondo rapido.", "nextNodeId": "n2"},
                                ],
                            },
                            {
                                "id": "n2",
                                "speaker": "Colega",
                                "text": "Combinado. Se for urgente, te marco no chat.",
                                "options": [
                                    {"id": "o3", "label": "Perfeito. Assim mantemos fluxo e colaboracao.", "outcome": {"title": "Fim equilibrado", "evaluation": "Voce definiu limite com empatia e combinacao clara."}},
                                ],
                            },
                        ],
                    ),
                ),
                _ensure_template_content_item(
                    db=db,
                    cache=cache,
                    template_slug=slug,
                    step_slug="bonus",
                    content_type=ContentItemType.RULES_RADIAL,
                    title="Bonus: 5 habitos de produtividade sustentavel",
                    description="Crie um sistema simples para manter performance no longo prazo.",
                    reward_description="Voce ganhou +1 de Sustentabilidade para manter alta performance sem exaustao.",
                    rules_schema=_rules_schema(
                        center_title="Produtividade no Longo Prazo",
                        rules=[
                            ("r1", "Planejar o dia na noite anterior", "Comece com direcao em vez de reacao."),
                            ("r2", "Trabalhar em blocos", "Intercale foco intenso e pausa curta."),
                            ("r3", "Encerrar com revisao", "Aprenda com o dia e ajuste prioridades."),
                            ("r4", "Padronizar rotinas", "Decida menos, execute melhor."),
                            ("r5", "Proteger energia", "Sono, pausa e limite sao parte da produtividade."),
                        ],
                    ),
                ),
            ]

        templates_with_steps.append((template, steps))

    return templates_with_steps


def run() -> None:
    db = SessionLocal()
    try:
        items = list(db.scalars(select(ContentItem).where(ContentItem.is_active.is_(True))))

        # Recreate templates and their steps to keep seed idempotent and deterministic.
        db.execute(delete(TrailTemplateStep))
        db.execute(delete(TrailTemplate))
        db.flush()

        created = 0

        starter_templates: list[TrailTemplate] = []
        for career_type in CareerType:
            title_by_type = {
                CareerType.TECH: "Soft Skills para Tecnologia",
                CareerType.DESIGN: "Soft Skills para Design",
                CareerType.MARKETING: "Soft Skills para Marketing",
                CareerType.SALES: "Soft Skills para Vendas",
                CareerType.FINANCE: "Soft Skills para Financas",
                CareerType.OPERATIONS: "Soft Skills para Operacoes",
                CareerType.OTHER: "Soft Skills Essenciais de Carreira",
            }
            template = TrailTemplate(
                id=uuid.uuid4(),
                title=title_by_type[career_type],
                description="Trilha base gratuita atribuida automaticamente no onboarding.",
                category="Starter",
                career_type_tags=[career_type.value],
                icon="Sparkles",
                is_starter=True,
                is_active=True,
            )
            db.add(template)
            db.flush()

            for index, item in enumerate(_pick_starter_items(items, career_type)):
                db.add(
                    TrailTemplateStep(
                        trail_template_id=template.id,
                        order_index=index,
                        content_item_id=item.id,
                    )
                )
            starter_templates.append(template)
            created += 1

        for template, template_steps in _build_thematic_catalog(db=db):
            for index, item in enumerate(template_steps):
                db.add(
                    TrailTemplateStep(
                        trail_template_id=template.id,
                        order_index=index,
                        content_item_id=item.id,
                    )
                )
            created += 1

        db.commit()
        print(f"Seed de trail templates concluido. Templates criados: {created}.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
