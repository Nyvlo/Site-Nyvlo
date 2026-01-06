<template>
  <section id="hero" class="hero">
    <div class="container hero-container">
      <div class="hero-content animate-fade-in">
        <span class="badge">Lançamento v2.0</span>
        <h1>Controle total do seu atendimento <span class="text-gradient">Omnichannel</span></h1>
        <p>A plataforma mais completa para escalar suas vendas e atendimento com IA, múltiplos canais e automação inteligente.</p>
        <div class="hero-actions">
          <button class="btn-cta bg-gradient">Começar agora</button>
          <button class="btn-secondary">Ver demonstração</button>
        </div>
      </div>
      
      <div class="hero-visual animate-fade-in" style="animation-delay: 0.2s;">
        <div class="hero-card-glow"></div>
        <div class="hero-card glass">
           <div class="card-header">
             <div class="dots"><span></span><span></span><span></span></div>
           </div>
           <div class="card-body">
              <div class="skeleton-line" style="width: 70%"></div>
              <div class="skeleton-line" style="width: 40%"></div>
              <div class="skeleton-grid">
                <div class="skeleton-item"></div>
                <div class="skeleton-item"></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  padding-top: 12rem;
}

.hero-container {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 4rem;
  align-items: center;
}

.badge {
  display: inline-block;
  padding: 0.4rem 1rem;
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 100px;
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

h1 {
  font-size: 4rem;
  line-height: 1.1;
  margin-bottom: 1.5rem;
}

p {
  font-size: 1.2rem;
  color: var(--text-muted);
  margin-bottom: 2.5rem;
  max-width: 540px;
}

.hero-actions {
  display: flex;
  gap: 1.5rem;
}

.btn-cta {
  padding: 1rem 2rem;
  border-radius: 12px;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  box-shadow: 0 10px 20px -5px rgba(124, 58, 237, 0.4);
}

.btn-secondary {
  padding: 1rem 2rem;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  color: var(--text);
  font-weight: 600;
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
  background: radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%);
  filter: blur(40px);
}

.hero-card {
  height: 400px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.card-header {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
}

.dots {
  display: flex;
  gap: 6px;
}

.dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.card-body {
  padding: 2rem;
  flex: 1;
}

.skeleton-line {
  height: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  margin-bottom: 1rem;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 2rem;
}

.skeleton-item {
  height: 100px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
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
