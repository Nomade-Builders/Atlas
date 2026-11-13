export type Severity = 'Crítico' | 'Alto' | 'Moderado' | 'Baixo'
export type EventStatus = 'Aberto' | 'Em atendimento' | 'Resolvido'
export type Category = 'Chuva' | 'Calor' | 'Alagamentos' | 'Incêndios' | 'Fumaça' | 'Seca' | 'Acidentes' | 'Mobilidade'

export type IncidentEvent = {
  id: string
  category: Category
  title: string
  description: string
  municipalityCode: string
  city: string
  state: string
  stateName: string
  lat: number
  lng: number
  observedAt: string
  severity: Severity
  status: EventStatus
  source: string
  metric: string
  history: { timestamp: string; title: string; detail: string }[]
}

type EventSeed = Omit<IncidentEvent, 'history' | 'source'>

function event(seed: EventSeed): IncidentEvent {
  const observedAt = Date.parse(seed.observedAt)
  return {
    ...seed,
    source: 'Registro sintético local',
    history: [
      {
        timestamp: new Date(observedAt - 12 * 60_000).toISOString(),
        title: 'Sinal demonstrativo recebido',
        detail: 'Evento gerado localmente para validar filtros, mapas e a linha do tempo.',
      },
      {
        timestamp: seed.observedAt,
        title: seed.status === 'Resolvido' ? 'Evento marcado como resolvido' : 'Classificação atualizada',
        detail: `Severidade ${seed.severity.toLowerCase()} · categoria ${seed.category.toLowerCase()}.`,
      },
    ],
  }
}

export const DEMO_END = '2026-11-12T18:00:00-03:00'
export const DEMO_END_MS = Date.parse(DEMO_END)

export const incidents: IncidentEvent[] = [
  event({ id: 'atl-1001', category: 'Incêndios', title: 'Foco de calor próximo à área de preservação', description: 'Ponto térmico sintético com acompanhamento de vento e umidade na região metropolitana.', municipalityCode: '1302603', city: 'Manaus', state: 'AM', stateName: 'Amazonas', lat: -3.119, lng: -60.021, observedAt: '2026-11-12T17:52:00-03:00', severity: 'Alto', status: 'Em atendimento', metric: 'Índice térmico 0,82' }),
  event({ id: 'atl-1002', category: 'Alagamentos', title: 'Nível de água elevado em área urbana', description: 'Cenário de demonstração para acompanhamento de drenagem e vias próximas.', municipalityCode: '4314902', city: 'Porto Alegre', state: 'RS', stateName: 'Rio Grande do Sul', lat: -30.034, lng: -51.217, observedAt: '2026-11-12T17:34:00-03:00', severity: 'Crítico', status: 'Em atendimento', metric: 'Índice de alagamento 91/100' }),
  event({ id: 'atl-1003', category: 'Calor', title: 'Temperatura acima da faixa de referência', description: 'Leitura simulada acima da faixa prevista para a capital no período da tarde.', municipalityCode: '5300108', city: 'Brasília', state: 'DF', stateName: 'Distrito Federal', lat: -15.794, lng: -47.882, observedAt: '2026-11-12T16:58:00-03:00', severity: 'Alto', status: 'Aberto', metric: '34,8 °C · cenário sintético' }),
  event({ id: 'atl-1004', category: 'Chuva', title: 'Precipitação intensa em janela curta', description: 'Acúmulo de chuva simulado em três horas; camada local pode ser ligada no menu de mapa.', municipalityCode: '2611606', city: 'Recife', state: 'PE', stateName: 'Pernambuco', lat: -8.054, lng: -34.881, observedAt: '2026-11-12T16:31:00-03:00', severity: 'Moderado', status: 'Aberto', metric: '42 mm/3h · cenário sintético' }),
  event({ id: 'atl-1005', category: 'Acidentes', title: 'Colisão com bloqueio parcial de via', description: 'Ocorrência viária fictícia usada para demonstrar a navegação do feed ao marcador.', municipalityCode: '3550308', city: 'São Paulo', state: 'SP', stateName: 'São Paulo', lat: -23.5505, lng: -46.6333, observedAt: '2026-11-12T16:12:00-03:00', severity: 'Alto', status: 'Em atendimento', metric: '2 faixas · dado simulado' }),
  event({ id: 'atl-1006', category: 'Chuva', title: 'Faixa de chuva moderada sobre a região metropolitana', description: 'Área de precipitação demonstrativa, sem conexão com sensores ou serviços externos.', municipalityCode: '1501402', city: 'Belém', state: 'PA', stateName: 'Pará', lat: -1.4558, lng: -48.4902, observedAt: '2026-11-12T15:44:00-03:00', severity: 'Moderado', status: 'Aberto', metric: '27 mm/3h · cenário sintético' }),
  event({ id: 'atl-1007', category: 'Fumaça', title: 'Concentração de partículas em observação', description: 'Leitura ambiental fictícia apresentada apenas como demonstração do painel.', municipalityCode: '1200401', city: 'Rio Branco', state: 'AC', stateName: 'Acre', lat: -9.9754, lng: -67.8249, observedAt: '2026-11-12T14:36:00-03:00', severity: 'Alto', status: 'Em atendimento', metric: '58 µg/m³ · cenário sintético' }),
  event({ id: 'atl-1008', category: 'Seca', title: 'Umidade do solo abaixo da faixa demonstrativa', description: 'Ponto sintético de seca para compor a visualização temporal de camadas.', municipalityCode: '5103403', city: 'Cuiabá', state: 'MT', stateName: 'Mato Grosso', lat: -15.601, lng: -56.0974, observedAt: '2026-11-12T12:15:00-03:00', severity: 'Moderado', status: 'Aberto', metric: 'Índice de seca 66/100' }),
  event({ id: 'atl-1009', category: 'Incêndios', title: 'Foco térmico em área rural', description: 'Foco sintético com severidade alta para testar seleção por estado e período.', municipalityCode: '5002704', city: 'Campo Grande', state: 'MS', stateName: 'Mato Grosso do Sul', lat: -20.4697, lng: -54.6201, observedAt: '2026-11-11T20:42:00-03:00', severity: 'Alto', status: 'Em atendimento', metric: 'Índice térmico 0,76' }),
  event({ id: 'atl-1010', category: 'Chuva', title: 'Acúmulo de chuva em zona urbana', description: 'Registro local fictício; os limites geográficos do mapa são dados estáticos do IBGE.', municipalityCode: '3106200', city: 'Belo Horizonte', state: 'MG', stateName: 'Minas Gerais', lat: -19.9167, lng: -43.9345, observedAt: '2026-11-11T19:18:00-03:00', severity: 'Moderado', status: 'Resolvido', metric: '31 mm/3h · cenário sintético' }),
  event({ id: 'atl-1011', category: 'Alagamentos', title: 'Ponto de atenção junto a curso d’água', description: 'Ocorrência simulada de nível elevado para validar filtros de água e gravidade.', municipalityCode: '4106902', city: 'Curitiba', state: 'PR', stateName: 'Paraná', lat: -25.4284, lng: -49.2733, observedAt: '2026-11-10T17:25:00-03:00', severity: 'Moderado', status: 'Resolvido', metric: 'Índice de alagamento 54/100' }),
  event({ id: 'atl-1012', category: 'Calor', title: 'Sequência de tardes quentes em acompanhamento', description: 'Série de calor fictícia usada pelo controle de reprodução temporal.', municipalityCode: '2211001', city: 'Teresina', state: 'PI', stateName: 'Piauí', lat: -5.0892, lng: -42.8016, observedAt: '2026-11-09T14:05:00-03:00', severity: 'Alto', status: 'Resolvido', metric: '36,1 °C · cenário sintético' }),
  event({ id: 'atl-1013', category: 'Chuva', title: 'Precipitação persistente em setor costeiro', description: 'Conjunto sintético de chuva distribuído ao longo de algumas horas.', municipalityCode: '2927408', city: 'Salvador', state: 'BA', stateName: 'Bahia', lat: -12.9777, lng: -38.5016, observedAt: '2026-11-09T11:12:00-03:00', severity: 'Moderado', status: 'Resolvido', metric: '24 mm/3h · cenário sintético' }),
  event({ id: 'atl-1014', category: 'Mobilidade', title: 'Desvio temporário em corredor urbano', description: 'Item fictício de mobilidade; selecione-o para percorrer o mesmo fluxo do mapa.', municipalityCode: '3304557', city: 'Rio de Janeiro', state: 'RJ', stateName: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, observedAt: '2026-11-08T13:16:00-03:00', severity: 'Baixo', status: 'Resolvido', metric: '1 corredor · dado simulado' }),
  event({ id: 'atl-1015', category: 'Fumaça', title: 'Pluma de fumaça em observação', description: 'Camada de dispersão representativa, sem telemetria ou dados externos.', municipalityCode: '1100205', city: 'Porto Velho', state: 'RO', stateName: 'Rondônia', lat: -8.7612, lng: -63.9004, observedAt: '2026-11-07T12:30:00-03:00', severity: 'Moderado', status: 'Resolvido', metric: '41 µg/m³ · cenário sintético' }),
  event({ id: 'atl-1016', category: 'Seca', title: 'Baixa umidade em área de monitoramento', description: 'Amostra de seca sintética para demonstrar a legenda por categoria.', municipalityCode: '5208707', city: 'Goiânia', state: 'GO', stateName: 'Goiás', lat: -16.6869, lng: -49.2648, observedAt: '2026-11-06T15:35:00-03:00', severity: 'Moderado', status: 'Resolvido', metric: 'Índice de seca 52/100' }),
  event({ id: 'atl-1017', category: 'Incêndios', title: 'Foco térmico em monitoramento local', description: 'Sinal fictício em Roraima para demonstrar a cobertura regional do painel.', municipalityCode: '1400100', city: 'Boa Vista', state: 'RR', stateName: 'Roraima', lat: 2.8235, lng: -60.6758, observedAt: '2026-11-06T11:20:00-03:00', severity: 'Alto', status: 'Resolvido', metric: 'Índice térmico 0,69' }),
  event({ id: 'atl-1018', category: 'Chuva', title: 'Chuva localizada em acompanhamento', description: 'Registro sintético na região sul, disponível na sequência de sete dias.', municipalityCode: '4205407', city: 'Florianópolis', state: 'SC', stateName: 'Santa Catarina', lat: -27.5949, lng: -48.5482, observedAt: '2026-11-05T09:40:00-03:00', severity: 'Baixo', status: 'Resolvido', metric: '18 mm/3h · cenário sintético' }),
  event({ id: 'atl-1019', category: 'Incêndios', title: 'Calor detectado em área de vegetação', description: 'Ocorrência fictícia adicionada à série local para testar a progressão temporal.', municipalityCode: '1506807', city: 'Santarém', state: 'PA', stateName: 'Pará', lat: -2.4506, lng: -54.7082, observedAt: '2026-11-04T16:20:00-03:00', severity: 'Moderado', status: 'Resolvido', metric: 'Índice térmico 0,53' }),
  event({ id: 'atl-1020', category: 'Acidentes', title: 'Veículo imobilizado em via de acesso', description: 'Registro viário totalmente demonstrativo, sem conexão com sistemas de trânsito.', municipalityCode: '2111300', city: 'São Luís', state: 'MA', stateName: 'Maranhão', lat: -2.5307, lng: -44.3068, observedAt: '2026-11-02T16:10:00-03:00', severity: 'Moderado', status: 'Resolvido', metric: '1 veículo · dado simulado' }),
]

export const categoryOptions: ('Todas' | Category)[] = ['Todas', 'Chuva', 'Calor', 'Alagamentos', 'Incêndios', 'Fumaça', 'Seca', 'Acidentes', 'Mobilidade']
export const severityOptions: ('Todas' | Severity)[] = ['Todas', 'Crítico', 'Alto', 'Moderado', 'Baixo']
export const statusOptions: ('Todos' | EventStatus)[] = ['Todos', 'Aberto', 'Em atendimento', 'Resolvido']
export const periodOptions = [
  { id: '1h', label: '1h', durationMs: 60 * 60_000 },
  { id: '24h', label: '24h', durationMs: 24 * 60 * 60_000 },
  { id: '7d', label: '7 dias', durationMs: 7 * 24 * 60 * 60_000 },
] as const
export type PeriodId = (typeof periodOptions)[number]['id']

export const categoryColors: Record<Category, string> = {
  Chuva: '#66b8ff',
  Calor: '#ffc15b',
  Alagamentos: '#54d8cf',
  Incêndios: '#ff795d',
  Fumaça: '#b99aff',
  Seca: '#d5bf73',
  Acidentes: '#fc8fa3',
  Mobilidade: '#9caaff',
}

export type HeatObservation = { id: string; category: Exclude<Category, 'Acidentes' | 'Mobilidade'>; lat: number; lng: number; weight: number; observedAt: string; value: string; uf: string; severity: Severity }

export const heatLayers: {
  category: HeatObservation['category']
  title: string
  unit: string
  range: string
  color: string
  gradient: Record<string, string>
  observations: HeatObservation[]
}[] = [
  { category: 'Chuva', title: 'Precipitação', unit: 'mm / 3h', range: '0–80 mm', color: '#65b9ff', gradient: { '0.2': '#3156bd', '0.55': '#47cfff', '1': '#e7fbff' }, observations: [
    { id: 'r1', category: 'Chuva', lat: -8.05, lng: -34.88, weight: 0.85, observedAt: '2026-11-12T16:31:00-03:00', value: '42 mm', uf: 'PE', severity: 'Moderado' },
    { id: 'r2', category: 'Chuva', lat: -1.46, lng: -48.49, weight: 0.58, observedAt: '2026-11-12T15:44:00-03:00', value: '27 mm', uf: 'PA', severity: 'Moderado' },
    { id: 'r3', category: 'Chuva', lat: -19.92, lng: -43.93, weight: 0.65, observedAt: '2026-11-11T19:18:00-03:00', value: '31 mm', uf: 'MG', severity: 'Moderado' },
    { id: 'r4', category: 'Chuva', lat: -12.98, lng: -38.5, weight: 0.44, observedAt: '2026-11-09T11:12:00-03:00', value: '24 mm', uf: 'BA', severity: 'Moderado' },
    { id: 'r5', category: 'Chuva', lat: -27.59, lng: -48.55, weight: 0.34, observedAt: '2026-11-05T09:40:00-03:00', value: '18 mm', uf: 'SC', severity: 'Baixo' },
  ] },
  { category: 'Calor', title: 'Anomalia térmica', unit: '°C', range: '28–40 °C', color: '#ffc15b', gradient: { '0.2': '#8150a5', '0.55': '#ff9945', '1': '#fff1a6' }, observations: [
    { id: 'h1', category: 'Calor', lat: -15.79, lng: -47.88, weight: 0.76, observedAt: '2026-11-12T16:58:00-03:00', value: '34,8 °C', uf: 'DF', severity: 'Alto' },
    { id: 'h2', category: 'Calor', lat: -5.09, lng: -42.8, weight: 0.88, observedAt: '2026-11-09T14:05:00-03:00', value: '36,1 °C', uf: 'PI', severity: 'Alto' },
    { id: 'h3', category: 'Calor', lat: -15.6, lng: -56.1, weight: 0.7, observedAt: '2026-11-12T12:15:00-03:00', value: '33,4 °C', uf: 'MT', severity: 'Moderado' },
    { id: 'h4', category: 'Calor', lat: -3.12, lng: -60.02, weight: 0.54, observedAt: '2026-11-12T17:52:00-03:00', value: '32,7 °C', uf: 'AM', severity: 'Moderado' },
  ] },
  { category: 'Alagamentos', title: 'Risco hídrico', unit: 'índice / 100', range: '0–100', color: '#56d9d0', gradient: { '0.2': '#236a86', '0.55': '#31c6b8', '1': '#d8fff4' }, observations: [
    { id: 'f1', category: 'Alagamentos', lat: -30.03, lng: -51.22, weight: 0.96, observedAt: '2026-11-12T17:34:00-03:00', value: '91 / 100', uf: 'RS', severity: 'Crítico' },
    { id: 'f2', category: 'Alagamentos', lat: -25.43, lng: -49.27, weight: 0.57, observedAt: '2026-11-10T17:25:00-03:00', value: '54 / 100', uf: 'PR', severity: 'Moderado' },
    { id: 'f3', category: 'Alagamentos', lat: -8.05, lng: -34.88, weight: 0.46, observedAt: '2026-11-12T16:31:00-03:00', value: '44 / 100', uf: 'PE', severity: 'Moderado' },
  ] },
  { category: 'Incêndios', title: 'Focos térmicos', unit: 'índice', range: '0–1', color: '#ff795d', gradient: { '0.2': '#61324d', '0.55': '#fd743b', '1': '#ffda78' }, observations: [
    { id: 'i1', category: 'Incêndios', lat: -3.12, lng: -60.02, weight: 0.92, observedAt: '2026-11-12T17:52:00-03:00', value: '0,82', uf: 'AM', severity: 'Alto' },
    { id: 'i2', category: 'Incêndios', lat: -20.47, lng: -54.62, weight: 0.78, observedAt: '2026-11-11T20:42:00-03:00', value: '0,76', uf: 'MS', severity: 'Alto' },
    { id: 'i3', category: 'Incêndios', lat: 2.82, lng: -60.68, weight: 0.57, observedAt: '2026-11-06T11:20:00-03:00', value: '0,69', uf: 'RR', severity: 'Alto' },
    { id: 'i4', category: 'Incêndios', lat: -2.45, lng: -54.71, weight: 0.42, observedAt: '2026-11-04T16:20:00-03:00', value: '0,53', uf: 'PA', severity: 'Moderado' },
  ] },
  { category: 'Fumaça', title: 'Partículas no ar', unit: 'µg / m³', range: '0–80 µg/m³', color: '#b99aff', gradient: { '0.2': '#443274', '0.55': '#ac80f8', '1': '#ebdcff' }, observations: [
    { id: 's1', category: 'Fumaça', lat: -9.98, lng: -67.82, weight: 0.75, observedAt: '2026-11-12T14:36:00-03:00', value: '58 µg/m³', uf: 'AC', severity: 'Alto' },
    { id: 's2', category: 'Fumaça', lat: -8.76, lng: -63.9, weight: 0.52, observedAt: '2026-11-07T12:30:00-03:00', value: '41 µg/m³', uf: 'RO', severity: 'Moderado' },
  ] },
  { category: 'Seca', title: 'Índice de seca', unit: 'índice / 100', range: '0–100', color: '#d5bf73', gradient: { '0.2': '#61543d', '0.55': '#c4a854', '1': '#f8e6a3' }, observations: [
    { id: 'd1', category: 'Seca', lat: -15.6, lng: -56.1, weight: 0.72, observedAt: '2026-11-12T12:15:00-03:00', value: '66 / 100', uf: 'MT', severity: 'Moderado' },
    { id: 'd2', category: 'Seca', lat: -16.69, lng: -49.26, weight: 0.56, observedAt: '2026-11-06T15:35:00-03:00', value: '52 / 100', uf: 'GO', severity: 'Moderado' },
  ] },
]

export function normaliseText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
}

export function severityWeight(severity: Severity) {
  return { Crítico: 4, Alto: 3, Moderado: 2, Baixo: 1 }[severity]
}

export function relativeTime(timestamp: string, reference = DEMO_END_MS) {
  const deltaMinutes = Math.max(0, Math.floor((reference - Date.parse(timestamp)) / 60_000))
  if (deltaMinutes < 1) return 'agora'
  if (deltaMinutes < 60) return `há ${deltaMinutes} min`
  const hours = Math.floor(deltaMinutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.floor(hours / 24)
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`
}

export function formatDemoTime(timestamp: number) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(timestamp)
}

export function formatDemoDate(timestamp: number) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' }).format(timestamp).replace('.', '').toUpperCase()
}
