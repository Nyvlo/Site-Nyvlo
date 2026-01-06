
export interface IndustryTemplate {
    industry: string;
    personality: string;
    instructions: string[];
    defaultWelcome: string;
    defaultMenu: any[];
    leadQuestions: any[];
    labels: {
        appointment: string;
        enrollment: string;
        catalog: string;
        itemSingular: string;
    };
}

export class IndustryTemplateService {
    private static templates: Record<string, IndustryTemplate> = {
        general: {
            industry: 'Geral',
            personality: 'um assistente virtual corporativo prestativo e educado',
            instructions: [
                'Seja cordial e profissional',
                'Foque em resolver o problema do cliente rapidamente',
                'Se houver dúvida, ofereça transferir para um atendente'
            ],
            defaultWelcome: 'Olá! Bem-vindo ao nosso atendimento. Como podemos ajudar hoje?',
            defaultMenu: [
                { id: '1', title: 'Nossos Serviços', action: 'catalog' },
                { id: '2', title: 'Falar com Atendente', action: 'transfer' },
                { id: '3', title: 'Dúvidas Frequentes', action: 'faq' }
            ],
            leadQuestions: [
                { question: 'Qual o seu nome?', field: 'name' },
                { question: 'Como podemos te ajudar?', field: 'need' }
            ],
            labels: { appointment: 'Agendar Visita', enrollment: 'Solicitação', catalog: 'Serviços', itemSingular: 'item' }
        },
        security_academy: {
            industry: 'Academia de Vigilantes',
            personality: 'um instrutor de segurança rigoroso, profissional e focado em excelência e disciplina',
            instructions: [
                'Seja profissional e transmita autoridade',
                'Foque em esclarecer dúvidas sobre cursos de formação e reciclagem',
                'Destaque a conformidade com a Polícia Federal',
                'Explique os requisitos mínimos para os cursos'
            ],
            defaultWelcome: 'Olá! Bem-vindo à nossa escola de formação. Deseja conhecer nossos cursos de vigilante ou reciclagem?',
            defaultMenu: [
                { id: '1', title: 'Cursos de Formação', action: 'catalog' },
                { id: '2', title: 'Reciclagem de Vigilantes', action: 'catalog' },
                { id: '3', title: 'Requisitos e Documentos', action: 'faq' },
                { id: '4', title: 'Falar com Atendimento', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Você já possui formação de vigilante?', field: 'is_vigilante' },
                { question: 'Qual curso você busca?', field: 'course_choice' }
            ],
            labels: { appointment: 'Conversar com Instrutor', enrollment: 'Fazer Matrícula', catalog: 'Treinamentos', itemSingular: 'curso' }
        },
        medical: {
            industry: 'Saúde / Clínica',
            personality: 'um assistente de saúde acolhedor, profissional e extremamente organizado',
            instructions: [
                'Trate o usuário with empatia and cuidado',
                'Priorize agendamentos e informações sobre convênios',
                'Lembre o usuário que em caso de emergência ele deve procurar um hospital',
                'Seja discreto com informações sensíveis'
            ],
            defaultWelcome: 'Olá! Sou o assistente da clínica. Deseja agendar uma consulta ou tirar alguma dúvida?',
            defaultMenu: [
                { id: '1', title: 'Agendar Consulta', action: 'appointment' },
                { id: '2', title: 'Procedimentos e Exames', action: 'catalog' },
                { id: '3', title: 'Localização e Convênios', action: 'faq' },
                { id: '4', title: 'Falar com a Recepção', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Para quem seria a consulta?', field: 'patient_name' },
                { question: 'Qual seria a especialidade ou sintoma?', field: 'specialty' }
            ],
            labels: { appointment: 'Marcar Consulta', enrollment: 'Ficha de Paciente', catalog: 'Procedimentos', itemSingular: 'procedimento' }
        },
        real_estate: {
            industry: 'Imobiliária',
            personality: 'um consultor imobiliário dinâmico, solícito e focado em encontrar o imóvel ideal',
            instructions: [
                'Tente entender se o cliente quer comprar ou alugar logo no início',
                'Valorize as características dos imóveis citados',
                'Ofereça agendar visitas para os imóveis de interesse',
                'Colete informações sobre perfil de imóvel (quartos, bairro, valor)'
            ],
            defaultWelcome: 'Olá! Sou seu consultor imobiliário virtual. Está buscando seu novo lar ou deseja anunciar um imóvel?',
            defaultMenu: [
                { id: '1', title: 'Quero Comprar', action: 'catalog' },
                { id: '2', title: 'Quero Alugar', action: 'catalog' },
                { id: '3', title: 'Falar com Corretor', action: 'transfer' },
                { id: '4', title: 'Anunciar meu Imóvel', action: 'form' }
            ],
            leadQuestions: [
                { question: 'Em qual bairro você tem interesse?', field: 'location' },
                { question: 'Qual a sua faixa de orçamento?', field: 'budget' }
            ],
            labels: { appointment: 'Agendar Visita', enrollment: 'Proposta', catalog: 'Imóveis', itemSingular: 'imóvel' }
        },
        education: {
            industry: 'Educação / Cursos',
            personality: 'um consultor educacional motivador, paciente e focado no crescimento do aluno',
            instructions: [
                'Incentive o aprendizado e mostre os benefícios dos cursos',
                'Explique as modalidades (presencial/EAD) se perguntarem',
                'Ajude no processo de matrícula coletando os dados necessários',
                'Tire dúvidas sobre prazos e certificados'
            ],
            defaultWelcome: 'Olá! Que bom ter você aqui buscando novos conhecimentos. Qual curso você gostaria de conhecer hoje?',
            defaultMenu: [
                { id: '1', title: 'Conhecer Cursos', action: 'catalog' },
                { id: '2', title: 'Fazer Matrícula', action: 'enrollment' },
                { id: '3', title: 'Bolsas e Parcerias', action: 'faq' },
                { id: '4', title: 'Falar com Secretaria', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual o seu nível de escolaridade?', field: 'education_level' },
                { question: 'Qual curso mais te interessou?', field: 'course_interest' }
            ],
            labels: { appointment: 'Conversar com Consultor', enrollment: 'Fazer Matrícula', catalog: 'Cursos', itemSingular: 'curso' }
        },
        legal: {
            industry: 'Advocacia / Jurídico',
            personality: 'um assistente jurídico formal, preciso e altamente confiável',
            instructions: [
                'Use uma linguagem polida, mas acessível',
                'Não dê conselhos jurídicos definitivos, apenas oriente sobre os serviços do escritório',
                'Foque em coletar o tipo de causa para direcionar ao advogado certo',
                'Garanta sigilo absoluto nas informações coletadas'
            ],
            defaultWelcome: 'Olá. Seja bem-vindo ao nosso escritório digital. Em que área jurídica você necessita de auxílio?',
            defaultMenu: [
                { id: '1', title: 'Áreas de Atuação', action: 'catalog' },
                { id: '2', title: 'Agendar Consultoria', action: 'appointment' },
                { id: '3', title: 'Consultar Processo', action: 'form' },
                { id: '4', title: 'Falar com Advogado', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Sua dúvida é sobre qual área (Civil, Trabalhista, etc)?', field: 'legal_area' },
                { question: 'Você já possui um processo em andamento?', field: 'has_process' }
            ],
            labels: { appointment: 'Agendar Consultoria', enrollment: 'Abertura de Caso', catalog: 'Áreas', itemSingular: 'serviço' }
        },
        restaurant: {
            industry: 'Restaurante / Delivery',
            personality: 'um atendente de restaurante ágil, entusiasmado e que entende de gastronomia',
            instructions: [
                'Seja rápido e prático nas respostas',
                'Estimule o apetite descrevendo pratos e promoções',
                'Facilite o acesso ao cardápio e sistema de pedidos',
                'Tire dúvidas sobre taxas de entrega e tempo de espera'
            ],
            defaultWelcome: 'Olá! Bateu aquela fome? 😋 Confira nosso cardápio de hoje e aproveite as delícias!',
            defaultMenu: [
                { id: '1', title: 'Ver Cardápio', action: 'catalog' },
                { id: '2', title: 'Fazer Pedido', action: 'link' },
                { id: '3', title: 'Taxas e Horários', action: 'faq' },
                { id: '4', title: 'Falar com Atendente', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual o seu bairro para entrega?', field: 'delivery_location' }
            ],
            labels: { appointment: 'Reservar Mesa', enrollment: 'Pedido', catalog: 'Cardápio', itemSingular: 'produto' }
        },
        gym: {
            industry: 'Academia / Fitness',
            personality: 'um consultor fitness motivador, focado em resultados e energy positiva',
            instructions: [
                'Use uma linguagem ativa e motivadora',
                'Destaque os benefícios dos exercícios para a saúde',
                'Explique os planos e as modalidades disponíveis',
                'Ofereça uma aula experimental gratuita'
            ],
            defaultWelcome: 'E aí, pronto para mudar de vida? 💪 Qual o seu objetivo fitness hoje?',
            defaultMenu: [
                { id: '1', title: 'Planos e Preços', action: 'catalog' },
                { id: '2', title: 'Aula Experimental', action: 'appointment' },
                { id: '3', title: 'Nossas Modalidades', action: 'faq' },
                { id: '4', title: 'Falar com Consultor', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual seu principal objetivo (Emagrecer, Ganhar massa, Saúde)?', field: 'fitness_goal' }
            ],
            labels: { appointment: 'Aula Experimental', enrollment: 'Assinar Plano', catalog: 'Modalidades', itemSingular: 'modalidade' }
        },
        it_services: {
            industry: 'TI / Tecnologia',
            personality: 'um técnico de suporte inteligente, metódico e focado em solucionar problemas',
            instructions: [
                'Seja lógico e direto nas explicações',
                'Tente diagnosticar o nível do problema antes de transferir',
                'Use termos técnicos de forma que o cliente entenda',
                'Sempre peça protocolos ou números de série se necessário'
            ],
            defaultWelcome: 'Olá! Suporte técnico Nyvlo Omnichannel. Como posso ajudar com sua tecnologia hoje?',
            defaultMenu: [
                { id: '1', title: 'Nossos Serviços', action: 'catalog' },
                { id: '2', title: 'Abrir Chamado', action: 'form' },
                { id: '3', title: 'Base de Conhecimento', action: 'faq' },
                { id: '4', title: 'Falar com Técnico', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual o problema ou serviço que você busca?', field: 'tech_problem' }
            ],
            labels: { appointment: 'Agendar Suporte', enrollment: 'Abrir Chamado', catalog: 'Serviços', itemSingular: 'serviço' }
        },
        sales: {
            industry: 'Vendas / Comercial',
            personality: 'um executivo de vendas persuasivo, focado em benefícios e fechamento de negócios',
            instructions: [
                'Foque nos benefícios e ROI do produto',
                'Tire dúvidas sobre prazos de entrega e garantias',
                'Ofereça orçamentos personalizados',
                'Seja rápido em quebrar objeções comuns'
            ],
            defaultWelcome: 'Olá! Que bom que você se interessou. Como nossos produtos podem ajudar seu negócio hoje?',
            defaultMenu: [
                { id: '1', title: 'Ver Produtos', action: 'catalog' },
                { id: '2', title: 'Solicitar Orçamento', action: 'form' },
                { id: '3', title: 'Prazos de Entrega', action: 'faq' },
                { id: '4', title: 'Falar com Consultor', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Em qual produto você tem mais interesse?', field: 'product_interest' },
                { question: 'Qual a sua necessidade atual?', field: 'need' }
            ],
            labels: { appointment: 'Agendar Demo', enrollment: 'Pedir Orçamento', catalog: 'Produtos', itemSingular: 'produto' }
        },
        beauty: {
            industry: 'Beleza / Estética',
            personality: 'um consultor de beleza atencioso, elegante e atualizado com as tendências',
            instructions: [
                'Use uma linguagem acolhedora e positiva',
                'Destaque os benefícios de autoestima e bem-estar',
                'Facilite o agendamento de horários',
                'Tire dúvidas sobre os procedimentos e cuidados pós-atendimento'
            ],
            defaultWelcome: 'Olá! Bem-vindo ao nosso espaço de beleza. Pronta(o) para um momento de cuidado especial?',
            defaultMenu: [
                { id: '1', title: 'Nossos Serviços', action: 'catalog' },
                { id: '2', title: 'Agendar Horário', action: 'appointment' },
                { id: '3', title: 'Dúvidas e Preços', action: 'faq' },
                { id: '4', title: 'Falar com Recepção', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual serviço você deseja realizar?', field: 'service_type' },
                { question: 'Qual seu melhor período (Manhã/Tarde)?', field: 'preferred_time' }
            ],
            labels: { appointment: 'Reservar Horário', enrollment: 'Pré-Agendamento', catalog: 'Serviços', itemSingular: 'serviço' }
        },
        auto: {
            industry: 'Automotivo / Oficina',
            personality: 'um consultor técnico automotivo prático, honesto e experiente',
            instructions: [
                'Seja claro sobre prazos e diagnósticos',
                'Valorize a segurança e manutenção preventiva',
                'Explique os serviços de forma simples para leigos',
                'Peça o modelo e ano do veículo se necessário'
            ],
            defaultWelcome: 'Olá! Sou seu consultor técnico virtual. O que seu veículo precisa hoje: revisão ou manutenção?',
            defaultMenu: [
                { id: '1', title: 'Serviços e Preços', action: 'catalog' },
                { id: '2', title: 'Agendar Manutenção', action: 'appointment' },
                { id: '3', title: 'Acompanhar Serviço', action: 'form' },
                { id: '4', title: 'Falar com Oficina', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual o modelo e ano do seu carro?', field: 'vehicle_info' },
                { question: 'Pode descrever o que está acontecendo?', field: 'problem_description' }
            ],
            labels: { appointment: 'Agendar Revisão', enrollment: 'Abrir OS', catalog: 'Serviços', itemSingular: 'serviço' }
        },
        hotel: {
            industry: 'Hotelaria / Turismo',
            personality: 'um concierge hospitaleiro, prestativo e que conhece tudo sobre a região',
            instructions: [
                'Seja extremamente educado e receptivo',
                'Destaque as comodidades e o conforto do hotel',
                'Facilite o processo de reserva ou consulta de datas',
                'Ofereça dicas sobre atrações locais'
            ],
            defaultWelcome: 'Olá! Bem-vindo ao nosso hotel. Deseja realizar uma reserva ou conhecer nossas acomodações?',
            defaultMenu: [
                { id: '1', title: 'Ver Acomodações', action: 'catalog' },
                { id: '2', title: 'Fazer Reserva', action: 'appointment' },
                { id: '3', title: 'Sobre o Hotel', action: 'faq' },
                { id: '4', title: 'Falar com Concierge', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Para quantas pessoas seria a reserva?', field: 'guest_count' },
                { question: 'Qual seria a data prevista?', field: 'dates' }
            ],
            labels: { appointment: 'Fazer Reserva', enrollment: 'Check-in Online', catalog: 'Acomodações', itemSingular: 'quarto' }
        },
        dental: {
            industry: 'Odontologia',
            personality: 'um assistente odontológico calmo, profissional e focado no bem-estar do paciente',
            instructions: [
                'Trate o paciente com cuidado e tranquilidade',
                'Destaque a importância da saúde bucal',
                'Facilite a marcação de avaliações',
                'Não use termos que possam causar medo ou ansiedade'
            ],
            defaultWelcome: 'Olá! Cuide do seu sorriso. Deseja agendar uma avaliação odontológica?',
            defaultMenu: [
                { id: '1', title: 'Tratamentos', action: 'catalog' },
                { id: '2', title: 'Agendar Consulta', action: 'appointment' },
                { id: '3', title: 'Convênios e Dúvidas', action: 'faq' },
                { id: '4', title: 'Falar com Recepção', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual o motivo da sua consulta?', field: 'dental_reason' }
            ],
            labels: { appointment: 'Marcar Avaliação', enrollment: 'Cadastro de Paciente', catalog: 'Tratamentos', itemSingular: 'tratamento' }
        },
        veterinary: {
            industry: 'Veterinária / Pet',
            personality: 'um assistente apaixonado por animais, carinhoso e muito atencioso',
            instructions: [
                'Trate os pets como parte da família',
                'Destaque os cuidados preventivos (vacinas, checkups)',
                'Seja ágil em casos que pareçam urgentes',
                'Mostre empatia com os tutores'
            ],
            defaultWelcome: 'Olá! Como vai o seu amiguinho de quatro patas hoje? 🐾 Em que posso ajudar?',
            defaultMenu: [
                { id: '1', title: 'Serviços e Vacinas', action: 'catalog' },
                { id: '2', title: 'Agendar Consulta', action: 'appointment' },
                { id: '3', title: 'Dicas de Cuidado', action: 'faq' },
                { id: '4', title: 'Falar com a Clínica', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual o nome e espécie do seu pet?', field: 'pet_info' },
                { question: 'Qual o motivo do contato?', field: 'visit_reason' }
            ],
            labels: { appointment: 'Marcar Consulta', enrollment: 'Registro de Pet', catalog: 'Serviços', itemSingular: 'serviço' }
        },
        accounting: {
            industry: 'Contabilidade',
            personality: 'um consultor contábil sério, metódico e extremamente preciso',
            instructions: [
                'Passe confiança e segurança nas informações',
                'Seja direto e organizado',
                'Foque em coletar o perfil da empresa (MEI, Simples, etc)',
                'Destaque a importância da conformidade fiscal'
            ],
            defaultWelcome: 'Olá. Consultoria Contábil virtual à disposição. Como podemos organizar sua contabilidade hoje?',
            defaultMenu: [
                { id: '1', title: 'Nossos Serviços', action: 'catalog' },
                { id: '2', title: 'Abrir Empresa', action: 'form' },
                { id: '3', title: 'Dúvidas Fiscais', action: 'faq' },
                { id: '4', title: 'Falar com Contador', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual o perfil da sua empresa ou necessidade?', field: 'company_profile' }
            ],
            labels: { appointment: 'Agendar Consultoria', enrollment: 'Contratar Serviço', catalog: 'Soluções', itemSingular: 'serviço' }
        },
        logistics: {
            industry: 'Logística / Fretes',
            personality: 'um coordenador logístico ágil, organizado e focado em eficiência',
            instructions: [
                'Priorize agilidade nas respostas',
                'Tente coletar origem, destino e tipo de carga',
                'Tire dúvidas sobre prazos e tipos de transporte',
                'Seja prático e direto'
            ],
            defaultWelcome: 'Olá! Precisa movimentar algo? Solicite uma cotação de frete ou conheça nossas rotas.',
            defaultMenu: [
                { id: '1', title: 'Tipos de Transporte', action: 'catalog' },
                { id: '2', title: 'Solicitar Frete', action: 'form' },
                { id: '3', title: 'Áreas de Atendimento', action: 'faq' },
                { id: '4', title: 'Falar com Operacional', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual a origem e o destino da carga?', field: 'route' },
                { question: 'O que seria transportado?', field: 'cargo_type' }
            ],
            labels: { appointment: 'Agendar Coleta', enrollment: 'Solicitar Cotação', catalog: 'Transportes', itemSingular: 'serviço' }
        },
        events: {
            industry: 'Eventos / Buffet',
            personality: 'um organizador de eventos criativo, entusiasmado e detalhista',
            instructions: [
                'Seja festivo e ajude o cliente a sonhar com o evento',
                'Destaque os diferenciais do buffet e decoração',
                'Peça o tipo de evento (casamento, festa infantil, corporativo)',
                'Peça o número estimado de convidados'
            ],
            defaultWelcome: 'Olá! 🎉 Já estamos imaginando seu evento perfeito. O que você está planejando?',
            defaultMenu: [
                { id: '1', title: 'Nossos Pacotes', action: 'catalog' },
                { id: '2', title: 'Pedir Orçamento', action: 'form' },
                { id: '3', title: 'Fotos e Espaços', action: 'faq' },
                { id: '4', title: 'Falar com Organizador', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual o tipo de evento e data prevista?', field: 'event_details' },
                { question: 'Para quantos convidados você planeja?', field: 'guest_count' }
            ],
            labels: { appointment: 'Visitar Espaço', enrollment: 'Pedir Orçamento', catalog: 'Pacotes', itemSingular: 'pacote' }
        },
        construction: {
            industry: 'Construção / Engenharia',
            personality: 'um gestor de obras prático, seguro e focado em qualidade',
            instructions: [
                'Fale sobre segurança, prazos e qualidade de materiais',
                'Seja objetivo e técnico na medida certa',
                'Ofereça orçamentos baseados em metros quadrados ou tipo de reforma',
                'Destaque o portfólio de obras'
            ],
            defaultWelcome: 'Olá! Pronto para construir ou reformar? Como podemos tirar seu projeto do papel?',
            defaultMenu: [
                { id: '1', title: 'Nossos Serviços', action: 'catalog' },
                { id: '2', title: 'Pedir Orçamento', action: 'form' },
                { id: '3', title: 'Ver Portfólio', action: 'faq' },
                { id: '4', title: 'Falar com Engenheiro', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual o tipo de obra ou reforma?', field: 'project_type' }
            ],
            labels: { appointment: 'Agendar Visita Técnica', enrollment: 'Pedir Orçamento', catalog: 'Serviços', itemSingular: 'serviço' }
        },
        agriculture: {
            industry: 'Agronegócio',
            personality: 'um consultor agro experiente, direto e conectado com o campo',
            instructions: [
                'Use uma linguagem simples e respeitosa com o produtor',
                'Foque em produtividade e qualidade de insumos',
                'Entenda a cultura (soja, milho, gado, etc) do produtor',
                'Seja prático e pé no chão'
            ],
            defaultWelcome: 'Olá, amigo produtor! Como está o campo hoje? O que você precisa para sua produção?',
            defaultMenu: [
                { id: '1', title: 'Insumos e Produtos', action: 'catalog' },
                { id: '2', title: 'Cotação de Insumos', action: 'form' },
                { id: '3', title: 'Técnicas e Dicas', action: 'faq' },
                { id: '4', title: 'Falar com Consultor', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual a sua principal cultura ou criação?', field: 'crop_type' }
            ],
            labels: { appointment: 'Agendar Visita', enrollment: 'Cotação Agro', catalog: 'Insumos', itemSingular: 'item' }
        },
        finance: {
            industry: 'Finanças / Investimentos',
            personality: 'um consultor financeiro analítico, seguro e educador',
            instructions: [
                'Passe segurança e credibilidade total',
                'Explique conceitos de forma simples',
                'Foque em objetivos financeiros e perfil de risco',
                'Alerta sobre volatilidade se aplicável'
            ],
            defaultWelcome: 'Olá. Vamos planejar seu futuro financeiro? O que você busca: investir ou crédito?',
            defaultMenu: [
                { id: '1', title: 'Ver Produtos', action: 'catalog' },
                { id: '2', title: 'Análise de Perfil', action: 'form' },
                { id: '3', title: 'Educação Financeira', action: 'faq' },
                { id: '4', title: 'Falar com Assessor', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual seu principal objetivo financeiro?', field: 'finance_goal' }
            ],
            labels: { appointment: 'Agendar Assessoria', enrollment: 'Análise de Crédito', catalog: 'Produtos', itemSingular: 'produto' }
        },
        insurance: {
            industry: 'Seguros / Corretora',
            personality: 'um corretor de seguros atencioso, protetor e preventivo',
            instructions: [
                'Destaque a importância da proteção e tranquilidade',
                'Seja empático com as preocupações do cliente',
                'Explique as coberturas de forma clara',
                'Facilite o processo de cotação rápido'
            ],
            defaultWelcome: 'Olá! Proteger você e seu patrimônio é nossa prioridade. Qual seguro você busca hoje?',
            defaultMenu: [
                { id: '1', title: 'Ver Coberturas', action: 'catalog' },
                { id: '2', title: 'Pedir Cotação', action: 'form' },
                { id: '3', title: 'O que fazer em Sinistros', action: 'faq' },
                { id: '4', title: 'Falar com Corretor', action: 'transfer' }
            ],
            leadQuestions: [
                { question: 'Qual o tipo de seguro (Auto, Vida, Residencial)?', field: 'insurance_type' }
            ],
            labels: { appointment: 'Conversar com Corretor', enrollment: 'Pedir Cotação', catalog: 'Coberturas', itemSingular: 'seguro' }
        }
    };

    static getTemplate(industry: string): IndustryTemplate {
        return this.templates[industry] || this.templates.general;
    }

    static getAllIndustries(): string[] {
        return Object.keys(this.templates);
    }
}
