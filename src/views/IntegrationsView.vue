<script setup>
import { onMounted } from 'vue';
import integrationsBg from '../assets/backgrounds/integrations_page_bg.png';

onMounted(() => {
  window.scrollTo(0, 0);
});

const integrations = [
  {
    category: 'Pagamentos',
    items: [
      { name: 'Asaas', desc: 'Automação de cobranças e gestão financeira.', icon: '💳' },
      { name: 'Mercado Pago', desc: 'O ecossistema de pagamentos mais completo.', icon: '🛍️' }
    ]
  },
  {
    category: 'Inteligência Artificial',
    items: [
      { name: 'OpenAI (GPT-4)', desc: 'Poder de processamento de linguagem natural.', icon: '🧠' },
      { name: 'Anthropic (Claude)', desc: 'IA focada em segurança e precisão térmica.', icon: '🤖' },
      { name: 'Groq', desc: 'Velocidade extrema para respostas instantâneas.', icon: '⚡' }
    ]
  },
  {
    category: 'Comunicação',
    items: [
      { name: 'WhatsApp Business', desc: 'Foco total no canal mais usado do mundo.', icon: '📱' }
    ]
  },
  {
    category: 'Automação',
    items: [
      { name: 'Webhooks', desc: 'Sincronização em tempo real com seus apps.', icon: '🔗' },
      { name: 'Enterprise API', desc: 'Integração técnica robusta para devs.', icon: '🛠️' }
    ]
  }
];
</script>

<template>
  <div class="integrations-page">
    <!-- Hero Section -->
    <section class="integrations-hero" :style="{ backgroundImage: `url(${integrationsBg})` }">
      <div class="overlay"></div>
      <div class="container relative-z">
        <div class="content animate-fade-in">
          <span class="sub-label">Ecosistema Nyvlo</span>
          <h1 class="brand-gradient-text">Integrações</h1>
          <p>Conecte a Nyvlo com as ferramentas que você já usa e crie fluxos de trabalho imbatíveis.</p>
        </div>
      </div>
    </section>

    <!-- Integrations Grid -->
    <section class="integrations-grid">
      <div class="container">
        <div v-for="cat in integrations" :key="cat.category" class="category-block animate-fade-in">
          <h2 class="category-title">{{ cat.category }}</h2>
          <div class="grid-layout">
            <div v-for="item in cat.items" :key="item.name" class="integration-card glass">
              <div class="card-header">
                <div class="icon-circle bg-gradient">{{ item.icon }}</div>
                <h3>{{ item.name }}</h3>
              </div>
              <p>{{ item.desc }}</p>
              <div class="status-badge">
                <span class="dot"></span> Ativo
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Partner CTA -->
    <section class="partner-cta">
      <div class="container">
        <div class="cta-box glass">
          <h2>Não encontrou sua ferramenta?</h2>
          <p>Nossa API pública permite que você integre qualquer sistema proprietário em minutos.</p>
          <a href="/#contact" class="btn-primary bg-gradient">Consultar Especialista</a>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.integrations-page {
  background-color: var(--background);
  color: white;
}

.integrations-hero {
  height: 50vh;
  min-height: 450px;
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, rgba(8, 12, 24, 0.6), var(--background));
}

.relative-z {
  position: relative;
  z-index: 2;
}

.sub-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.4em;
  color: var(--vibrant-green);
  margin-bottom: 1.5rem;
}

.integrations-hero h1 {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  font-weight: 900;
}

.integrations-hero p {
  font-size: 1.25rem;
  color: var(--text-muted);
  max-width: 600px;
  margin: 0 auto;
}

.integrations-grid {
  padding: 6rem 0;
}

.category-block {
  margin-bottom: 6rem;
}

.category-title {
  font-size: 1.75rem;
  font-weight: 800;
  margin-bottom: 2.5rem;
  padding-left: 1rem;
  border-left: 4px solid var(--vibrant-green);
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

.integration-card {
  padding: 2.5rem;
  border-radius: 2rem;
  transition: all 0.3s ease;
}

.integration-card:hover {
  transform: translateY(-8px);
  border-color: rgba(89, 195, 72, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.icon-circle {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.integration-card h3 {
  font-size: 1.4rem;
  font-weight: 800;
}

.integration-card p {
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 2rem;
  font-size: 0.95rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--vibrant-green);
  background: rgba(89, 195, 72, 0.1);
  padding: 0.4rem 1rem;
  border-radius: 2rem;
}

.dot {
  width: 6px;
  height: 6px;
  background-color: var(--vibrant-green);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--vibrant-green);
}

.partner-cta {
  padding-bottom: 10rem;
}

.cta-box {
  padding: 5rem;
  border-radius: 3rem;
  text-align: center;
  background: linear-gradient(135deg, rgba(29, 61, 107, 0.05), rgba(89, 195, 72, 0.05));
}

.cta-box h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  font-weight: 900;
}

.cta-box p {
  color: var(--text-muted);
  margin-bottom: 3rem;
  font-size: 1.1rem;
}

.btn-primary {
  padding: 1.2rem 3rem;
  border-radius: 1rem;
  font-weight: 800;
  font-size: 1.1rem;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .integrations-hero h1 { font-size: 2.75rem; }
  .cta-box { padding: 3rem 2rem; }
  .cta-box h2 { font-size: 1.8rem; }
}
</style>
