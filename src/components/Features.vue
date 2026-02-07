<template>
  <section id="features" class="features">
    <div class="container">
      <div class="features-header animate-fade-in">
        <span class="sub-label">Recursos Premium</span>
        <h2>Recursos que <span class="brand-gradient-text">impulsionam</span> seu negócio</h2>
        <p>Tudo que você precisa para oferecer um atendimento excepcional com tecnologia de ponta.</p>
      </div>
      
      <div class="features-grid">
        <div class="feature-card glass animate-fade-in" style="animation-delay: 0.1s;">
          <div class="feature-icon-wrapper">
            <div class="feature-icon">💬</div>
          </div>
          <h3>Omnichannel</h3>
          <p>Unifique WhatsApp, Instagram, Facebook Messenger, Email e SMS em uma única plataforma robusta.</p>
        </div>
        
        <div class="feature-card glass animate-fade-in" style="animation-delay: 0.2s;">
          <div class="feature-icon-wrapper secondary">
            <div class="feature-icon">🤖</div>
          </div>
          <h3>IA Integrada</h3>
          <p>Chatbots inteligentes e automação que aprendem com cada interação para otimizar seus processos.</p>
        </div>
        
        <div class="feature-card glass animate-fade-in" style="animation-delay: 0.3s;">
          <div class="feature-icon-wrapper accent">
            <div class="feature-icon">📊</div>
          </div>
          <h3>Analytics Avançado</h3>
          <p>Métricas em tempo real e relatórios detalhados para decisões baseadas em dados precisos.</p>
        </div>
        
        <div class="feature-card glass animate-fade-in" style="animation-delay: 0.4s;">
          <div class="feature-icon-wrapper">
            <div class="feature-icon">⚡</div>
          </div>
          <h3>Automação</h3>
          <p>Workflows personalizados que automatizam tarefas repetitivas e multiplicam a produtividade.</p>
        </div>
        
        <div class="feature-card glass animate-fade-in" style="animation-delay: 0.5s;">
          <div class="feature-icon-wrapper secondary">
            <div class="feature-icon">👥</div>
          </div>
          <h3>Gestão de Equipe</h3>
          <p>Distribua conversas automaticamente e monitore o desempenho do seu time em tempo real.</p>
        </div>
        
        <div class="feature-card glass animate-fade-in" style="animation-delay: 0.6s;">
          <div class="feature-icon-wrapper accent">
            <div class="feature-icon">🔒</div>
          </div>
          <h3>Segurança Total</h3>
          <p>Criptografia de ponta a ponta e conformidade com LGPD para máxima proteção de dados.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features {
  background: var(--background);
  padding: 10rem 0;
  position: relative;
}

.features-header {
  text-align: center;
  max-width: 800px;
  margin: 0 auto 6rem;
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

.features-header h2 {
  font-size: 3.5rem;
  margin-bottom: 2rem;
  font-weight: 900;
  color: white;
}

.features-header p {
  font-size: 1.25rem;
  color: var(--text-muted);
  line-height: 1.6;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.5rem;
}

.feature-card {
  padding: 3rem;
  border-radius: 2rem;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  position: relative;
  overflow: hidden;
}

.feature-card:hover {
  transform: translateY(-10px);
  border-color: var(--vibrant-green);
  background: rgba(255, 255, 255, 0.05);
}

.feature-icon-wrapper {
  width: 64px;
  height: 64px;
  background: rgba(29, 61, 107, 0.1);
  border-radius: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2.5rem;
  border: 1px solid rgba(29, 61, 107, 0.2);
}

.feature-icon-wrapper.secondary {
  background: rgba(89, 195, 72, 0.1);
  border: 1px solid rgba(89, 195, 72, 0.2);
}

.feature-icon-wrapper.accent {
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.feature-icon {
  font-size: 2rem;
}

.feature-card h3 {
  font-size: 1.75rem;
  margin-bottom: 1.2rem;
  color: white;
  font-weight: 800;
}

.feature-card p {
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--text-muted);
}

@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .features {
    padding: 6rem 0;
  }
  
  .features-header h2 {
    font-size: 2.5rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .feature-card {
    padding: 2.5rem;
  }
}
</style>
