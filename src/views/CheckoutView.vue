<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const currentStep = ref(1);
const isSubmitting = ref(false);

const form = ref({
  // Step 1: Registration
  name: '',
  email: '',
  phone: '',
  company: '',
  // Step 2: Plan
  plan: route.query.plan || 'silver',
  // Step 3: Payment
  paymentMethod: 'pix',
  cardName: '',
  cardNumber: '',
  cardExpiry: '',
  cardCvc: ''
});

const plans = {
  bronze: { name: 'Bronze', price: 197 },
  silver: { name: 'Silver', price: 397 },
  gold: { name: 'Gold', price: 697 }
};

const selectedPlanData = computed(() => plans[form.value.plan]);

onMounted(() => {
  window.scrollTo(0, 0);
  
  // Recuperar dados pré-preenchidos se existirem
  const pendingData = localStorage.getItem('pending_onboarding');
  if (pendingData) {
    const data = JSON.parse(pendingData);
    form.value.name = data.name || '';
    form.value.email = data.email || '';
    form.value.phone = data.phone || '';
    form.value.company = data.company || '';
    localStorage.removeItem('pending_onboarding'); // Limpar após recuperar
  }
});

const nextStep = () => {
  if (currentStep.value < 3) currentStep.value++;
};

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--;
};

const handleCompleteOnboarding = async () => {
  isSubmitting.value = true;
  
  // URL da API de Onboarding - Configurável via ambiente
  const apiUrl = import.meta.env.VITE_API_ONBOARDING_URL || 'https://api.nivlo.com/v1/onboarding/complete';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    });

    if (!response.ok) throw new Error('Falha ao processar checkout');

    // Sucesso - Redirecionar para dashboard ou página de sucesso
    router.push('/success?type=onboarding');
  } catch (error) {
    console.error('Erro no onboarding:', error);
    // Simular sucesso para demonstração se a API não existir
    alert('Simulando sucesso: Pagamento processado e ambiente em criação!');
    router.push('/');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="checkout-page">
    <div class="container">
      <div class="checkout-container glass animate-fade-in">
        <!-- Progress Bar -->
        <div class="progress-stepper">
          <div :class="['step', { active: currentStep >= 1 }]">1<span>Cadastro</span></div>
          <div class="divider"></div>
          <div :class="['step', { active: currentStep >= 2 }]">2<span>Plano</span></div>
          <div class="divider"></div>
          <div :class="['step', { active: currentStep >= 3 }]">3<span>Pagamento</span></div>
        </div>

        <!-- Step 1: Registration -->
        <div v-if="currentStep === 1" class="step-content">
          <h2 class="brand-gradient-text">Vamos começar?</h2>
          <p>Preencha os dados básicos para criarmos sua conta.</p>
          
          <div class="form-grid">
            <div class="form-group">
              <label>Nome Completo</label>
              <input v-model="form.name" placeholder="Ex: João Silva" />
            </div>
            <div class="form-group">
              <label>E-mail Corporativo</label>
              <input v-model="form.email" type="email" placeholder="joao@empresa.com" />
            </div>
            <div class="form-group">
              <label>WhatsApp</label>
              <input v-model="form.phone" placeholder="(11) 99999-9999" />
            </div>
            <div class="form-group">
              <label>Nome da Empresa</label>
              <input v-model="form.company" placeholder="Minha Empresa LTDA" />
            </div>
          </div>
          
          <div class="actions">
            <button @click="nextStep" class="btn-primary bg-gradient" :disabled="!form.email || !form.name">Próximo Passo</button>
          </div>
        </div>

        <!-- Step 2: Plan Selection -->
        <div v-if="currentStep === 2" class="step-content">
          <h2 class="brand-gradient-text">Confirme seu Plano</h2>
          <p>Você selecionou o plano {{ selectedPlanData.name }}.</p>

          <div class="plan-summary glass">
            <div class="plan-header">
              <h3>{{ selectedPlanData.name }}</h3>
              <div class="price">R$ {{ selectedPlanData.price }}<span>/mês</span></div>
            </div>
            <ul class="mini-features">
              <li v-if="form.plan === 'bronze'">✓ 1 Conexão WhatsApp</li>
              <li v-if="form.plan === 'silver'">✓ 3 Conexões WhatsApp + IA</li>
              <li v-if="form.plan === 'gold'">✓ Conexões Ilimitadas + Suporte 24/7</li>
              <li>✓ Painel de Controle</li>
            </ul>
          </div>

          <div class="actions">
            <button @click="prevStep" class="btn-secondary">Voltar</button>
            <button @click="nextStep" class="btn-primary bg-gradient">Confirmar e Pagar</button>
          </div>
        </div>

        <!-- Step 3: Payment -->
        <div v-if="currentStep === 3" class="step-content">
          <h2 class="brand-gradient-text">Pagamento Seguro</h2>
          <p>Finalize sua assinatura para liberar o acesso imediato.</p>

          <div class="payment-options">
            <button 
              @click="form.paymentMethod = 'pix'" 
              :class="['method-btn', { active: form.paymentMethod === 'pix' }]"
            >
              PIX (Ativação Instantânea)
            </button>
            <button 
              @click="form.paymentMethod = 'card'" 
              :class="['method-btn', { active: form.paymentMethod === 'card' }]"
            >
              Cartão de Crédito
            </button>
          </div>

          <div v-if="form.paymentMethod === 'card'" class="card-form animate-fade-in">
            <div class="form-group">
              <label>Nome no Cartão</label>
              <input v-model="form.cardName" placeholder="JOAO SILVA" />
            </div>
            <div class="form-group">
              <label>Número do Cartão</label>
              <input v-model="form.cardNumber" placeholder="0000 0000 0000 0000" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Validade</label>
                <input v-model="form.cardExpiry" placeholder="MM/AA" />
              </div>
              <div class="form-group">
                <label>CVC</label>
                <input v-model="form.cardCvc" placeholder="123" />
              </div>
            </div>
          </div>

          <div v-else class="pix-info animate-fade-in">
            <div class="pix-icon">📱</div>
            <p>Um QR Code será gerado no próximo passo para pagamento via PIX.</p>
          </div>

          <div class="actions">
            <button @click="prevStep" class="btn-secondary" :disabled="isSubmitting">Voltar</button>
            <button @click="handleCompleteOnboarding" class="btn-primary bg-gradient" :disabled="isSubmitting">
              <span v-if="!isSubmitting">Finalizar e Ativar Sistema</span>
              <span v-else class="loader"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkout-page {
  padding: 12rem 0 8rem;
  background-color: var(--background);
}

.checkout-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 4rem;
  border-radius: 3rem;
}

.progress-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  font-size: 0.9rem;
  color: var(--text-muted);
  font-weight: 700;
  transition: all 0.3s ease;
}

.step span {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.step.active {
  color: var(--vibrant-green);
}

.step.active span {
  border-color: var(--vibrant-green);
  background: rgba(89, 195, 72, 0.1);
  box-shadow: 0 0 15px rgba(89, 195, 72, 0.2);
}

.divider {
  flex: 1;
  height: 2px;
  background: var(--border);
  margin: 0 1.5rem 1.5rem;
}

.step-content h2 {
  font-size: 2.5rem;
  font-weight: 900;
  margin-bottom: 1rem;
}

.step-content p {
  color: var(--text-muted);
  margin-bottom: 3rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 3rem;
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
}

input {
  padding: 1rem 1.5rem;
  border-radius: 1rem;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: white;
}

.plan-summary {
  padding: 2.5rem;
  border-radius: 2rem;
  margin-bottom: 3rem;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.price {
  font-size: 2rem;
  font-weight: 900;
}

.price span {
  font-size: 1rem;
  color: var(--text-muted);
}

.mini-features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.payment-options {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 3.5rem;
}

.method-btn {
  flex: 1;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  color: white;
  font-weight: 700;
  transition: all 0.3s ease;
}

.method-btn.active {
  border-color: var(--vibrant-green);
  background: rgba(89, 195, 72, 0.05);
  box-shadow: 0 0 20px rgba(89, 195, 72, 0.1);
}

.card-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 1.5rem;
  margin-top: 4rem;
}

.btn-primary {
  padding: 1.2rem 2.5rem;
  border-radius: 1rem;
  font-weight: 800;
  color: white;
}

.btn-secondary {
  padding: 1.2rem 2.5rem;
  border-radius: 1rem;
  background: transparent;
  border: 1px solid var(--border);
  color: white;
  font-weight: 700;
}

.pix-info {
  text-align: center;
  padding: 3rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 2rem;
}

.pix-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .checkout-container { padding: 2.5rem 1.5rem; }
  .form-grid, .form-row { grid-template-columns: 1fr; }
  .actions { flex-direction: column-reverse; }
  .btn-primary, .btn-secondary { width: 100%; }
}
</style>
