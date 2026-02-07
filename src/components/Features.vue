<template>
  <section id="features" class="features">
    <div class="container">
      <div class="features-header">
        <h2>Recursos que <span class="text-gradient">impulsionam</span> seu negócio</h2>
        <p>Tudo que você precisa para oferecer um atendimento excepcional</p>
      </div>
      
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">💬</div>
          <h3>Omnichannel</h3>
          <p>Unifique WhatsApp, Instagram, Facebook Messenger, Email e SMS em uma única plataforma.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">🤖</div>
          <h3>IA Integrada</h3>
          <p>Chatbots inteligentes e automação que aprendem com cada interação para melhorar o atendimento.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>Analytics Avançado</h3>
          <p>Métricas em tempo real e relatórios detalhados para tomar decisões baseadas em dados.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>Automação Inteligente</h3>
          <p>Workflows personalizados que automatizam tarefas repetitivas e aumentam a produtividade.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">👥</div>
          <h3>Gestão de Equipe</h3>
          <p>Distribua conversas automaticamente e monitore o desempenho da sua equipe em tempo real.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h3>Segurança Total</h3>
          <p>Criptografia de ponta a ponta e conformidade com LGPD para proteger seus dados.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features {
  background: var(--surface);
  padding: 8rem 0;
}

.features-header {
  text-align: center;
  max-width: 800px;
  margin: 0 auto 5rem;
}

.features-header h2 {
  font-size: 3rem;
  margin-bottom: 1.5rem;
  font-weight: 800;
}

.features-header p {
  font-size: 1.25rem;
  color: var(--text-muted);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.5rem;
}

.feature-card {
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  border: 1px solid var(--surface-border);
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
  border-color: var(--primary);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1.5rem;
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--text);
}

.feature-card p {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-muted);
}

@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .features {
    padding: 4rem 0;
  }
  
  .features-header h2 {
    font-size: 2rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}
</style>
