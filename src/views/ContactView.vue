<script setup>
import { ref } from 'vue';
import contactBg from '../assets/backgrounds/contact_bg.webp'; // Placeholder or use the generated one if copied
// For now, I'll use the one I just generated but I need to make sure the path is correct in the final code
// Integration note: I'll use a local import if I copy the file to assets
</script>

<template>
  <div class="contact-page">
    <div class="contact-overlay"></div>
    <div class="container contact-content">
      <div class="contact-card glass animate-fade-in">
        <div class="contact-header">
          <span class="sub-label">Fale Conosco</span>
          <h1 class="brand-gradient-text">Como podemos ajudar?</h1>
          <p>Envie sua mensagem e nosso time de especialistas entrará em contato em breve.</p>
        </div>

        <form @submit.prevent="handleSubmit" class="contact-form">
          <div class="form-grid">
            <div class="form-group">
              <label>Nome Completo</label>
              <input type="text" placeholder="Seu nome" required />
            </div>
            <div class="form-group">
              <label>E-mail</label>
              <input type="email" placeholder="seu@email.com" required />
            </div>
          </div>
          
          <div class="form-group">
            <label>Assunto</label>
            <input type="text" placeholder="Em que podemos ajudar?" required />
          </div>

          <div class="form-group">
            <label>Mensagem</label>
            <textarea placeholder="Escreva sua mensagem aqui..." rows="5" required></textarea>
          </div>

          <button type="submit" class="btn-submit bg-gradient">
            <span v-if="!isSubmitting">Enviar Mensagem</span>
            <span v-else class="loader"></span>
          </button>
         forms
        </form>

        <div v-if="submitted" class="success-message animate-fade-in">
          <div class="success-icon">✓</div>
          <h3>Mensagem enviada!</h3>
          <p>Obrigado pelo contato. Responderemos o mais rápido possível.</p>
        </div>
      </div>

      <div class="contact-info animate-fade-in" style="animation-delay: 0.2s;">
        <div class="info-card glass">
          <div class="info-icon">📍</div>
          <div class="info-text">
            <h4>Localização</h4>
            <p>São Paulo, SP - Brasil</p>
          </div>
        </div>
        <div class="info-card glass">
          <div class="info-icon">✉️</div>
          <div class="info-text">
            <h4>E-mail</h4>
            <p>contato@nyvlo.com</p>
          </div>
        </div>
        <div class="info-card glass">
          <div class="info-icon">📱</div>
          <div class="info-text">
            <h4>WhatsApp</h4>
            <p>+55 (11) 99999-9999</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isSubmitting: false,
      submitted: false
    }
  },
  methods: {
    async handleSubmit() {
      this.isSubmitting = true;
      await new Promise(resolve => setTimeout(resolve, 1500));
      this.isSubmitting = false;
      this.submitted = true;
      setTimeout(() => {
        this.submitted = false;
      }, 5000);
    }
  }
}
</script>

<style scoped>
.contact-page {
  min-height: 100vh;
  padding: 12rem 0 8rem;
  position: relative;
  background-color: var(--background);
  background-image: url('../assets/backgrounds/contact_view_bg.png');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

.contact-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(8, 12, 24, 0.9) 0%, rgba(8, 12, 24, 0.8) 100%);
  z-index: 1;
}

.contact-content {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 4rem;
  align-items: start;
}

.contact-card {
  padding: 4rem;
  border-radius: 3rem;
}

.contact-header {
  margin-bottom: 3rem;
}

.sub-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  color: var(--vibrant-green);
  margin-bottom: 1rem;
}

.contact-header h1 {
  font-size: 3rem;
  font-weight: 900;
  margin-bottom: 1.5rem;
  line-height: 1.1;
}

.contact-header p {
  color: var(--text-muted);
  font-size: 1.1rem;
  max-width: 500px;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 700;
  opacity: 0.8;
  padding-left: 0.5rem;
}

input, textarea {
  padding: 1.1rem 1.5rem;
  border-radius: 1.2rem;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;
}

input:focus, textarea:focus {
  outline: none;
  border-color: var(--vibrant-green);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 20px rgba(89, 195, 72, 0.1);
}

.btn-submit {
  padding: 1.2rem;
  border-radius: 1.2rem;
  font-weight: 800;
  color: white;
  margin-top: 1rem;
  transition: all 0.3s ease;
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(89, 195, 72, 0.3);
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 2.5rem;
  border-radius: 2rem;
  transition: all 0.3s ease;
}

.info-card:hover {
  transform: translateX(10px);
  border-color: var(--vibrant-green);
}

.info-icon {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(89, 195, 72, 0.1);
  border-radius: 1.2rem;
}

.info-text h4 {
  font-size: 1.1rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.info-text p {
  color: var(--text-muted);
  font-size: 1rem;
}

.success-message {
  text-align: center;
  padding: 2rem;
  background: rgba(89, 195, 72, 0.1);
  border: 1px solid var(--vibrant-green);
  border-radius: 2rem;
  margin-top: 2rem;
}

.success-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

@media (max-width: 1024px) {
  .contact-content {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
}

@media (max-width: 768px) {
  .contact-page { padding: 10rem 0 6rem; }
  .form-grid { grid-template-columns: 1fr; }
  .contact-card { padding: 2.5rem 1.5rem; }
  .contact-header h1 { font-size: 2.5rem; }
}
</style>
