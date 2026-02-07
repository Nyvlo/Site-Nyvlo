<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import heroDashboard from '../assets/hero-dashboard.png';
import heroMultichannel from '../assets/hero-multichannel.png';
import heroAi from '../assets/hero-ai.png';
import heroBg from '../assets/hero-bg.png';

const currentSlide = ref(0);
const images = [
  { src: heroDashboard, alt: 'Dashboard Omnichannel' },
  { src: heroMultichannel, alt: 'Hub Multi-canal' },
  { src: heroAi, alt: 'Automação com IA' }
];

let interval;

onMounted(() => {
  interval = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % images.length;
  }, 4000);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>

<template>
  <section id="hero" class="hero" :style="{ backgroundImage: `url(${heroBg})` }">
    <div class="hero-bg-overlay"></div>
    <div class="container">
      <div class="hero-container">
        <div class="hero-content animate-fade-in">

          <span class="badge">Lançamento v2.0</span>
          <h1>Controle total do seu atendimento <span class="text-gradient">Omnichannel</span></h1>
          <p>A plataforma mais completa para escalar suas vendas e atendimento com IA, múltiplos canais e automação inteligente.</p>
          <div class="hero-actions">
            <RouterLink to="/solicitar-demo" class="btn-cta bg-gradient">Começar agora</RouterLink>
            <a href="#contact" class="btn-secondary">Ver demonstração</a>
          </div>
        </div>
        
        <div class="hero-visual animate-fade-in" style="animation-delay: 0.2s;">
          <div class="hero-card-glow"></div>
          <div class="hero-card">
            <div class="carousel">
              <img 
                v-for="(image, index) in images" 
                :key="index"
                :src="image.src" 
                :alt="image.alt" 
                class="hero-showcase-img"
                :class="{ active: currentSlide === index }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="hero-bottom-shadow"></div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  padding-top: 16rem;
  padding-bottom: 10rem;
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  color: white;
}

.hero-bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.6) 100%);
  z-index: 1;
}

.hero .container {
  position: relative;
  z-index: 2;
}

.hero-bottom-shadow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 150px;
  background: linear-gradient(to top, var(--bg) 0%, transparent 100%);
  z-index: 3;
}

.hero-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6rem;
  align-items: center;
}





.badge {
  display: inline-block;
  padding: 0.4rem 1rem;
  background: rgba(37, 211, 102, 0.1);
  border: 1px solid rgba(37, 211, 102, 0.2);
  border-radius: 100px;
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

h1 {
  font-size: 4.5rem;
  line-height: 1.05;
  margin-bottom: 2rem;
  font-weight: 800;
  color: white;
}

p {
  font-size: 1.25rem;
  line-height: 1.6;
  color: var(--text-muted);
  margin-bottom: 3rem;
  max-width: 600px;
}

.hero-actions {
  display: flex;
  gap: 1.5rem;
}

.btn-cta {
  display: inline-block;
  padding: 1rem 2rem;
  border-radius: 12px;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  box-shadow: 0 10px 20px -5px rgba(37, 211, 102, 0.4);
  text-align: center;
}

.btn-secondary {
  display: inline-block;
  padding: 1rem 2rem;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  color: var(--text);
  font-weight: 600;
  text-align: center;
}

.hero-visual {
  position: relative;
}

.hero-card-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120%;
  height: 120%;
  background: radial-gradient(circle, rgba(37, 211, 102, 0.2) 0%, transparent 70%);
  filter: blur(40px);
}

.hero-card {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
  background: white;
  border: 1px solid var(--surface-border);
  position: relative;
}

.carousel {
  width: 100%;
  height: 100%;
  position: relative;
}

.hero-showcase-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.8s ease-in-out;
}

.hero-showcase-img.active {
  opacity: 1;
}

@media (max-width: 1024px) {
  .hero-container {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  h1 { font-size: 3rem; }
  
  p { margin-left: auto; margin-right: auto; }
  
  .hero-actions { justify-content: center; }
  
  .hero-visual { display: none; }
}
</style>
