<template>
  <section id="pricing" class="pricing">
    <div class="container">
      <div class="pricing-header">
        <h2 class="animate-fade-in">Escolha o plano ideal para sua <span class="text-gradient">empresa</span></h2>
        <p class="animate-fade-in">Planos flexíveis que crescem com você. Sem taxas ocultas.</p>
      </div>
      
      <div class="pricing-grid">
        <!-- Bronze Plan -->
        <div class="pricing-card glass animate-fade-in" style="animation-delay: 0.1s;">
          <div class="plan-info">
            <h3>Bronze</h3>
            <div class="price">
              <span class="currency">R$</span>
              <span class="amount">197</span>
              <span class="period">/mês</span>
            </div>
            <p>Ideal para autônomos e pequenas operações.</p>
          </div>
          <ul class="features">
            <li><span class="check">✓</span> 1 Conexão WhatsApp</li>
            <li><span class="check">✓</span> 3 Atendentes</li>
            <li><span class="check">✓</span> Painel de Controle</li>
            <li><span class="check">✓</span> Chatbot Básico</li>
          </ul>
          <button class="btn-pricing">Selecionar Bronze</button>
        </div>

        <!-- Silver Plan (Popular) -->
        <div class="pricing-card silver glass animate-fade-in" style="animation-delay: 0.2s;">
          <div class="popular-badge">Mais Popular</div>
          <div class="plan-info">
            <h3>Silver</h3>
            <div class="price">
              <span class="currency">R$</span>
              <span class="amount">397</span>
              <span class="period">/mês</span>
            </div>
            <p>Para times que precisam de mais poder e escala.</p>
          </div>
          <ul class="features">
            <li><span class="check">✓</span> 3 Conexões WhatsApp</li>
            <li><span class="check">✓</span> 10 Atendentes</li>
            <li><span class="check">✓</span> Integração com CRM</li>
            <li><span class="check">✓</span> Chatbot com IA</li>
            <li><span class="check">✓</span> Relatórios Avançados</li>
          </ul>
          <button class="btn-pricing bg-gradient">Selecionar Silver</button>
        </div>

        <!-- Gold Plan -->
        <div class="pricing-card glass animate-fade-in" style="animation-delay: 0.3s;">
          <div class="plan-info">
            <h3>Gold</h3>
            <div class="price">
              <span class="currency">R$</span>
              <span class="amount">697</span>
              <span class="period">/mês</span>
            </div>
            <p>A solução definitiva para grandes empresas.</p>
          </div>
          <ul class="features">
            <li><span class="check">✓</span> Conexões Ilimitadas</li>
            <li><span class="check">✓</span> Atendentes Ilimitados</li>
            <li><span class="check">✓</span> API de Integração</li>
            <li><span class="check">✓</span> IA Customizada</li>
            <li><span class="check">✓</span> Suporte Prioritário 24/7</li>
          </ul>
          <button class="btn-pricing">Selecionar Gold</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pricing {
  background: radial-gradient(circle at bottom, rgba(37, 211, 102, 0.05) 0%, transparent 50%);
}

.pricing-header {
  text-align: center;
  margin-bottom: 5rem;
}

.pricing-header h2 {
  font-size: 3rem;
  margin-bottom: 1.5rem;
}

.pricing-header p {
  font-size: 1.1rem;
  color: var(--text-muted);
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.pricing-card {
  padding: 3rem 2rem;
  border-radius: 24px;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
}

.pricing-card:hover {
  transform: translateY(-10px);
  border-color: var(--primary);
}

.pricing-card.silver {
  border: 1px solid var(--primary);
  background: rgba(37, 211, 102, 0.02);
}

.popular-badge {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--primary);
  padding: 0.4rem 1.2rem;
  border-radius: 100px;
  font-size: 0.85rem;
  font-weight: 700;
  color: white;
}

.plan-info h3 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.price {
  margin-bottom: 1.5rem;
}

.currency {
  font-size: 1.5rem;
  font-weight: 600;
  vertical-align: top;
  margin-right: 0.2rem;
}

.amount {
  font-size: 3.5rem;
  font-weight: 800;
  font-family: 'Outfit';
}

.period {
  color: var(--text-muted);
  font-size: 1rem;
}

.plan-info p {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-bottom: 2rem;
}

.features {
  list-style: none;
  margin-bottom: 2.5rem;
  flex: 1;
}

.features li {
  margin-bottom: 1rem;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.check {
  color: var(--primary);
  font-weight: 900;
}

.btn-pricing {
  padding: 1rem;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  color: var(--text);
  font-weight: 700;
  transition: all 0.2s ease;
}

.btn-pricing:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.btn-pricing.bg-gradient {
  border: none;
  color: white;
}

@media (max-width: 1024px) {
  .pricing-grid {
    grid-template-columns: 1fr;
    max-width: 500px;
    margin: 0 auto;
    gap: 3rem;
  }
}
</style>
