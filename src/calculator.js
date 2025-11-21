// Configurações e constantes
const CONFIG = {
  // Custos operacionais (baseados no business plan)
  accountActivationCost: 0.9, // R$ por conta ativa/mês
  kycCost: 4.5, // R$ por KYC
  pixCost: 0.2, // R$ por transação Pix
  boletoPaymentCost: 0.0, // R$ por boleto
  boletoLiquidationCost: 1.4, // R$ por boleto liquidado
  tedCost: 2.5, // R$ por TED
  
  // Receitas (baseadas no business plan)
  pixRevenue: 0.2, // R$ por transação Pix
  boletoPaymentRevenue: 0.0, // R$ por boleto
  boletoLiquidationRevenue: 1.8, // R$ por boleto liquidado
  tedRevenue: 2.5, // R$ por TED
  
  // Cartões
  cardActivationCost: 0.91, // R$ por cartão ativo/mês
  cardInactiveCost: 0.15, // R$ por cartão inativo/mês
  embossingCost: 20.0, // R$ por cartão físico
  logisticsCost: 10.5, // R$ por cartão físico
  authorizationCost: 0.07, // R$ por autorização
  antifraudCost: 0.07, // R$ por transação
  transactionBandwidthCost: 0.002, // % do TPV
  qmrCost: 8.0, // R$ por cartão
  
  // Floating (receita de juros)
  floatingPercentage: 0.7, // 70% do floating é receita
  irpjRate: 0.225, // 22.5% de IRPJ
  cdiRate: 0.15, // 15% anual (0.0116 mensal)
  
  // Serviços adicionais
  creditServiceMargin: 0.03, // 3% de margem em crédito
  insuranceMargin: 0.05, // 5% de margem em seguros
  cashbackCost: 0.01, // 1% de cashback
};

// Elementos do DOM
const elements = {
  employees: document.getElementById('employees'),
  employeesValue: document.getElementById('employees-value'),
  tpv: document.getElementById('tpv'),
  tpvValue: document.getElementById('tpv-value'),
  adoption: document.getElementById('adoption'),
  adoptionValue: document.getElementById('adoption-value'),
  margin: document.getElementById('margin'),
  marginValue: document.getElementById('margin-value'),
  services: document.getElementById('services'),
  servicesValue: document.getElementById('services-value'),
  months: document.getElementById('months'),
  monthsValue: document.getElementById('months-value'),
  
  annualRevenue: document.getElementById('annual-revenue'),
  periodRevenue: document.getElementById('period-revenue'),
  activeAccounts: document.getElementById('active-accounts'),
  annualTpv: document.getElementById('annual-tpv'),
  periodMonths: document.getElementById('period-months'),
  revenueContext: document.getElementById('revenue-context'),
  insightsList: document.getElementById('insights-list'),
};

let chart = null;

// Formatadores
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
};

const formatPercent = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

// Atualizar valores dos sliders no DOM
function updateSliderValues() {
  elements.employeesValue.textContent = formatNumber(elements.employees.value);
  elements.tpvValue.textContent = formatCurrency(elements.tpv.value);
  elements.adoptionValue.textContent = elements.adoption.value + '%';
  elements.marginValue.textContent = elements.margin.value.replace('.', ',') + '%';
  elements.servicesValue.textContent = elements.services.value;
  elements.monthsValue.textContent = elements.months.value;
  elements.periodMonths.textContent = elements.months.value;
}

// Calcular receita mensal
function calculateMonthlyRevenue(employees, tpv, adoption, marginPercent, numServices, monthIndex) {
  const activeAccounts = Math.floor(employees * (adoption / 100));
  
  // Crescimento gradual no primeiro ano
  const growthFactor = Math.min(1, (monthIndex + 1) / 12);
  const adjustedAccounts = Math.floor(activeAccounts * growthFactor);
  
  // TPV mensal total
  const monthlyTpv = adjustedAccounts * tpv;
  
  // Receita de transações (Pix, boletos, etc)
  const pixTransactions = adjustedAccounts * 3; // 3 Pix por conta/mês
  const boletoTransactions = adjustedAccounts * 1; // 1 boleto por conta/mês
  
  const transactionRevenue = 
    (pixTransactions * CONFIG.pixRevenue) +
    (boletoTransactions * CONFIG.boletoLiquidationRevenue);
  
  // Receita de floating (juros)
  const floatingBalance = monthlyTpv * 0.3; // 30% fica em floating
  const floatingRevenue = floatingBalance * (CONFIG.cdiRate / 12) * CONFIG.floatingPercentage * (1 - CONFIG.irpjRate);
  
  // Receita de serviços adicionais (crédito, seguros, cashback)
  const servicesRevenue = (monthlyTpv * (marginPercent / 100)) * (numServices / 5);
  
  // Receita de cartões (intercâmbio)
  const activeCards = Math.floor(adjustedAccounts * 0.5); // 50% com cartão
  const cardTransactions = activeCards * 7; // 7 transações por cartão/mês
  const cardRevenue = cardTransactions * 100 * 0.014; // Intercâmbio de 1.4%
  
  // Custos operacionais
  const accountCosts = adjustedAccounts * CONFIG.accountActivationCost;
  const pixCosts = pixTransactions * CONFIG.pixCost;
  const boletoCosts = boletoTransactions * CONFIG.boletoLiquidationCost;
  const cardCosts = activeCards * CONFIG.cardActivationCost;
  const antifraudCosts = cardTransactions * CONFIG.antifraudCost;
  
  const totalCosts = accountCosts + pixCosts + boletoCosts + cardCosts + antifraudCosts;
  
  // Receita líquida
  const monthlyRevenue = transactionRevenue + floatingRevenue + servicesRevenue + cardRevenue - totalCosts;
  
  return {
    revenue: Math.max(0, monthlyRevenue),
    tpv: monthlyTpv,
    accounts: adjustedAccounts,
    transactionRevenue,
    floatingRevenue,
    servicesRevenue,
    cardRevenue,
    costs: totalCosts,
  };
}

// Calcular receita total
function calculateTotalRevenue() {
  const employees = parseInt(elements.employees.value);
  const tpv = parseFloat(elements.tpv.value);
  const adoption = parseInt(elements.adoption.value);
  const marginPercent = parseFloat(elements.margin.value);
  const numServices = parseInt(elements.services.value);
  const months = parseInt(elements.months.value);
  
  let totalRevenue = 0;
  let totalTpv = 0;
  let maxAccounts = 0;
  const monthlyData = [];
  
  for (let i = 0; i < months; i++) {
    const monthData = calculateMonthlyRevenue(employees, tpv, adoption, marginPercent, numServices, i);
    totalRevenue += monthData.revenue;
    totalTpv += monthData.tpv;
    maxAccounts = Math.max(maxAccounts, monthData.accounts);
    monthlyData.push(monthData);
  }
  
  const annualRevenue = (totalRevenue / months) * 12;
  
  return {
    totalRevenue,
    annualRevenue,
    totalTpv,
    maxAccounts,
    monthlyData,
  };
}

// Gerar insights
function generateInsights(data) {
  const insights = [];
  const { annualRevenue, maxAccounts, monthlyData } = data;
  
  // Insight 1: Potencial geral
  if (annualRevenue > 100000) {
    insights.push(`Seu varejista tem potencial para gerar mais de R$ ${formatCurrency(annualRevenue)} em receita anualizada.`);
  } else if (annualRevenue > 50000) {
    insights.push(`Potencial estimado de R$ ${formatCurrency(annualRevenue)} em receita anualizada.`);
  } else {
    insights.push(`Oportunidade inicial com potencial de crescimento para R$ ${formatCurrency(annualRevenue)} anualizados.`);
  }
  
  // Insight 2: Crescimento
  if (monthlyData.length > 1) {
    const firstMonth = monthlyData[0].revenue;
    const lastMonth = monthlyData[monthlyData.length - 1].revenue;
    const growth = ((lastMonth - firstMonth) / firstMonth) * 100;
    if (growth > 50) {
      insights.push(`Crescimento projetado de ${formatNumber(growth)}% durante o período de análise.`);
    }
  }
  
  // Insight 3: Contas ativas
  if (maxAccounts > 0) {
    insights.push(`Base de ${formatNumber(maxAccounts)} contas ativas com serviços financeiros.`);
  }
  
  // Insight 4: TPV
  if (data.totalTpv > 0) {
    const monthlyAvgTpv = data.totalTpv / monthlyData.length;
    const annualTpv = monthlyAvgTpv * 12;
    insights.push(`Volume transacionado estimado em R$ ${formatCurrency(annualTpv)} anualizados.`);
  }
  
  // Insight 5: Recomendação
  insights.push(`Comece pelos colaboradores antes dos clientes. Construa produtos simples de alto uso.`);
  
  return insights;
}

// Atualizar gráfico
function updateChart(monthlyData) {
  const ctx = document.getElementById('revenue-chart').getContext('2d');
  
  const labels = monthlyData.map((_, i) => `Mês ${i + 1}`);
  const revenueData = monthlyData.map(d => d.revenue);
  const cumulativeRevenue = [];
  let cumulative = 0;
  revenueData.forEach(r => {
    cumulative += r;
    cumulativeRevenue.push(cumulative);
  });
  
  if (chart) {
    chart.destroy();
  }
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Receita Mensal',
          data: revenueData,
          borderColor: '#0066ff',
          backgroundColor: 'rgba(0, 102, 255, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#0066ff',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: 'Receita Acumulada',
          data: cumulativeRevenue,
          borderColor: '#00d4aa',
          backgroundColor: 'transparent',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#00d4aa',
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
              weight: '600',
            },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 12,
            weight: 'bold',
          },
          bodyFont: {
            size: 11,
          },
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += formatCurrency(context.parsed.y);
              return label;
            },
          },
        },
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Receita Mensal (R$)',
            font: {
              size: 11,
              weight: 'bold',
            },
          },
          ticks: {
            callback: function(value) {
              return 'R$ ' + (value / 1000).toFixed(0) + 'k';
            },
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Receita Acumulada (R$)',
            font: {
              size: 11,
              weight: 'bold',
            },
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            callback: function(value) {
              return 'R$ ' + (value / 1000).toFixed(0) + 'k';
            },
          },
        },
      },
    },
  });
}

// Atualizar resultados
function updateResults() {
  updateSliderValues();
  
  const data = calculateTotalRevenue();
  
  // Atualizar valores principais
  elements.annualRevenue.textContent = formatCurrency(data.annualRevenue);
  elements.periodRevenue.textContent = formatCurrency(data.totalRevenue);
  elements.activeAccounts.textContent = formatNumber(data.maxAccounts);
  elements.annualTpv.textContent = formatCurrency((data.totalTpv / parseInt(elements.months.value)) * 12);
  
  // Atualizar contexto
  const avgMonthlyRevenue = data.totalRevenue / parseInt(elements.months.value);
  elements.revenueContext.textContent = `Média mensal: ${formatCurrency(avgMonthlyRevenue)}`;
  
  // Gerar e atualizar insights
  const insights = generateInsights(data);
  elements.insightsList.innerHTML = insights
    .map(insight => `<li>${insight}</li>`)
    .join('');
  
  // Atualizar gráfico
  updateChart(data.monthlyData);
}

// Event listeners
elements.employees.addEventListener('input', updateResults);
elements.tpv.addEventListener('input', updateResults);
elements.adoption.addEventListener('input', updateResults);
elements.margin.addEventListener('input', updateResults);
elements.services.addEventListener('input', updateResults);
elements.months.addEventListener('input', updateResults);

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  updateResults();
});
