export type PartnerDeal = {
  dealId: string;
  dealName: string;
  stage: "Reunião realizada" | "Proposta enviada" | "Contrato fechado";
  currentStageLabel?: string;
  activityDate: string;
  reunioesRealizadas: number;
  reunioesPosR1: number;
  propostasEnviadas: number;
  contratosFechados: number;
  tcvPonderado: number;
  faturamentoGalapos: number;
  comissaoPaga: number;
  servicoQualificado?: string;
  servicoEmProposta?: string;
  servicoContratado?: string;
  tcvPonderadoProposta?: number;
};

export type PartnerMetric = {
  parceiro: string;
  tier: "Tier 1" | "Tier 2";
  etapaJornada: string;
  estadoMatriz: string;
  proprietarioParceiro: string;
  contratosFechados: number;
  propostasEnviadas: number;
  reunioesRealizadas: number;
  tcvPonderado: number;
  faturamentoGalapos: number;
  comissaoPaga: number;
  deals: PartnerDeal[];
};

export type ServiceJourneyEvent = {
  dealId: string;
  dealName: string;
  parceiro: string;
  responsavel?: string;
  grupoServico: string;
  metric: "r1" | "postR1" | "proposta" | "contrato";
  activityDate: string;
  currentStageLabel?: string;
};

function splitServiceGroups(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildMockActivityDate(dealId: string) {
  const seed = [...dealId].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const year = seed % 3 === 0 ? 2024 : seed % 3 === 1 ? 2025 : 2026;
  const month = (seed % 12) + 1;
  const day = (seed % 24) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const rawPartnerMetrics: Array<
  Omit<PartnerMetric, "deals" | "etapaJornada" | "estadoMatriz" | "proprietarioParceiro" | "comissaoPaga"> & {
    deals: Array<Omit<PartnerDeal, "activityDate" | "reunioesPosR1" | "comissaoPaga">>;
  }
> = [
  {
    parceiro: "Nippur",
    tier: "Tier 1",
    contratosFechados: 22,
    propostasEnviadas: 31,
    reunioesRealizadas: 74,
    tcvPonderado: 4860000,
    faturamentoGalapos: 1189000,
    deals: [
      { dealId: "NIP-001", dealName: "Marlex | Lei do Bem", stage: "Contrato fechado", reunioesRealizadas: 8, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 1120000, faturamentoGalapos: 324000, servicoContratado: "Lei do Bem" },
      { dealId: "NIP-002", dealName: "Skelt/Creamy | Finep", stage: "Contrato fechado", reunioesRealizadas: 7, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 980000, faturamentoGalapos: 286000, servicoContratado: "Captação via Finep" },
      { dealId: "NIP-003", dealName: "Grupo Fortaleza | Sell Side", stage: "Proposta enviada", reunioesRealizadas: 9, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 710000, faturamentoGalapos: 0, servicoEmProposta: "M&A Sell Side" },
      { dealId: "NIP-004", dealName: "Manos | Sell Side", stage: "Reunião realizada", reunioesRealizadas: 10, propostasEnviadas: 0, contratosFechados: 0, tcvPonderado: 0, faturamentoGalapos: 0, servicoQualificado: "M&A Sell Side" },
      { dealId: "NIP-005", dealName: "Icavi | M&A", stage: "Contrato fechado", reunioesRealizadas: 6, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 1510000, faturamentoGalapos: 579000, servicoContratado: "M&A [LM]" }
    ]
  },
  {
    parceiro: "Valor Elbrus",
    tier: "Tier 1",
    contratosFechados: 19,
    propostasEnviadas: 28,
    reunioesRealizadas: 66,
    tcvPonderado: 4120000,
    faturamentoGalapos: 1034000,
    deals: [
      { dealId: "VEL-001", dealName: "Rede Marista | Captação", stage: "Proposta enviada", reunioesRealizadas: 12, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 1280000, faturamentoGalapos: 0, servicoEmProposta: "Captação Subvenção" },
      { dealId: "VEL-002", dealName: "Evolution Agro | M&A", stage: "Contrato fechado", reunioesRealizadas: 8, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 910000, faturamentoGalapos: 292000, servicoContratado: "M&A Sell Side" },
      { dealId: "VEL-003", dealName: "BTA Aditivos | Finep", stage: "Reunião realizada", reunioesRealizadas: 11, propostasEnviadas: 0, contratosFechados: 0, tcvPonderado: 0, faturamentoGalapos: 0, servicoQualificado: "Captação via Finep" },
      { dealId: "VEL-004", dealName: "Cemacon | Subvenção", stage: "Proposta enviada", reunioesRealizadas: 17, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 650000, faturamentoGalapos: 0, servicoEmProposta: "Captação Subvenção" },
      { dealId: "VEL-005", dealName: "RDP Energia | Lei do Bem", stage: "Contrato fechado", reunioesRealizadas: 9, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 850000, faturamentoGalapos: 418000, servicoContratado: "Lei do Bem" }
    ]
  },
  {
    parceiro: "RP Capital",
    tier: "Tier 1",
    contratosFechados: 14,
    propostasEnviadas: 20,
    reunioesRealizadas: 47,
    tcvPonderado: 2970000,
    faturamentoGalapos: 846000,
    deals: [
      { dealId: "RPC-001", dealName: "Hidrodomi | Lei do Bem", stage: "Contrato fechado", reunioesRealizadas: 7, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 780000, faturamentoGalapos: 353000, servicoContratado: "Lei do Bem" },
      { dealId: "RPC-002", dealName: "Margirius | Finep", stage: "Contrato fechado", reunioesRealizadas: 6, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 690000, faturamentoGalapos: 241000, servicoContratado: "Captação via Finep" },
      { dealId: "RPC-003", dealName: "Rede D'Or | Sell Side", stage: "Proposta enviada", reunioesRealizadas: 10, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 570000, faturamentoGalapos: 0, servicoEmProposta: "M&A Sell Side" },
      { dealId: "RPC-004", dealName: "Case Agro | Valuation", stage: "Reunião realizada", reunioesRealizadas: 12, propostasEnviadas: 0, contratosFechados: 0, tcvPonderado: 0, faturamentoGalapos: 0, servicoQualificado: "Valuation" },
      { dealId: "RPC-005", dealName: "Multi Co | Finep", stage: "Contrato fechado", reunioesRealizadas: 5, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 600000, faturamentoGalapos: 252000, servicoContratado: "Captação via Finep" }
    ]
  },
  {
    parceiro: "3A Riva",
    tier: "Tier 1",
    contratosFechados: 13,
    propostasEnviadas: 18,
    reunioesRealizadas: 39,
    tcvPonderado: 2650000,
    faturamentoGalapos: 721000,
    deals: [
      { dealId: "RIV-001", dealName: "Lactec | Finep", stage: "Contrato fechado", reunioesRealizadas: 6, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 720000, faturamentoGalapos: 289000, servicoContratado: "Captação via Finep" },
      { dealId: "RIV-002", dealName: "Copel | Lei do Bem", stage: "Contrato fechado", reunioesRealizadas: 5, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 680000, faturamentoGalapos: 213000, servicoContratado: "Lei do Bem" },
      { dealId: "RIV-003", dealName: "Baldan | Captação", stage: "Proposta enviada", reunioesRealizadas: 8, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 450000, faturamentoGalapos: 0, servicoEmProposta: "Captação Subvenção" },
      { dealId: "RIV-004", dealName: "Fibracem | Lei do Bem", stage: "Reunião realizada", reunioesRealizadas: 11, propostasEnviadas: 0, contratosFechados: 0, tcvPonderado: 0, faturamentoGalapos: 0, servicoQualificado: "Lei do Bem" },
      { dealId: "RIV-005", dealName: "OBDI | Locação", stage: "Proposta enviada", reunioesRealizadas: 9, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 530000, faturamentoGalapos: 219000, servicoEmProposta: "Valuation" }
    ]
  },
  {
    parceiro: "A Figueira",
    tier: "Tier 1",
    contratosFechados: 11,
    propostasEnviadas: 15,
    reunioesRealizadas: 18,
    tcvPonderado: 2140000,
    faturamentoGalapos: 598000,
    deals: [
      { dealId: "AFI-001", dealName: "NewSun | DCM", stage: "Contrato fechado", reunioesRealizadas: 4, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 690000, faturamentoGalapos: 236000, servicoContratado: "DCM" },
      { dealId: "AFI-002", dealName: "Grupo Verde | BNDES", stage: "Proposta enviada", reunioesRealizadas: 5, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 510000, faturamentoGalapos: 0, servicoEmProposta: "Captação via BNDES" },
      { dealId: "AFI-003", dealName: "Gedisa | M&A", stage: "Reunião realizada", reunioesRealizadas: 3, propostasEnviadas: 0, contratosFechados: 0, tcvPonderado: 0, faturamentoGalapos: 0, servicoQualificado: "M&A Sell Side" },
      { dealId: "AFI-004", dealName: "TecnoSpeed | M&A", stage: "Contrato fechado", reunioesRealizadas: 2, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 420000, faturamentoGalapos: 178000, servicoContratado: "M&A Sell Side" },
      { dealId: "AFI-005", dealName: "Truck Center | Lei do Bem", stage: "Proposta enviada", reunioesRealizadas: 4, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 270000, faturamentoGalapos: 184000, servicoEmProposta: "Lei do Bem" }
    ]
  },
  {
    parceiro: "Acacias",
    tier: "Tier 2",
    contratosFechados: 9,
    propostasEnviadas: 13,
    reunioesRealizadas: 29,
    tcvPonderado: 1760000,
    faturamentoGalapos: 487000,
    deals: [
      { dealId: "ACA-001", dealName: "Inovamed | Valuation", stage: "Contrato fechado", reunioesRealizadas: 7, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 530000, faturamentoGalapos: 194000, servicoContratado: "Valuation Express" },
      { dealId: "ACA-002", dealName: "Master Agro | Finep", stage: "Proposta enviada", reunioesRealizadas: 6, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 360000, faturamentoGalapos: 0, servicoEmProposta: "Captação via Finep" },
      { dealId: "ACA-003", dealName: "Nevasca | Lei do Bem", stage: "Contrato fechado", reunioesRealizadas: 5, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 440000, faturamentoGalapos: 156000, servicoContratado: "Lei do Bem" },
      { dealId: "ACA-004", dealName: "Inecel | Finep", stage: "Reunião realizada", reunioesRealizadas: 6, propostasEnviadas: 0, contratosFechados: 0, tcvPonderado: 0, faturamentoGalapos: 0, servicoQualificado: "Captação via Finep" },
      { dealId: "ACA-005", dealName: "Skelt | Lei do Bem", stage: "Proposta enviada", reunioesRealizadas: 5, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 260000, faturamentoGalapos: 137000, servicoEmProposta: "Lei do Bem" }
    ]
  },
  {
    parceiro: "Act Investimentos",
    tier: "Tier 2",
    contratosFechados: 8,
    propostasEnviadas: 11,
    reunioesRealizadas: 24,
    tcvPonderado: 1390000,
    faturamentoGalapos: 402000,
    deals: [
      { dealId: "ACT-001", dealName: "Case Alpha | Finep", stage: "Contrato fechado", reunioesRealizadas: 6, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 420000, faturamentoGalapos: 162000, servicoContratado: "Captação via Finep" },
      { dealId: "ACT-002", dealName: "Case Beta | M&A", stage: "Proposta enviada", reunioesRealizadas: 5, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 280000, faturamentoGalapos: 0, servicoEmProposta: "M&A Sell Side" },
      { dealId: "ACT-003", dealName: "Case Gamma | Lei do Bem", stage: "Reunião realizada", reunioesRealizadas: 4, propostasEnviadas: 0, contratosFechados: 0, tcvPonderado: 0, faturamentoGalapos: 0, servicoQualificado: "Lei do Bem" },
      { dealId: "ACT-004", dealName: "Case Delta | Valuation", stage: "Contrato fechado", reunioesRealizadas: 4, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 310000, faturamentoGalapos: 119000, servicoContratado: "Valuation" },
      { dealId: "ACT-005", dealName: "Case Epsilon | DCM", stage: "Proposta enviada", reunioesRealizadas: 5, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 220000, faturamentoGalapos: 121000, servicoEmProposta: "DCM" }
    ]
  },
  {
    parceiro: "7Rd Investimentos",
    tier: "Tier 2",
    contratosFechados: 7,
    propostasEnviadas: 10,
    reunioesRealizadas: 21,
    tcvPonderado: 1260000,
    faturamentoGalapos: 355000,
    deals: [
      { dealId: "7RD-001", dealName: "Projeto Alfa", stage: "Contrato fechado", reunioesRealizadas: 5, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 360000, faturamentoGalapos: 144000, servicoContratado: "Lei do Bem" },
      { dealId: "7RD-002", dealName: "Projeto Beta", stage: "Proposta enviada", reunioesRealizadas: 4, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 240000, faturamentoGalapos: 0, servicoEmProposta: "Captação via Finep" },
      { dealId: "7RD-003", dealName: "Projeto Gama", stage: "Reunião realizada", reunioesRealizadas: 4, propostasEnviadas: 0, contratosFechados: 0, tcvPonderado: 0, faturamentoGalapos: 0, servicoQualificado: "M&A Sell Side" },
      { dealId: "7RD-004", dealName: "Projeto Delta", stage: "Contrato fechado", reunioesRealizadas: 3, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 280000, faturamentoGalapos: 98000, servicoContratado: "Valuation" },
      { dealId: "7RD-005", dealName: "Projeto Epsilon", stage: "Proposta enviada", reunioesRealizadas: 5, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 210000, faturamentoGalapos: 113000, servicoEmProposta: "Captação Subvenção" }
    ]
  },
  {
    parceiro: "AAX",
    tier: "Tier 2",
    contratosFechados: 6,
    propostasEnviadas: 8,
    reunioesRealizadas: 17,
    tcvPonderado: 980000,
    faturamentoGalapos: 281000,
    deals: [
      { dealId: "AAX-001", dealName: "Projeto Horizonte", stage: "Contrato fechado", reunioesRealizadas: 4, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 310000, faturamentoGalapos: 124000, servicoContratado: "Captação via Finep" },
      { dealId: "AAX-002", dealName: "Projeto Aurora", stage: "Proposta enviada", reunioesRealizadas: 4, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 210000, faturamentoGalapos: 0, servicoEmProposta: "Valuation" },
      { dealId: "AAX-003", dealName: "Projeto Delta", stage: "Reunião realizada", reunioesRealizadas: 3, propostasEnviadas: 0, contratosFechados: 0, tcvPonderado: 0, faturamentoGalapos: 0, servicoQualificado: "M&A Sell Side" },
      { dealId: "AAX-004", dealName: "Projeto Sigma", stage: "Contrato fechado", reunioesRealizadas: 3, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 190000, faturamentoGalapos: 79000, servicoContratado: "Lei do Bem" },
      { dealId: "AAX-005", dealName: "Projeto Prisma", stage: "Proposta enviada", reunioesRealizadas: 3, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 140000, faturamentoGalapos: 78000, servicoEmProposta: "DCM" }
    ]
  },
  {
    parceiro: "A2A",
    tier: "Tier 2",
    contratosFechados: 5,
    propostasEnviadas: 7,
    reunioesRealizadas: 13,
    tcvPonderado: 760000,
    faturamentoGalapos: 196000,
    deals: [
      { dealId: "A2A-001", dealName: "Projeto Varejo", stage: "Contrato fechado", reunioesRealizadas: 3, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 240000, faturamentoGalapos: 82000, servicoContratado: "Captação via Finep" },
      { dealId: "A2A-002", dealName: "Projeto Alimentos", stage: "Proposta enviada", reunioesRealizadas: 3, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 160000, faturamentoGalapos: 0, servicoEmProposta: "Captação Subvenção" },
      { dealId: "A2A-003", dealName: "Projeto Energia", stage: "Reunião realizada", reunioesRealizadas: 2, propostasEnviadas: 0, contratosFechados: 0, tcvPonderado: 0, faturamentoGalapos: 0, servicoQualificado: "Lei do Bem" },
      { dealId: "A2A-004", dealName: "Projeto Saúde", stage: "Contrato fechado", reunioesRealizadas: 2, propostasEnviadas: 1, contratosFechados: 1, tcvPonderado: 130000, faturamentoGalapos: 54000, servicoContratado: "Valuation" },
      { dealId: "A2A-005", dealName: "Projeto Infra", stage: "Proposta enviada", reunioesRealizadas: 3, propostasEnviadas: 1, contratosFechados: 0, tcvPonderado: 0, tcvPonderadoProposta: 130000, faturamentoGalapos: 60000, servicoEmProposta: "M&A Sell Side" }
    ]
  }
];

export const partnerMetrics: PartnerMetric[] = rawPartnerMetrics.map((partner) => ({
  ...partner,
  etapaJornada: "Ativação",
  estadoMatriz: "-",
  proprietarioParceiro: "-",
  comissaoPaga: Math.round(partner.faturamentoGalapos * 0.12),
  deals: partner.deals.map((deal) => ({
    ...deal,
    activityDate: buildMockActivityDate(deal.dealId),
    reunioesPosR1: 0,
    comissaoPaga: Math.round((deal.faturamentoGalapos ?? 0) * 0.12),
  })),
}));

export const serviceJourneyEvents: ServiceJourneyEvent[] = partnerMetrics.flatMap((partner) =>
  partner.deals.flatMap((deal) => {
    const events: ServiceJourneyEvent[] = [];

    if (deal.reunioesRealizadas > 0 && deal.servicoQualificado) {
      for (const grupoServico of splitServiceGroups(deal.servicoQualificado)) {
        events.push({
          dealId: deal.dealId,
          dealName: deal.dealName,
          parceiro: partner.parceiro,
          grupoServico,
          metric: "r1",
          activityDate: deal.activityDate,
          currentStageLabel: deal.currentStageLabel,
        });
      }
    }

    if (deal.propostasEnviadas > 0 && deal.servicoEmProposta) {
      for (const grupoServico of splitServiceGroups(deal.servicoEmProposta)) {
        events.push({
          dealId: deal.dealId,
          dealName: deal.dealName,
          parceiro: partner.parceiro,
          grupoServico,
          metric: "proposta",
          activityDate: deal.activityDate,
          currentStageLabel: deal.currentStageLabel,
        });
      }
    }

    if (deal.contratosFechados > 0 && deal.servicoContratado) {
      for (const grupoServico of splitServiceGroups(deal.servicoContratado)) {
        events.push({
          dealId: deal.dealId,
          dealName: deal.dealName,
          parceiro: partner.parceiro,
          grupoServico,
          metric: "contrato",
          activityDate: deal.activityDate,
          currentStageLabel: deal.currentStageLabel,
        });
      }
    }

    return events;
  })
);






