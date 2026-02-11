<script setup>
import { onMounted, nextTick } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import diffBg from '../assets/backgrounds/features_page_bg.png';

onMounted(async () => {
  window.scrollTo(0, 0);
  await nextTick();

  // Safety Timeout
  const safetyTimeout = setTimeout(() => {
    gsap.to(['.diff-card', '.cta-card'], {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.5,
      stagger: 0.1,
      overwrite: true
    });
  }, 1500);

  // Hero Entrance
  gsap.fromTo('.diff-hero .content h1', 
    { y: 50, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 1.2,
      ease: 'power4.out'
    }
  );
  
  gsap.fromTo('.diff-hero .content p', 
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
  gsap.to('.diff-hero', {
    backgroundPositionY: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: '.diff-hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });

  // Cards Reveal
  gsap.fromTo('.diff-card', 
    { y: 50, opacity: 0, scale: 0.9 },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 1,
      stagger: 0.1,
      ease: 'power4.out',
      scrollTrigger: {
        trigger: '.diff-grid',
        start: 'top 90%',
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
  <div class="differentials-page">
    <section class="diff-hero" :style="{ backgroundImage: `url(${diffBg})` }">
      <div class="overlay"></div>
      <div class="container relative-z">
        <div class="content">
          <span class="sub-label">Por que escolher Nyvlo?</span>
          <h1 class="brand-gradient-text">Nossos Diferenciais</h1>
          <p>Superamos as expectativas com tecnologia de ponta, segurança inabalável e uma experiência de atendimento que coloca sua empresa em outro patamar.</p>
        </div>
      </div>
    </section>

    <section class="diff-grid-section">
      <div class="container">
        <div class="diff-grid">
          <div class="diff-card glass">
            <div class="icon-wrapper">
              <i class="fa-solid fa-shield-halved"></i>
            </div>
            <h3>WhatsApp Sem Bloqueios</h3>
            <p>Utilizamos APIs oficiais e técnicas avançadas de aquecimento para garantir que sua comunicação nunca seja interrompida. Segurança total para sua base de clientes.</p>
          </div>

          <div class="diff-card glass">
            <div class="icon-wrapper">
              <i class="fa-solid fa-brain"></i>
            </div>
            <h3>IA de Quarta Geração</h3>
            <p>Integração nativa com GPT-4o e Claude 3.5. Nossa IA não apenas responde, ela entende o contexto, aprende com seu histórico e resolve problemas reais do cliente.</p>
          </div>

          <div class="diff-card glass">
            <div class="icon-wrapper">
              <i class="fa-solid fa-layer-group"></i>
            </div>
            <h3>Multicanal Verdadeiro</h3>
            <p>Esqueça a troca de abas. Centralize WhatsApp, Instagram DM, Facebook Messenger, Telegram e E-mail em uma única tela fluida e ultra-rápida.</p>
          </div>

          <div class="diff-card glass">
            <div class="icon-wrapper">
              <i class="fa-solid fa-code"></i>
            </div>
            <h3>Conectividade Total</h3>
            <p>API robusta e Webhooks instantâneos. Conecte a Nyvlo ao seu CRM, ERP ou qualquer ferramenta proprietária em poucos minutos com documentação Swagger completa.</p>
          </div>

          <div class="diff-card glass">
            <div class="icon-wrapper">
              <i class="fa-solid fa-chart-line"></i>
            </div>
            <h3>BI & Analytics PRO</h3>
            <p>Dashboards que transformam dados em lucro. Visualize tempo de resposta, taxa de conversão e satisfação do cliente com relatórios exportáveis e métricas em tempo real.</p>
          </div>

          <div class="diff-card glass">
            <div class="icon-wrapper">
              <i class="fa-solid fa-server"></i>
            </div>
            <h3>Uptime & Escalabilidade</h3>
            <p>Infraestrutura em nuvem preparada para escalar. Suporte de 1 a 1.000 atendentes simultâneos com estabilidade garantida de 99.9% e segurança nível bancário.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <div class="cta-box glass">
          <h2 class="brand-gradient-text">Sinta a Diferença na Prática</h2>
          <p>A tecnologia que sua empresa precisa para escalar com qualidade e segurança.</p>
          <div class="cta-actions">
            <RouterLink to="/checkout" class="btn-main bg-gradient">Começar Agora</RouterLink>
            <RouterLink to="/contact" class="btn-outline">Falar com Consultor</RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.differentials-page {
  background: var(--background);
}

.diff-hero {
  height: 65vh;
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
  inset: 0;
  background: linear-gradient(to bottom, rgba(8, 12, 24, 0.4), var(--background));
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
  letter-spacing: 0.3em;
  color: var(--vibrant-green);
  margin-bottom: 1rem;
}

.diff-hero h1 {
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  font-weight: 900;
  margin-bottom: 1.5rem;
}

.diff-hero p {
  font-size: 1.25rem;
  color: var(--text-muted);
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;
}

.diff-grid-section {
  padding: 8rem 0;
}

.diff-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.5rem;
}

.diff-card {
  padding: 3.5rem 2.5rem;
  border-radius: 2rem;
  transition: all 0.4s ease;
  border: 1px solid rgba(255, 255, 255, 0.05);
  height: 100%;
}

.diff-card:hover {
  transform: translateY(-8px);
  border-color: rgba(89, 195, 72, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.icon-wrapper {
  width: 60px;
  height: 60px;
  background: rgba(89, 195, 72, 0.1);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
  color: var(--vibrant-green);
  font-size: 1.5rem;
  transition: all 0.3s ease;
}

.diff-card:hover .icon-wrapper {
  background: var(--vibrant-green);
  color: white;
  transform: rotate(10deg);
}

.diff-card h3 {
  font-size: 1.4rem;
  font-weight: 800;
  margin-bottom: 1rem;
  color: white;
}

.diff-card p {
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1.6;
}

.cta-section {
  padding-bottom: 12rem;
}

.cta-box {
  padding: 6rem;
  border-radius: 3rem;
  text-align: center;
  background: radial-gradient(circle at top right, rgba(89, 195, 72, 0.05), transparent);
}

.cta-box h2 {
  font-size: 3rem;
  font-weight: 900;
  margin-bottom: 1.5rem;
}

.cta-box p {
  font-size: 1.2rem;
  color: var(--text-muted);
  margin-bottom: 3rem;
}

.cta-actions {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
}

.btn-main, .btn-outline {
  padding: 1.2rem 3rem;
  border-radius: 1rem;
  font-weight: 800;
  text-decoration: none;
  transition: all 0.3s ease;
}

.btn-main:hover {
  transform: translateY(-3px);
  filter: brightness(1.1);
}

.btn-outline {
  border: 1px solid var(--border);
  color: white;
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: white;
}

@media (max-width: 1100px) {
  .diff-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .diff-grid { grid-template-columns: 1fr; }
  .cta-box { padding: 4rem 2rem; }
  .cta-box h2 { font-size: 2.2rem; }
  .cta-actions { flex-direction: column; }
  .diff-hero { height: auto; padding: 10rem 0; }
}
</style>
