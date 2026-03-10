// Configurações e constantes
const CONFIG = {
  // Receita de Adquirência (% do TPV)
  acquiringMarginDefault: 1.5, // % do TPV
  
  // Serviços Adicionais (receita média mensal por usuário ativo)
  creditMonthlyRevenue: 150, // R$ por usuário/mês
  insuranceMonthlyRevenue: 80, // R$ por usuário/mês
  consortiumMonthlyRevenue: 120, // R$ por usuário/mês
  
  // Custos operacionais (baseados no business plan)
  accountActivationCost: 0.9, // R$ por conta ativa/mês
  pixCost: 0.2, // R$ por transação Pix
  boletoLiquidationCost: 1.4, // R$ por boleto liquidado
  tedCost: 2.5, // R$ por TED
  
  // Floating (receita de juros)
  floatingPercentage: 0.7, // 70% do floating é receita
  irpjRate: 0.225, // 22.5% de IRPJ
  cdiRate: 0.15, // 15% anual (0.0116 mensal)
};

// Elementos do DOM
const elements = {
  users: document.getElementById('users'),
  usersValue: document.getElementById('users-value'),
  tpv: document.getElementById('tpv'),
  tpvValue: document.getElementById('tpv-value'),
  adoption: document.getElementById('adoption'),
  adoptionValue: document.getElementById('adoption-value'),
  acquiringMargin: document.getElementById('acquiringMargin'),
  acquiringMarginValue: document.getElementById('acquiringMargin-value'),
  months: document.getElementById('months'),
  monthsValue: document.getElementById('months-value'),
  
  // Checkboxes de serviços
  serviceCredit: document.getElementById('service-credit'),
  serviceInsurance: document.getElementById('service-insurance'),
  serviceConsortium: document.getElementById('service-consortium'),
  
  // Receita mensal dos serviços
  creditRevenue: document.getElementById('credit-revenue'),
  insuranceRevenue: document.getElementById('insurance-revenue'),
  consortiumRevenue: document.getElementById('consortium-revenue'),
  
  // Resultados
  annualRevenue: document.getElementById('annual-revenue'),
  periodRevenue: document.getElementById('period-revenue'),
  activeUsers: document.getElementById('active-users'),
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

// Obter serviços selecionados e calcular receita total
function getSelectedServices() {
  const services = {
    credit: elements.serviceCredit.checked,
    insurance: elements.serviceInsurance.checked,
    consortium: elements.serviceConsortium.checked,
  };
  
  const totalMonthlyRevenuePerUser = 
    (services.credit ? CONFIG.creditMonthlyRevenue : 0) +
    (services.insurance ? CONFIG.insuranceMonthlyRevenue : 0) +
    (services.consortium ? CONFIG.consortiumMonthlyRevenue : 0);
  
  return { services, totalMonthlyRevenuePerUser };
}

// Atualizar valores dos sliders no DOM
function updateSliderValues() {
  elements.usersValue.textContent = formatNumber(elements.users.value);
  elements.tpvValue.textContent = formatCurrency(elements.tpv.value);
  elements.adoptionValue.textContent = elements.adoption.value + '%';
  elements.acquiringMarginValue.textContent = elements.acquiringMargin.value.replace('.', ',') + '%';
  elements.monthsValue.textContent = elements.months.value;
  elements.periodMonths.textContent = elements.months.value;
}

// Calcular receita mensal
function calculateMonthlyRevenue(users, tpv, adoption, acquiringMarginPercent, servicesData, monthIndex) {
  const activeUsers = Math.floor(users * (adoption / 100));
  
  // Crescimento gradual no primeiro ano
  const growthFactor = Math.min(1, (monthIndex + 1) / 12);
  const adjustedUsers = Math.floor(activeUsers * growthFactor);
  
  // TPV mensal total
  const monthlyTpv = adjustedUsers * tpv;
  
  // ===== RECEITA DE ADQUIRÊNCIA =====
  // Receita do TPV processado (% do TPV)
  const acquiringRevenue = monthlyTpv * (acquiringMarginPercent / 100);
  
  // ===== RECEITA DE SERVIÇOS ADICIONAIS =====
  // Crédito, Seguro, Consórcio - receita fixa por usuário ativo
  const servicesRevenue = adjustedUsers * servicesData.totalMonthlyRevenuePerUser;
  
  // ===== RECEITA DE FLOATING =====
  // Juros sobre saldo médio
  const floatingBalance = monthlyTpv * 0.3; // 30% fica em floating
  const floatingRevenue = floatingBalance * (CONFIG.cdiRate / 12) * CONFIG.floatingPercentage * (1 - CONFIG.irpjRate);
  
  // ===== CUSTOS OPERACIONAIS =====
  const accountCosts = adjustedUsers * CONFIG.accountActivationCost;
  
  // Transações estimadas
  const pixTransactions = adjustedUsers * 3; // 3 Pix por usuário/mês
  const boletoTransactions = adjustedUsers * 1; // 1 boleto por usuário/mês
  const pixCosts = pixTransactions * CONFIG.pixCost;
  const boletoCosts = boletoTransactions * CONFIG.boletoLiquidationCost;
  
  const totalCosts = accountCosts + pixCosts + boletoCosts;
  
  // Receita líquida
  const monthlyRevenue = acquiringRevenue + servicesRevenue + floatingRevenue - totalCosts;
  
  return {
    revenue: Math.max(0, monthlyRevenue),
    tpv: monthlyTpv,
    users: adjustedUsers,
    acquiringRevenue,
    servicesRevenue,
    floatingRevenue,
    costs: totalCosts,
  };
}

// Calcular receita total
function calculateTotalRevenue() {
  const users = parseInt(elements.users.value);
  const tpv = parseFloat(elements.tpv.value);
  const adoption = parseInt(elements.adoption.value);
  const acquiringMarginPercent = parseFloat(elements.acquiringMargin.value);
  const months = parseInt(elements.months.value);
  
  const servicesData = getSelectedServices();
  
  let totalRevenue = 0;
  let totalTpv = 0;
  let maxUsers = 0;
  const monthlyData = [];
  
  for (let i = 0; i < months; i++) {
    const monthData = calculateMonthlyRevenue(users, tpv, adoption, acquiringMarginPercent, servicesData, i);
    totalRevenue += monthData.revenue;
    totalTpv += monthData.tpv;
    maxUsers = Math.max(maxUsers, monthData.users);
    monthlyData.push(monthData);
  }
  
  const annualRevenue = (totalRevenue / months) * 12;
  
  return {
    totalRevenue,
    annualRevenue,
    totalTpv,
    maxUsers,
    monthlyData,
    servicesData,
  };
}

// Gerar insights
function generateInsights(data) {
  const insights = [];
  const { annualRevenue, maxUsers, monthlyData, servicesData } = data;
  
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
    if (firstMonth > 0) {
      const growth = ((lastMonth - firstMonth) / firstMonth) * 100;
      if (growth > 50) {
        insights.push(`Crescimento projetado de ${formatNumber(growth)}% durante o período de análise.`);
      }
    }
  }
  
  // Insight 3: Usuários ativos
  if (maxUsers > 0) {
    insights.push(`Base de ${formatNumber(maxUsers)} usuários ativos com serviços financeiros.`);
  }
  
  // Insight 4: TPV
  if (data.totalTpv > 0) {
    const monthlyAvgTpv = data.totalTpv / monthlyData.length;
    const annualTpv = monthlyAvgTpv * 12;
    insights.push(`Volume transacionado estimado em R$ ${formatCurrency(annualTpv)} anualizados.`);
  }
  
  // Insight 5: Composição de receita
  const servicesCount = Object.values(servicesData.services).filter(Boolean).length;
  if (servicesCount > 0) {
    const serviceNames = [];
    if (servicesData.services.credit) serviceNames.push('Crédito');
    if (servicesData.services.insurance) serviceNames.push('Seguro');
    if (servicesData.services.consortium) serviceNames.push('Consórcio');
    insights.push(`Receita diversificada com ${serviceNames.join(', ')}.`);
  }
  
  // Insight 6: Recomendação
  insights.push(`Comece pelos usuários antes dos clientes. Construa produtos simples de alto uso.`);
  
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
  elements.activeUsers.textContent = formatNumber(data.maxUsers);
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
elements.users.addEventListener('input', updateResults);
elements.tpv.addEventListener('input', updateResults);
elements.adoption.addEventListener('input', updateResults);
elements.acquiringMargin.addEventListener('input', updateResults);
elements.months.addEventListener('input', updateResults);

// Event listeners para checkboxes
elements.serviceCredit.addEventListener('change', updateResults);
elements.serviceInsurance.addEventListener('change', updateResults);
elements.serviceConsortium.addEventListener('change', updateResults);

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  updateResults();
});
