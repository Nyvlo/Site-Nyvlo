<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import pricingBg from '../assets/backgrounds/pricing_bg.webp';

const router = useRouter();

const selectPlan = (plan) => {
  router.push({ name: 'checkout', query: { plan } });
};

onMounted(() => {
  // Header Reveal
  gsap.from('.pricing-header', {
    y: 30,
    opacity: 0,
    duration: 1,
    scrollTrigger: {
      trigger: '.pricing-header',
      start: 'top 85%',
    }
  });

  // Staggered Cards Reveal
  gsap.from('.pricing-card', {
    y: 60,
    opacity: 0,
    duration: 0.8,
    stagger: 0.2,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.pricing-grid',
      start: 'top 80%',
    }
  });

  // Background Parallax
  gsap.to('.pricing', {
    backgroundPositionY: '60%',
    ease: 'none',
    scrollTrigger: {
      trigger: '.pricing',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true
    }
  });
});
</script>

<template>
  <section id="pricing" class="pricing" :style="{ backgroundImage: `url(${pricingBg})` }">
    <div class="pricing-overlay"></div>
    
    <div class="container relative-z">
      <div class="pricing-header">
        <span class="sub-label">Investimento Inteligente</span>
        <h2>Escolha o plano ideal para sua <span class="brand-gradient-text">empresa</span></h2>
        <p>Planos flexíveis que crescem com você. Sem taxas ocultas e suporte premium.</p>
      </div>
      
      <div class="pricing-grid">
        <!-- Bronze Plan -->
        <div class="pricing-card glass">
          <div class="plan-info">
            <span class="plan-name">Bronze</span>
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
          <button @click="selectPlan('bronze')" class="btn-pricing glass">Assinar Bronze</button>
        </div>

        <!-- Silver Plan (Popular) -->
        <div class="pricing-card silver glass">
          <div class="popular-badge bg-gradient">Mais Popular</div>
          <div class="plan-info">
            <span class="plan-name highlighter">Silver</span>
            <div class="price">
              <span class="currency">R$</span>
              <span class="amount">397</span>
              <span class="period">/mês</span>
            </div>
            <p>Para times que precisam de mais poder e escala.</p>
          </div>
          <ul class="features">
            <li><span class="check glow">✓</span> 3 Conexões WhatsApp</li>
            <li><span class="check glow">✓</span> 10 Atendentes</li>
            <li><span class="check glow">✓</span> Integração com CRM</li>
            <li><span class="check glow">✓</span> Chatbot com IA</li>
            <li><span class="check glow">✓</span> Relatórios Avançados</li>
          </ul>
          <button @click="selectPlan('silver')" class="btn-pricing bg-gradient">Assinar Silver</button>
        </div>

        <!-- Gold Plan -->
        <div class="pricing-card glass">
          <div class="plan-info">
            <span class="plan-name">Gold</span>
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
          <button @click="selectPlan('gold')" class="btn-pricing glass">Assinar Gold</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pricing {
  position: relative;
  padding: 10rem 0;
  overflow: hidden;
  background-color: var(--background);
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

.pricing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(8, 12, 24, 0.85) 0%, rgba(8, 12, 24, 0.75) 100%);
  z-index: 0;
}

.relative-z {
  position: relative;
  z-index: 2;
}

.pricing-header {
  text-align: center;
  margin-bottom: 6rem;
}

.sub-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--vibrant-green);
  margin-bottom: 1.5rem;
}

.pricing-header h2 {
  font-size: 3.5rem;
  margin-bottom: 2rem;
  font-weight: 900;
  color: white;
}

.pricing-header p {
  font-size: 1.1rem;
  color: var(--text-muted);
  max-width: 600px;
  margin: 0 auto;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.5rem;
}

.pricing-card {
  padding: 4rem 3rem;
  border-radius: 2.5rem;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  border-color: var(--border);
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.02);
}

.pricing-card:hover {
  transform: translateY(-10px);
  border-color: var(--vibrant-green);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.3);
}

.pricing-card.silver {
  border: 1px solid rgba(89, 195, 72, 0.3);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.4);
  background: rgba(89, 195, 72, 0.03);
}

.popular-badge {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 0.6rem 1.5rem;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: white;
  box-shadow: 0 10px 20px rgba(89, 195, 72, 0.3);
}

.plan-name {
  display: block;
  font-size: 1.25rem;
  font-weight: 800;
  color: white;
  margin-bottom: 1.5rem;
  opacity: 0.8;
}

.plan-name.highlighter {
  color: var(--vibrant-green);
  opacity: 1;
}

.price {
  margin-bottom: 2rem;
  display: flex;
  align-items: baseline;
}

.currency {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin-right: 0.4rem;
}

.amount {
  font-size: 4rem;
  font-weight: 900;
  color: white;
  line-height: 1;
}

.period {
  color: var(--text-muted);
  font-size: 1rem;
  margin-left: 0.5rem;
}

.plan-info p {
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 3rem;
}

.features {
  list-style: none;
  margin-bottom: 3.5rem;
  flex: 1;
}

.features li {
  margin-bottom: 1.2rem;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--foreground);
}

.check {
  color: var(--vibrant-green);
  font-weight: 900;
}

.check.glow {
  text-shadow: 0 0 10px rgba(89, 195, 72, 0.5);
}

.btn-pricing {
  padding: 1.2rem;
  border-radius: 1rem;
  font-weight: 800;
  transition: all 0.3s ease;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.9rem;
}

.btn-pricing:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
}

.btn-pricing.glass:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--vibrant-green);
}

.btn-pricing.bg-gradient {
  box-shadow: 0 10px 20px rgba(29, 61, 107, 0.3);
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.05); }
}

@media (max-width: 1024px) {
  .pricing-grid {
    grid-template-columns: 1fr;
    max-width: 500px;
    margin: 0 auto;
    gap: 4rem;
  }
}

@media (max-width: 768px) {
  .pricing { padding: 6rem 0; }
  .pricing-header h2 { font-size: 2.5rem; }
  .pricing-card { padding: 3rem 2rem; }
}
</style>
