<script setup>
import { ref } from 'vue';

const form = ref({
  name: '',
  email: '',
  phone: '',
  companySize: '',
  message: ''
});

const isSubmitting = ref(false);
const showSuccess = ref(false);

const handleSubmit = async () => {
  isSubmitting.value = true;
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500));
  isSubmitting.value = false;
  showSuccess.value = true;
  
  // Reset form after 3 seconds
  setTimeout(() => {
    showSuccess.value = false;
    form.value = {
      name: '',
      email: '',
      phone: '',
      companySize: '',
      message: ''
    };
  }, 3000);
};
</script>

<template>
  <section id="contact" class="contact">
    <div class="container">
      <div class="contact-card glass animate-fade-in">
        <div class="contact-header">
          <h2 class="text-gradient">Solicite uma Demonstração</h2>
          <p>Preencha os dados abaixo e entraremos em contato para apresentar a Nyvlo.</p>
        </div>

        <form @submit.prevent="handleSubmit" class="contact-form" v-if="!showSuccess">
          <div class="form-group">
            <label for="name">Nome Completo</label>
            <input 
              type="text" 
              id="name" 
              v-model="form.name" 
              placeholder="Ex: João Silva" 
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="email">E-mail Corporativo</label>
              <input 
                type="email" 
                id="email" 
                v-model="form.email" 
                placeholder="Ex: joao@empresa.com" 
                required
              />
            </div>
            <div class="form-group">
              <label for="phone">WhatsApp / Telefone</label>
              <input 
                type="tel" 
                id="phone" 
                v-model="form.phone" 
                placeholder="Ex: (11) 99999-9999" 
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label for="companySize">Tamanho da Empresa</label>
            <select id="companySize" v-model="form.companySize" required>
              <option value="" disabled selected>Selecione uma opção</option>
              <option value="1-5">1 a 5 funcionários</option>
              <option value="6-20">6 a 20 funcionários</option>
              <option value="21-50">21 a 50 funcionários</option>
              <option value="51-200">51 a 200 funcionários</option>
              <option value="200+">Mais de 200 funcionários</option>
            </select>
          </div>

          <div class="form-group">
            <label for="message">Mensagem (Opcional)</label>
            <textarea 
              id="message" 
              v-model="form.message" 
              placeholder="Fale um pouco sobre sua necessidade..."
              rows="4"
            ></textarea>
          </div>

          <button type="submit" class="btn-submit bg-gradient" :disabled="isSubmitting">
            <span v-if="!isSubmitting">Solicitar Demo Grátis</span>
            <span v-else class="loader"></span>
          </button>
        </form>

        <div v-else class="success-message animate-fade-in">
          <div class="success-icon">✓</div>
          <h3>Solicitação Enviada!</h3>
          <p>Obrigado pelo interesse, {{ form.name.split(' ')[0] }}. Em breve um de nossos consultores entrará em contato.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.contact {
  padding: 6rem 0;
  background: radial-gradient(circle at top right, rgba(37, 211, 102, 0.05) 0%, transparent 40%);
}

.contact-card {
  max-width: 800px;
  margin: 0 auto;
  padding: 4rem;
  border-radius: 32px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.05);
}

.contact-header {
  text-align: center;
  margin-bottom: 3rem;
}

.contact-header h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.contact-header p {
  color: var(--text-muted);
  font-size: 1.1rem;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

input, select, textarea {
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--surface-border);
  background: var(--surface);
  color: var(--text);
  font-family: inherit;
  font-size: 1rem;
  transition: all 0.2s ease;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(37, 211, 102, 0.1);
}

.btn-submit {
  padding: 1.2rem;
  border-radius: 12px;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -5px rgba(37, 211, 102, 0.4);
}

.btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.success-message {
  text-align: center;
  padding: 2rem 0;
}

.success-icon {
  width: 80px;
  height: 80px;
  background: var(--primary);
  color: white;
  font-size: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin: 0 auto 2rem;
  box-shadow: 0 10px 20px -5px rgba(37, 211, 102, 0.4);
}

.success-message h3 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.success-message p {
  color: var(--text-muted);
  font-size: 1.1rem;
}

.loader {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .contact-card {
    padding: 2rem;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .contact-header h2 {
    font-size: 2rem;
  }
}
</style>
