<script setup>
import ContactForm from '../components/ContactForm.vue'
</script>

<template>
  <div class="demo-view animate-fade-in">
    <div class="container">
      <div class="demo-header text-center">
        <span class="sub-label">Experiência Digital</span>
        <h1>Agente uma demonstração <span class="brand-gradient-text">personalizada</span></h1>
        <p>Veja na prática como a Nyvlo pode transformar seu atendimento e escalar suas vendas com IA e tecnologia Omnichannel de elite.</p>
      </div>
      
      <div class="demo-content">
        <ContactForm />
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-view {
  padding-top: 220px;
  padding-bottom: 120px;
}

.demo-header {
  margin-bottom: 6rem;
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

h1 {
  font-size: 4rem;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 2rem;
  color: white;
}

p {
  font-size: 1.25rem;
  color: var(--text-muted);
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.6;
}

.demo-content {
  max-width: 900px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  h1 { font-size: 3.5rem; }
}

@media (max-width: 768px) {
  .demo-view {
    padding-top: 160px;
  }
  
  h1 {
    font-size: 2.5rem;
  }

  .demo-header {
    margin-bottom: 4rem;
  }
}
</style>
