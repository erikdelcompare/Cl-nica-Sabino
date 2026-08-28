/**
 * ============================================================================
 *  SABINO ESPECIALIDADES MÉDICAS — FONTE ÚNICA DE DADOS
 * ============================================================================
 *
 *  Todo o conteúdo editável do site vive neste arquivo. Para atualizar o site,
 *  edite aqui — não é preciso mexer nos componentes.
 *
 *  REGRA DE OURO
 *  Campos vazios ('' ou []) simplesmente NÃO são renderizados. Nada de
 *  "[A CONFIRMAR]" aparece para o visitante. Assim é seguro deixar em branco
 *  tudo o que ainda depende de aprovação da clínica.
 *
 *  ┌────────────────────────────────────────────────────────────────────────┐
 *  │ CONFIRMADO — perfil oficial @clinicasabino, materiais da clínica       │
 *  │ A CONFIRMAR — preencher somente após autorização da clínica           │
 *  └────────────────────────────────────────────────────────────────────────┘
 */

/**
 * Enquanto `true`, os espaços de fotografia ainda sem imagem oficial exibem
 * uma legenda discreta explicando que a foto será inserida depois.
 * Antes de publicar a versão final, mude para `false`.
 */
export const showImagePlaceholders = true

/** Domínio final do site. A CONFIRMAR — usado em canonical, Open Graph e sitemap. */
export const SITE_URL = 'https://www.sabinoespecialidades.com.br'

export const clinicData = {
  // ─── Identidade ─────────────────────────────────────────── CONFIRMADO ───
  name: 'Sabino Especialidades Médicas',
  shortName: 'Sabino',
  /** Razão social / registro público relacionado. */
  legalName: 'Sabino Serviços Médicos',
  tagline: 'Cuidando da sua saúde com confiança',

  // ─── Localização ────────────────────────────────────────── CONFIRMADO ───
  address: {
    street: 'Rua João Evangelista Rosa, 742',
    district: 'Centro',
    city: 'São Gabriel do Oeste',
    state: 'MS',
    postalCode: '79490-000',
    /** Referência de localização mencionada pela clínica. */
    reference: 'No Centro da cidade, nas proximidades do Hospital Municipal.',
  },

  // ─── Contato ────────────────────────────────────────────── CONFIRMADO ───
  contact: {
    phone: '(67) 3295-4013',
    /** Somente dígitos, com DDI — usado para montar o link do WhatsApp. */
    whatsapp: '556732954013',
    instagram: '@clinicasabino',
    instagramUrl: 'https://www.instagram.com/clinicasabino/',
    /** A CONFIRMAR — deixe vazio para não renderizar. */
    email: '',
  },

  /**
   * Horários de atendimento. A CONFIRMAR.
   * Ex.: [{ days: 'Segunda a sexta', hours: '07h30 às 18h' }]
   * Lista vazia → a seção de horários não é exibida.
   */
  openingHours: [] as { days: string; hours: string }[],

  /** Convênios aceitos. A CONFIRMAR. Lista vazia → seção não é exibida. */
  insurances: [] as string[],

  // ─── Serviços ───────────────────────────────────────────── CONFIRMADO ───
  // Apresentados publicamente pela própria clínica.
  services: [
    {
      id: 'pediatria',
      title: 'Atendimento Pediátrico',
      description: 'Acompanhamento da saúde infantil em diferentes fases do crescimento.',
    },
    {
      id: 'exames',
      title: 'Exames Laboratoriais',
      description: 'Coleta e orientação sobre exames, com praticidade para a sua rotina.',
    },
  ],

  /**
   * Exames específicos oferecidos. A CONFIRMAR.
   * Não listar nada sem confirmação da clínica.
   */
  examTypes: [] as string[],

  /**
   * Demais especialidades além da pediatria. A CONFIRMAR.
   * A clínica se chama "Especialidades Médicas", mas ainda não há lista
   * confirmada. Enquanto vazia, a seção inteira não é renderizada.
   * Ex.: [{ name: 'Ginecologia', professional: 'Dra. ...', description: '...' }]
   */
  specialties: [] as {
    name: string
    professional?: string
    description?: string
    photo?: string
  }[],

  // ─── Corpo clínico ──────────────────────────────────────────────────────
  /**
   * Somente profissionais com informação verificada.
   * `crm` e `rqe` estão vazios de propósito: A CONFIRMAR com a clínica.
   * Enquanto vazios, não aparecem no site.
   */
  team: [
    {
      id: 'dr-clodoaldo',
      name: 'Dr. Clodoaldo Sabino',
      /** Nome completo conforme referências públicas. */
      fullName: 'Dr. Clodoaldo Sabino da Silva',
      specialty: 'Pediatria', // CONFIRMADO
      /** Referências públicas também relatam atuação em Neonatologia. */
      secondarySpecialty: 'Neonatologia',
      crm: '', // A CONFIRMAR
      rqe: '', // A CONFIRMAR
      photo: '', // A CONFIRMAR — salvar em public/images/team/ e apontar aqui
      bio: 'Médico com trajetória dedicada à Pediatria e ao cuidado infantil, com atendimento voltado ao acompanhamento da saúde das crianças e à orientação das famílias em São Gabriel do Oeste.',
    },
  ],

  /**
   * Anos de experiência em Pediatria.
   * Publicação jornalística local de 2025 relata aproximadamente 27 anos.
   * Deixe `null` até a clínica autorizar o uso — a faixa não é renderizada.
   */
  yearsExperience: null as number | null,

  // ─── Fotografias ────────────────────────────────────────────────────────
  /**
   * Espaços de fotografia do site. Todos vazios: enquanto não houver foto
   * oficial, o site mostra um espaço reservado sóbrio — nunca uma imagem
   * genérica no lugar de uma foto real da clínica.
   *
   * PARA PUBLICAR UMA FOTO
   *   1. salve o arquivo em `public/images/clinic/` (ou `team/`);
   *   2. escreva o caminho no campo correspondente, ex.:
   *        hero: '/images/clinic/hero.jpg'
   *
   * Proporções sugeridas e orientações de fotografia: public/images/README.md
   */
  images: {
    hero: '', // topo da página — 4:5 (vertical)
    reception: '', // seção "A Clínica", imagem principal — 4:5 (vertical)
    consultingRoom: '', // seção "A Clínica", recorte menor — 1:1 (quadrada)
    pediatrics: '', // seção "Pediatria" — 4:5 (vertical)
    laboratory: '', // seção "Exames" — 4:3 (horizontal)
    facade: '', // galeria, imagem larga — 21:9 (panorâmica)
    receptionWide: '', // galeria, inferior esquerda — 3:2 (horizontal)
    consultingRoomWide: '', // galeria, inferior direita — 3:2 (horizontal)
    city: '', // seção "Localização" — 21:9 (panorâmica)
  },

  // ─── Textos institucionais ──────────────────────────────────────────────
  copy: {
    heroEyebrow: 'Sabino Especialidades Médicas',
    heroTitle: 'Cuidado médico com experiência, confiança e atenção.',
    heroSubtitle:
      'Atendimento em saúde com acolhimento e responsabilidade para você e sua família, em São Gabriel do Oeste.',

    aboutEyebrow: 'A Clínica',
    aboutTitle: 'Cuidado que começa pela confiança.',
    aboutParagraphs: [
      'A Sabino Especialidades Médicas atende em São Gabriel do Oeste com uma proposta simples e constante: acompanhar a saúde de cada paciente com atenção, responsabilidade e tempo para ouvir.',
      'O atendimento pediátrico e os exames laboratoriais fazem parte de um mesmo cuidado — do primeiro contato à orientação sobre os resultados, com clareza em cada etapa e proximidade com as famílias da região.',
    ],

    pediatricsEyebrow: 'Pediatria',
    pediatricsTitle: 'Acompanhamento presente em cada fase da infância.',
    pediatricsParagraphs: [
      'As consultas pediátricas acompanham o crescimento e o desenvolvimento da criança ao longo do tempo, com espaço para as dúvidas de quem cuida do dia a dia dela.',
      'O atendimento inclui a avaliação clínica em consulta, o acompanhamento contínuo da saúde infantil e a orientação aos responsáveis, inclusive sobre o calendário de vacinação.',
    ],

    examsEyebrow: 'Exames',
    examsTitle: 'Exames laboratoriais com praticidade e orientação.',
    examsParagraphs: [
      'A clínica reúne a realização de exames laboratoriais e o acompanhamento dos resultados em um mesmo lugar, o que simplifica a rotina de quem precisa investigar ou monitorar a saúde.',
      'Consulte pelo WhatsApp quais exames estão disponíveis e como funciona o preparo antes da coleta.',
    ],

    doctorEyebrow: 'Profissional',

    galleryEyebrow: 'A Estrutura',
    galleryTitle: 'Um espaço preparado para receber você.',
    galleryText:
      'Um ambiente organizado e tranquilo, pensado para que a consulta aconteça com calma — do momento da chegada ao atendimento.',

    locationEyebrow: 'Localização',
    locationTitle: 'Estamos no centro de São Gabriel do Oeste.',

    finalCtaTitle: 'Cuidado e orientação começam por uma boa conversa.',
    finalCtaText:
      'Entre em contato com a Sabino Especialidades Médicas para consultar atendimentos e disponibilidade.',
  },

  /** Pilares institucionais exibidos logo abaixo do hero. */
  pillars: [
    {
      title: 'Atendimento especializado',
      description: 'Cuidado profissional e atenção individualizada em cada consulta.',
    },
    {
      title: 'Experiência em Pediatria',
      description: 'Acompanhamento da saúde infantil em diferentes fases do crescimento.',
    },
    {
      title: 'Atendimento local',
      description: 'Clínica localizada no centro de São Gabriel do Oeste — MS.',
    },
  ],
}

// ─── Derivados ────────────────────────────────────────────────────────────

export const WHATSAPP_MESSAGE =
  'Olá! Encontrei o site da Sabino Especialidades Médicas e gostaria de informações sobre atendimento.'

/** Link do WhatsApp com a mensagem já preenchida e devidamente codificada. */
export function whatsappUrl(message: string = WHATSAPP_MESSAGE): string {
  return `https://wa.me/${clinicData.contact.whatsapp}?text=${encodeURIComponent(message)}`
}

const { street, district, city, state, postalCode } = clinicData.address

/** Endereço em uma linha, para buscas no mapa e dados estruturados. */
export const fullAddress = `${street}, ${district}, ${city} - ${state}, ${postalCode}`

const mapsQuery = encodeURIComponent(fullAddress)
export const mapsEmbedUrl = `https://www.google.com/maps?q=${mapsQuery}&output=embed`
export const mapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`

export const navLinks = [
  { label: 'Clínica', href: '#clinica' },
  { label: 'Pediatria', href: '#pediatria' },
  { label: 'Exames', href: '#exames' },
  { label: 'Profissional', href: '#profissional' },
  { label: 'Localização', href: '#localizacao' },
]
