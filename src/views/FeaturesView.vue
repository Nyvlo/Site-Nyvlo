<script setup>
import { onMounted, nextTick } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import featuresBg from '../assets/backgrounds/features_page_bg.png';

onMounted(async () => {
  window.scrollTo(0, 0);
  await nextTick();

  // Safety Timeout
  const safetyTimeout = setTimeout(() => {
    gsap.to(['.feature-card', '.cta-card'], {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.5,
      stagger: 0.05,
      overwrite: true
    });
  }, 1500);

  // Hero Entrance
  gsap.fromTo('.features-hero .content h1', 
    { y: 50, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 1.2,
      ease: 'power4.out'
    }
  );
  
  gsap.fromTo('.features-hero .content p', 
    { y: 30, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 1,
      delay: 0.3,
      ease: 'power3.out'
    }
  );

  // Background Parallax
  gsap.to('.features-hero', {
    backgroundPositionY: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: '.features-hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });

  // Features Reveal
  gsap.fromTo('.feature-card', 
    { y: 40, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.grid-layout',
        start: 'top 92%',
        once: true,
        onEnter: () => clearTimeout(safetyTimeout)
      }
    }
  );

  // CTA Card Reveal
  gsap.fromTo('.cta-card', 
    { scale: 0.95, opacity: 0 },
    {
      scale: 1,
      opacity: 1,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.cta-section',
        start: 'top 98%',
        once: true,
        onEnter: () => clearTimeout(safetyTimeout)
      }
    }
  );

  setTimeout(() => {
    ScrollTrigger.refresh();
  }, 500);
});
</script>

<template>
  <div class="features-page">
    <!-- Hero Section -->
    <section class="features-hero" :style="{ backgroundImage: `url(${featuresBg})` }">
      <div class="overlay"></div>
      <div class="container relative-z">
        <div class="content">
          <span class="sub-label">Nyvlo Omnichannel</span>
          <h1 class="brand-gradient-text">Funcionalidades</h1>
          <p>Explore as ferramentas que estão redefinindo o padrão de atendimento e automação para empresas de alto crescimento.</p>
        </div>
      </div>
    </section>

    <!-- Main Features Grid -->
    <section class="features-grid">
      <div class="container">
        <div class="grid-layout">
          <div class="feature-card glass">
            <div class="icon-box bg-gradient">01</div>
            <h3>WhatsApp Real-time</h3>
            <p>Conecte seu WhatsApp corporativo em uma tela fluida e instantânea para um atendimento ágil e centralizado.</p>
            <ul class="feature-list">
              <li>• Sincronização em milissegundos</li>
              <li>• Distribuição inteligente de tickets</li>
              <li>• Gestão completa via API</li>
            </ul>
          </div>

          <div class="feature-card glass">
            <div class="icon-box bg-gradient">02</div>
            <h3>IA & Automação</h3>
            <p>Nossa IA aprende com seu histórico e sugere as melhores respostas, ou automatiza fluxos complexos.</p>
            <ul class="feature-list">
              <li>• Chatbots com linguagem natural</li>
              <li>• Sugestões de resposta em tempo real</li>
              <li>• Triagem automática de leads</li>
            </ul>
          </div>

          <div class="feature-card glass">
            <div class="icon-box bg-gradient">03</div>
            <h3>Dashboard Analytic</h3>
            <p>Métricas precisas sobre tempo de resposta, satisfação do cliente e performance da equipe.</p>
            <ul class="feature-list">
              <li>• Relatórios exportáveis em PDF/Excel</li>
              <li>• Monitoramento de picos de demanda</li>
              <li>• KPIs personalizáveis</li>
            </ul>
          </div>

          <div class="feature-card glass">
            <div class="icon-box bg-gradient">04</div>
            <h3>Enterprise API</h3>
            <p>Integre a Nyvlo com seu CRM, ERP ou sistema proprietário de forma simples e segura.</p>
            <ul class="feature-list">
              <li>• Documentação completa (Swagger)</li>
              <li>• Webhooks para eventos em tempo real</li>
              <li>• Segurança padrão bancário</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-card glass">
          <h2>Pronto para escalar seu atendimento?</h2>
          <p>Junte-se a centenas de empresas que já transformaram seus resultados com a Nyvlo.</p>
          <div class="cta-buttons">
            <a href="/#contact" class="btn-primary bg-gradient">Solicitar Demonstração</a>
            <a href="/#pricing" class="btn-secondary glass">Ver Planos</a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.features-page {
  background-color: var(--background);
  color: white;
}

.features-hero {
  height: 60vh;
  min-height: 500px;
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
  background: linear-gradient(to bottom, rgba(8, 12, 24, 0.7), var(--background));
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

.features-hero h1 {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  font-weight: 900;
}

.features-hero p {
  font-size: 1.25rem;
  color: var(--text-muted);
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.6;
}

.features-grid {
  padding: 8rem 0;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 3rem;
}

.feature-card {
  padding: 4rem;
  border-radius: 2.5rem;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.feature-card:hover {
  transform: translateY(-10px);
  border-color: rgba(89, 195, 72, 0.3);
}

.icon-box {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-weight: 900;
  font-size: 1.2rem;
  margin-bottom: 2rem;
}

.feature-card h3 {
  font-size: 1.75rem;
  margin-bottom: 1.2rem;
  color: white;
}

.feature-card p {
  color: var(--text-muted);
  font-size: 1.05rem;
  line-height: 1.7;
  margin-bottom: 2rem;
}

.feature-list {
  list-style: none;
  padding: 0;
}

.feature-list li {
  color: var(--foreground);
  font-weight: 500;
  margin-bottom: 0.8rem;
  opacity: 0.8;
}

.cta-section {
  padding-bottom: 10rem;
}

.cta-card {
  padding: 6rem;
  text-align: center;
  border-radius: 3rem;
  background: linear-gradient(135deg, rgba(29, 61, 107, 0.1), rgba(89, 195, 72, 0.1));
}

.cta-card h2 {
  font-size: 3rem;
  margin-bottom: 1.5rem;
  font-weight: 900;
}

.cta-card p {
  font-size: 1.2rem;
  color: var(--text-muted);
  margin-bottom: 3.5rem;
}

.cta-buttons {
  display: flex;
  gap: 2rem;
  justify-content: center;
}

.btn-primary, .btn-secondary {
  padding: 1.2rem 3rem;
  border-radius: 1rem;
  font-weight: 800;
  font-size: 1.1rem;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 30px rgba(29, 61, 107, 0.4);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
}

@media (max-width: 1024px) {
  .features-hero h1 { font-size: 3.5rem; }
  .grid-layout { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .features-hero { height: auto; padding: 10rem 0; }
  .features-hero h1 { font-size: 2.75rem; }
  .feature-card { padding: 2.5rem; }
  .cta-card { padding: 4rem 2rem; }
  .cta-card h2 { font-size: 2.25rem; }
  .cta-buttons { flex-direction: column; }
}
</style>
