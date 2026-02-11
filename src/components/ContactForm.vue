<script setup>
import { ref } from 'vue';
import contactBg from '../assets/backgrounds/contact_bg.webp';

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
  
  // URL da API do Nivlo - Configurável via ambiente
  const apiUrl = import.meta.env.VITE_API_DEMO_URL || 'https://api.nivlo.com/v1/demo-request';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(form.value)
    });

    if (!response.ok) {
      throw new Error('Falha na comunicação com o servidor');
    }

    // Sucesso no envio
    showSuccess.value = true;
    
    // Reset do formulário apenas após o sucesso
    const userName = form.value.name.split(' ')[0];
    localStorage.setItem('last_demo_request', JSON.stringify({
      name: userName,
      date: new Date().toISOString()
    }));

    form.value = {
      name: '',
      email: '',
      phone: '',
      companySize: '',
      message: ''
    };
  } catch (error) {
    console.error('Erro na integração:', error);
    alert('Ops! Tivemos um problema temporário ao processar sua solicitação. Por favor, tente novamente em alguns instantes ou nos chame no WhatsApp.');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <section id="contact" class="contact" :style="{ backgroundImage: `url(${contactBg})` }">
    <div class="contact-overlay"></div>
    
    <div class="container relative-z">
      <div class="contact-card glass animate-fade-in">
        <div class="contact-header">
          <span class="sub-label">Fale Conosco</span>
          <h2 class="brand-gradient-text">Solicite uma Demo</h2>
          <p>Preencha os dados abaixo e descubra como a Nyvlo pode transformar seu atendimento.</p>
        </div>

        <form @submit.prevent="handleSubmit" class="contact-form" v-if="!showSuccess">
          <div class="form-group">
            <label for="name">Nome Completo</label>
            <input 
              type="text" 
              id="name" 
              v-model="form.name" 
              placeholder="João Silva" 
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
                placeholder="joao@empresa.com" 
                required
              />
            </div>
            <div class="form-group">
              <label for="phone">WhatsApp</label>
              <input 
                type="tel" 
                id="phone" 
                v-model="form.phone" 
                placeholder="(11) 99999-9999" 
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
              placeholder="Como podemos ajudar sua empresa?"
              rows="4"
            ></textarea>
          </div>

          <button type="submit" class="btn-submit bg-gradient" :disabled="isSubmitting">
            <span v-if="!isSubmitting">Solicitar Demonstração</span>
            <span v-else class="process-box">
              <span class="loader"></span>
              Processando...
            </span>
          </button>
        </form>

        <div v-else class="success-message animate-fade-in">
          <div class="success-icon-wrapper bg-gradient">
            <div class="success-icon">✓</div>
          </div>
          <h3>Acesso em Processamento!</h3>
          <p>Recebemos sua solicitação. Nosso sistema está preparando seu ambiente de demonstração e você receberá as instruções em instantes via E-mail e WhatsApp.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.contact {
  padding: 10rem 0;
  position: relative;
  overflow: hidden;
  background-color: var(--background);
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
  background: rgba(8, 12, 24, 0.8);
  z-index: 0;
}

.relative-z {
  position: relative;
  z-index: 2;
}

.contact-card {
  max-width: 680px;
  margin: 0 auto;
  padding: 3.5rem;
  border-radius: 2.5rem;
  box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.contact-header {
  text-align: center;
  margin-bottom: 4rem;
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

.contact-header h2 {
  font-size: 2.25rem;
  margin-bottom: 1rem;
  font-weight: 900;
}

.contact-header p {
  color: var(--text-muted);
  font-size: 1.1rem;
  max-width: 500px;
  margin: 0 auto;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-row {
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
  color: var(--foreground);
  opacity: 0.8;
  padding-left: 0.5rem;
}

input, select, textarea {
  padding: 0.9rem 1.2rem;
  border-radius: 0.8rem;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: white;
  font-family: inherit;
  font-size: 1rem;
  transition: all 0.3s ease;
}

input::placeholder, textarea::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--vibrant-green);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 0 4px rgba(89, 195, 72, 0.1);
}

select option {
  background: var(--background);
  color: white;
}

.btn-submit {
  padding: 1rem;
  border-radius: 0.8rem;
  color: white;
  font-weight: 800;
  font-size: 1.1rem;
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 10px 20px rgba(29, 61, 107, 0.3);
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow: 0 15px 30px rgba(29, 61, 107, 0.4);
  filter: brightness(1.1);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.success-message {
  text-align: center;
  padding: 3rem 0;
}

.success-icon-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2.5rem;
  box-shadow: 0 20px 40px rgba(89, 195, 72, 0.2);
}

.success-icon {
  color: white;
  font-size: 3rem;
  font-weight: 900;
}

.success-message h3 {
  font-size: 2.25rem;
  margin-bottom: 1.2rem;
  font-weight: 900;
}

.success-message p {
  color: var(--text-muted);
  font-size: 1.15rem;
  line-height: 1.6;
}

.loader {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.45; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); }
}

@media (max-width: 1024px) {
  .contact-card { padding: 4rem 3rem; }
}

@media (max-width: 768px) {
  .contact { padding: 6rem 0; }
  
  .contact-card {
    padding: 3rem 1.5rem;
    border-radius: 2rem;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .contact-header h2 {
    font-size: 2.25rem;
  }
}
</style>
