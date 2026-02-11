<script setup>
import { onMounted } from 'vue';
// Reusing the same background for consistency or a new one if available
import heroBg from '../assets/backgrounds/hero_bg.webp'; 

onMounted(() => {
  window.scrollTo(0, 0);
});
</script>

<template>
  <div class="about-page">
    <!-- Hero Section -->
    <section class="about-hero" :style="{ backgroundImage: `url(${heroBg})` }">
      <div class="overlay"></div>
      <div class="container relative-z">
        <div class="content animate-fade-in">
          <span class="badge">Nossa Essência</span>
          <h1>Revolucionando a <span class="brand-gradient-text">Comunicação</span></h1>
          <p class="hero-text">
            A Nyvlo nasceu com um propósito claro: eliminar as barreiras entre empresas e clientes, 
            transformando cada interação em uma oportunidade de crescimento.
          </p>
        </div>
      </div>
    </section>

    <!-- Mission & Values Section -->
    <section class="mission-section">
      <div class="container">
        <div class="grid-layout">
          <div class="text-block glass animate-fade-in" style="animation-delay: 0.2s;">
            <h3>Nossa Missão</h3>
            <p>
              Simplificar o complexo. Em um mundo ruidoso, oferecemos clareza. 
              Nossa plataforma Omnichannel não apenas centraliza mensagens; ela orquestra experiências. 
              Acreditamos que a tecnologia deve ser invisível, permitindo que a conexão humana brilhe.
            </p>
          </div>
          <div class="text-block glass animate-fade-in" style="animation-delay: 0.4s;">
            <h3>Nossa Visão</h3>
            <p>
              Ser a espinha dorsal da comunicação empresarial moderna. 
              Visualizamos um futuro onde o atendimento é proativo, inteligente e, acima de tudo, humano. 
              Onde cada empresa, independentemente do tamanho, tem o poder de grandes corporações.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Values Grid -->
    <section class="values-section">
      <div class="container">
        <h2 class="section-title">Nossos Pilares</h2>
        <div class="values-grid">
          <div class="value-card glass">
            <div class="icon">🚀</div>
            <h4>Inovação Contínua</h4>
            <p>Não seguimos tendências, nós as criamos. Estamos sempre um passo à frente.</p>
          </div>
          <div class="value-card glass">
            <div class="icon">🤝</div>
            <h4>Sucesso do Cliente</h4>
            <p>Seu crescimento é o nosso combustível. Somos parceiros, não apenas fornecedores.</p>
          </div>
          <div class="value-card glass">
            <div class="icon">💎</div>
            <h4>Excelência</h4>
            <p>O "bom" é inimigo do ótimo. Buscamos a perfeição em cada linha de código.</p>
          </div>
          <div class="value-card glass">
            <div class="icon">🛡️</div>
            <h4>Transparência</h4>
            <p>Confiança é a base de tudo. Operamos com clareza e integridade absoluta.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  background-color: var(--background);
  min-height: 100vh;
}

.about-hero {
  position: relative;
  padding: 12rem 0 8rem;
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  text-align: center;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, rgba(8, 12, 24, 0.8) 0%, var(--background) 100%);
  z-index: 0;
}

.relative-z {
  position: relative;
  z-index: 2;
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
  margin-bottom: 1.5rem;
  backdrop-filter: blur(10px);
}

h1 {
  font-size: 4rem;
  font-weight: 900;
  margin-bottom: 2rem;
  line-height: 1.1;
  color: white;
}

.hero-text {
  font-size: 1.25rem;
  color: var(--text-muted);
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.8;
}

.mission-section {
  padding: 4rem 0;
}

.grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
}

.text-block {
  padding: 3rem;
  border-radius: 2rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.text-block h3 {
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: white;
  font-weight: 800;
}

.text-block p {
  color: var(--text-muted);
  line-height: 1.7;
  font-size: 1.1rem;
}

.values-section {
  padding: 6rem 0 10rem;
}

.section-title {
  text-align: center;
  font-size: 3rem;
  font-weight: 900;
  color: white;
  margin-bottom: 4rem;
}

.values-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
}

.value-card {
  padding: 2.5rem 1.5rem;
  border-radius: 1.5rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.3s ease;
}

.value-card:hover {
  transform: translateY(-10px);
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--vibrant-green);
}

.icon {
  font-size: 3rem;
  margin-bottom: 1.5rem;
}

.value-card h4 {
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.value-card p {
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
}

@media (max-width: 1024px) {
  h1 { font-size: 3rem; }
  .grid-layout { grid-template-columns: 1fr; }
  .values-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 768px) {
  .about-hero { padding: 8rem 0 4rem; }
  h1 { font-size: 2.5rem; }
  .values-grid { grid-template-columns: 1fr; }
}
</style>
