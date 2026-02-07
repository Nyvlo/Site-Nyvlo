<script setup>
import ContactForm from '../components/ContactForm.vue'
</script>

<template>
  <div class="demo-view container animate-fade-in">
    <div class="demo-header text-center">
      <span class="badge">Demo Gratuita</span>
      <h1>Agente uma demonstração <span class="text-gradient">personalizada</span></h1>
      <p>Veja na prática como a Nyvlo pode transformar seu atendimento e escalar suas vendas com IA e Omnichannel.</p>
    </div>
    
    <div class="demo-content">
      <ContactForm />
    </div>
  </div>
</template>

<style scoped>
.demo-view {
  padding-top: 180px;
  padding-bottom: 100px;
  max-width: 800px;
  margin: 0 auto;
}

.demo-header {
  margin-bottom: 4rem;
}

h1 {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  color: white;
}

p {
  font-size: 1.25rem;
  color: var(--text-muted);
  max-width: 600px;
  margin: 0 auto;
}

.demo-content {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3rem;
  border-radius: 24px;
}

@media (max-width: 768px) {
  .demo-view {
    padding-top: 140px;
  }
  
  h1 {
    font-size: 2.5rem;
  }
}
</style>
