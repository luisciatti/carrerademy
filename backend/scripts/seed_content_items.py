from __future__ import annotations

from sqlalchemy import select

from app.domain.enums import ContentItemType
from app.domain.models import ContentItem
from app.infra.db.session import SessionLocal


SEED_ITEMS = [
    {"type": ContentItemType.COURSE, "title": "Python para Automacao Profissional", "description": "Curso pratico de automacao com Python para ganhar produtividade no trabalho.", "external_url": "https://example.com/python-automation", "tags": ["python", "automation", "growth", "performance"]},
    {"type": ContentItemType.ARTICLE, "title": "Como Criar um Plano de Carreira Tecnica", "description": "Guia para definir metas trimestrais e mapear lacunas de habilidades.", "external_url": "https://example.com/career-plan", "tags": ["career", "growth", "planning"]},
    {"type": ContentItemType.ACTION_TASK, "title": "Mapear Competencias da Vaga Atual", "description": "Liste as 10 competencias mais exigidas no seu cargo e autoavalie seu nivel.", "external_url": None, "tags": ["growth", "self-assessment", "performance"]},
    {"type": ContentItemType.CERTIFICATION, "title": "AWS Cloud Practitioner", "description": "Certificacao base para validar conhecimento de fundamentos cloud.", "external_url": "https://example.com/aws-cp", "tags": ["cloud", "certification", "growth", "switch"]},
    {"type": ContentItemType.COURSE, "title": "SQL para Analise de Dados", "description": "Curso de SQL com foco em consultas para tomada de decisao.", "external_url": "https://example.com/sql-data", "tags": ["sql", "analytics", "growth"]},
    {"type": ContentItemType.COURSE, "title": "Fundamentos de Product Analytics", "description": "Aprenda metricas de produto e experimentacao orientada a dados.", "external_url": "https://example.com/product-analytics", "tags": ["analytics", "product", "switch", "portfolio"]},
    {"type": ContentItemType.ACTION_TASK, "title": "Projeto de Portfolio: Dashboard de Negocio", "description": "Construa um dashboard completo e publique no GitHub para portfolio.", "external_url": None, "tags": ["portfolio", "switch", "project"]},
    {"type": ContentItemType.ARTICLE, "title": "Como Fazer Networking para Transicao de Carreira", "description": "Estrategias de networking para encontrar oportunidades na nova area.", "external_url": "https://example.com/networking-transition", "tags": ["switch", "networking", "career"]},
    {"type": ContentItemType.COURSE, "title": "Git e GitHub para Mudanca de Carreira", "description": "Controle de versao, colaboracao e boas praticas para portfolio tecnico.", "external_url": "https://example.com/git-github", "tags": ["switch", "portfolio", "github"]},
    {"type": ContentItemType.ACTION_TASK, "title": "Simulacao de Entrevista Tecnica", "description": "Execute 3 simulacoes de entrevista com feedback estruturado.", "external_url": None, "tags": ["interview", "switch", "practice"]},
    {"type": ContentItemType.COURSE, "title": "Ingles para Entrevistas Tecnicas", "description": "Vocabulos e estruturas para entrevistas em ingles no mercado global.", "external_url": "https://example.com/english-interviews", "tags": ["english", "international", "interview", "abroad"]},
    {"type": ContentItemType.ARTICLE, "title": "Preparacao de CV Internacional", "description": "Como adaptar curriculo e perfil para candidaturas globais.", "external_url": "https://example.com/global-cv", "tags": ["international", "remote", "abroad"]},
    {"type": ContentItemType.ACTION_TASK, "title": "Aplicar para 10 Vagas Remotas Internacionais", "description": "Plano semanal de aplicacoes com rastreamento de respostas.", "external_url": None, "tags": ["remote", "international", "abroad"]},
    {"type": ContentItemType.CERTIFICATION, "title": "IELTS Preparation Track", "description": "Preparacao estruturada para certificacao de proficiencia em ingles.", "external_url": "https://example.com/ielts-track", "tags": ["english", "abroad", "certification"]},
    {"type": ContentItemType.ARTICLE, "title": "Guia de Vistos para Profissionais de Tecnologia", "description": "Visao geral de tipos de visto e requisitos mais comuns.", "external_url": "https://example.com/visa-guide", "tags": ["visa", "international", "move-abroad"]},
    {"type": ContentItemType.ACTION_TASK, "title": "Checklist de Documentacao para Relocacao", "description": "Organize documentos essenciais para processos de mudanca internacional.", "external_url": None, "tags": ["relocation", "visa", "planning", "move-abroad"]},
    {"type": ContentItemType.COURSE, "title": "Cultura de Trabalho Global", "description": "Boas praticas de comunicacao e colaboracao em times multiculturais.", "external_url": "https://example.com/global-culture", "tags": ["culture", "international", "move-abroad"]},
    {"type": ContentItemType.ARTICLE, "title": "Planejamento Financeiro para Mudanca de Pais", "description": "Como montar reserva, custo de vida e estrategia de transicao.", "external_url": "https://example.com/relocation-finance", "tags": ["relocation", "planning", "move-abroad"]},
    {"type": ContentItemType.COURSE, "title": "Negociacao Salarial Internacional", "description": "Tecnicas para negociar proposta em moeda estrangeira.", "external_url": "https://example.com/global-salary", "tags": ["international", "career", "move-abroad"]},
    {"type": ContentItemType.ACTION_TASK, "title": "Plano de 90 Dias para Nova Funcao", "description": "Defina objetivos de impacto para os primeiros 90 dias na nova vaga.", "external_url": None, "tags": ["growth", "career", "execution"]},
    {"type": ContentItemType.COURSE, "title": "Storytelling para Entrevistas", "description": "Estruture respostas com metodo STAR para aumentar aprovacoes.", "external_url": "https://example.com/star-storytelling", "tags": ["interview", "switch", "abroad"]},
    {"type": ContentItemType.ARTICLE, "title": "Guia de Portfolio para Profissionais de Dados", "description": "Exemplos de projetos e narrativa para portfolio de dados.", "external_url": "https://example.com/data-portfolio", "tags": ["portfolio", "switch", "growth"]},
    {"type": ContentItemType.CERTIFICATION, "title": "Azure Fundamentals AZ-900", "description": "Certificacao introdutoria para validar base em cloud Azure.", "external_url": "https://example.com/az900", "tags": ["cloud", "certification", "switch", "growth"]},
    {"type": ContentItemType.ACTION_TASK, "title": "Plano Semanal de Estudos 6h", "description": "Template para planejamento semanal de estudos com revisao.", "external_url": None, "tags": ["planning", "growth", "discipline"]},
    {"type": ContentItemType.ARTICLE, "title": "Como Medir Evolucao de Competencias", "description": "Defina indicadores de progresso e checkpoints mensais.", "external_url": "https://example.com/skills-metrics", "tags": ["growth", "metrics", "career"]},
    {"type": ContentItemType.COURSE, "title": "Comunicacao Assincrona para Times Remotos", "description": "Praticas para colaborar bem em empresas globais remotas.", "external_url": "https://example.com/async-communication", "tags": ["remote", "international", "abroad"]},
    {"type": ContentItemType.ACTION_TASK, "title": "Revisao de LinkedIn para Mercado Global", "description": "Atualize headline, about e experiencias com foco internacional.", "external_url": None, "tags": ["international", "networking", "abroad"]},
    {"type": ContentItemType.CERTIFICATION, "title": "Scrum Fundamentals", "description": "Certificacao base para trabalho em times ageis.", "external_url": "https://example.com/scrum-fundamentals", "tags": ["growth", "teamwork", "career"]},
    {"type": ContentItemType.ARTICLE, "title": "Roteiro para Migracao de Area em 6 Meses", "description": "Plano pratico para transicao de carreira em ciclos quinzenais.", "external_url": "https://example.com/six-month-transition", "tags": ["switch", "planning", "career"]},
    {"type": ContentItemType.ACTION_TASK, "title": "Revisao Quinzenal de Progresso", "description": "Cerimonia pessoal para avaliar entregas e ajustar metas.", "external_url": None, "tags": ["growth", "planning", "execution"]},
]


def run() -> None:
    db = SessionLocal()
    try:
        existing_titles = set(db.scalars(select(ContentItem.title)))
        inserted = 0
        updated = 0
        for item in SEED_ITEMS:
            if item["title"] in existing_titles:
                existing = db.scalar(select(ContentItem).where(ContentItem.title == item["title"]))
                if existing is not None:
                    existing.type = item["type"]
                    existing.description = item["description"]
                    existing.external_url = item["external_url"]
                    existing.tags = item["tags"]
                    existing.is_active = True
                    updated += 1
                continue

            db.add(
                ContentItem(
                    type=item["type"],
                    title=item["title"],
                    description=item["description"],
                    external_url=item["external_url"],
                    tags=item["tags"],
                    is_active=True,
                )
            )
            inserted += 1

        db.commit()
        print(f"Seed concluido. Inseridos: {inserted}. Atualizados: {updated}.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
