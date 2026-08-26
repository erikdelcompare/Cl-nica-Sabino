// Configuração central da clínica.
// Todos os dados abaixo refletem apenas informações confirmadas
// (perfil oficial do Instagram, localização e materiais fornecidos pela clínica).
// Nada aqui deve ser preenchido com dados não verificados (CRM, CNPJ, horários, etc.).

// TODO: atualizar para o domínio real assim que o site for publicado.
export const SITE_URL = 'https://www.sabinoespecialidades.com.br'

export const CLINIC = {
  name: 'Sabino Especialidades Médicas',
  city: 'São Gabriel do Oeste',
  state: 'MS',
  addressLine: 'Rua João Evangelista Rosa, 742 — Centro',
  addressCity: 'São Gabriel do Oeste — MS',
  postalCode: '79490-000',
  fullAddress: 'Rua João Evangelista Rosa, 742, Centro, São Gabriel do Oeste - MS, 79490-000',
  whatsappNumber: '556732954013',
  whatsappDisplay: '+55 67 3295-4013',
  instagramHandle: '@clinicasabino',
  instagramUrl: 'https://www.instagram.com/clinicasabino/',
  doctorName: 'Dr. Clodoaldo Sabino da Silva',
  doctorSpecialty: 'Pediatria e Neonatologia',
  doctorExperience: 'Mais de 27 anos de experiência',
}

const MAPS_QUERY = encodeURIComponent(CLINIC.fullAddress)

export const MAPS_EMBED_URL = `https://www.google.com/maps?q=${MAPS_QUERY}&output=embed`
export const MAPS_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${CLINIC.whatsappNumber}?text=${encodeURIComponent(message)}`
}

export const WHATSAPP_MESSAGES = {
  default:
    'Olá! Encontrei o site da Sabino Especialidades Médicas e gostaria de informações sobre atendimento/agendamento.',
  pediatria: 'Olá! Gostaria de agendar uma consulta pediátrica na Sabino Especialidades Médicas.',
  exames:
    'Olá! Gostaria de consultar a disponibilidade de exames laboratoriais na Sabino Especialidades Médicas.',
  localizacao: 'Olá! Gostaria de agendar um atendimento na Sabino Especialidades Médicas.',
  final: 'Olá! Encontrei o site da Sabino Especialidades Médicas e gostaria de falar sobre um atendimento.',
}

export const NAV_LINKS = [
  { label: 'Início', href: '#inicio' },
  { label: 'A Clínica', href: '#clinica' },
  { label: 'Especialidades', href: '#pediatria' },
  { label: 'Exames', href: '#exames' },
  { label: 'Localização', href: '#localizacao' },
  { label: 'Contato', href: '#contato' },
]
