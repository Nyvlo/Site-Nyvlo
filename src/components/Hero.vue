<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import heroDashboard from '../assets/hero-dashboard.png';
import heroMultichannel from '../assets/hero-multichannel.png';
import heroAi from '../assets/hero-ai.png';
// Import the new background image
import heroBg from '../assets/backgrounds/hero_bg.webp';

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
    <div class="hero-overlay"></div>
    
    <div class="container relative-z">
      <div class="hero-container">
        <div class="hero-content animate-fade-in">
          <span class="badge">Lançamento v2.0</span>
          <h1>Controle total do seu atendimento <span class="brand-gradient-text">Omnichannel</span></h1>
          <p>A excelência que seu cliente exige. Centralize seu atendimento e potencialize vendas com a mais avançada tecnologia de orquestração omnichannel.</p>
          <div class="hero-actions">
            <a href="#contact" class="btn-cta bg-gradient">Começar agora</a>
            <a href="#contact" class="btn-secondary glass">Ver demonstração</a>
          </div>
        </div>
        
        <div class="hero-visual animate-fade-in" style="animation-delay: 0.2s;">
          <div class="hero-card-glow"></div>
          <div class="hero-card glass">
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
  padding-top: 18rem;
  padding-bottom: 12rem;
  background-color: var(--background);
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  color: white;
}

.hero-overlay {
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

.hero-bottom-shadow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: linear-gradient(to top, var(--background) 0%, transparent 100%);
  z-index: 3;
}

.hero-container {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 4rem;
  align-items: center;
}

.badge {
  display: inline-block;
  padding: 0.5rem 1.2rem;
  background: rgba(89, 195, 72, 0.1);
  border: 1px solid rgba(89, 195, 72, 0.2);
  border-radius: 100px;
  color: var(--vibrant-green);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
}

h1 {
  font-size: 5rem;
  line-height: 1;
  margin-bottom: 2.5rem;
  font-weight: 900;
  color: white;
}

p {
  font-size: 1.25rem;
  line-height: 1.6;
  color: var(--text-muted);
  margin-bottom: 3.5rem;
  max-width: 600px;
}

.hero-actions {
  display: flex;
  gap: 1.5rem;
}

.btn-cta {
  display: inline-block;
  padding: 1.2rem 2.5rem;
  border-radius: 16px;
  color: white;
  font-weight: 800;
  font-size: 1.1rem;
  box-shadow: 0 10px 25px rgba(29, 61, 107, 0.4);
  text-align: center;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.btn-cta:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 20px 35px rgba(29, 61, 107, 0.5);
}

.btn-secondary {
  display: inline-block;
  padding: 1.2rem 2.5rem;
  border-radius: 16px;
  color: white;
  font-weight: 700;
  text-align: center;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.hero-visual {
  position: relative;
}

.hero-card-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 130%;
  height: 130%;
  background: radial-gradient(circle, rgba(29, 61, 107, 0.3) 0%, transparent 70%);
  filter: blur(60px);
}

.hero-card {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 2rem;
  overflow: hidden;
  box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.5);
  position: relative;
  padding: 0.5rem;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.carousel {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 1.5rem;
  overflow: hidden;
}

.hero-showcase-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero-showcase-img.active {
  opacity: 1;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-30px) scale(1.05); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.1); }
}

@media (max-width: 1200px) {
  h1 { font-size: 4rem; }
}

@media (max-width: 1024px) {
  .hero { padding-top: 14rem; }
  
  .hero-container {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 6rem;
  }
  
  h1 { font-size: 3.5rem; }
  
  p { margin-left: auto; margin-right: auto; }
  
  .hero-actions { justify-content: center; }
  
  .hero-visual { 
    max-width: 800px;
    margin: 0 auto;
  }
}

@media (max-width: 768px) {
  h1 { font-size: 2.8rem; }
  .btn-cta, .btn-secondary { padding: 1rem 1.8rem; width: 100%; }
  .hero-actions { flex-direction: column; }
}
</style>
