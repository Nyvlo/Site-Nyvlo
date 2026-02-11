<script setup>
import { ref, onMounted } from 'vue';

const activeIndex = ref(null);

const faqs = [
  {
    category: 'Geral',
    items: [
      {
        question: 'O que é a Nyvlo?',
        answer: 'A Nyvlo é uma plataforma avançada de automação de comunicação via IA, focada em transformar a forma como empresas interagem com seus clientes através de ferramentas multicanal e bots inteligentes.'
      },
      {
        question: 'Como funciona o período de teste?',
        answer: 'Oferecemos demonstrações personalizadas para que você possa ver a ferramenta em ação no seu cenário de negócio. No cadastro, você escolhe seu plano e nossa equipe ativa seu ambiente em tempo recorde.'
      }
    ]
  },
  {
    category: 'Técnico',
    items: [
      {
        question: 'O sistema integra com quais ferramentas?',
        answer: 'Integramos nativamente com WhatsApp, Instagram Direct, Facebook Messenger, além de CRMs populares e ferramentas de produtividade via API.'
      },
      {
        question: 'Meus dados e de meus clientes estão seguros?',
        answer: 'Sim, seguimos rigidamente a LGPD e utilizamos criptografia de ponta em todos os dados trafegados e armazenados em nossa plataforma.'
      }
    ]
  },
  {
    category: 'Financeiro',
    items: [
      {
        question: 'Quais as formas de pagamento?',
        answer: 'Aceitamos Cartão de Crédito com recorrência automática e PIX.'
      },
      {
        question: 'Posso trocar de plano a qualquer momento?',
        answer: 'Sim, o upgrade pode ser feito instantaneamente através da sua área de administração. O downgrade pode ser solicitado ao nosso suporte.'
      }
    ]
  }
];

const toggleFaq = (index) => {
  activeIndex.value = activeIndex.value === index ? null : index;
};

onMounted(() => {
  window.scrollTo(0, 0);
});
</script>

<template>
  <div class="faq-page">
    <div class="faq-overlay"></div>
    <div class="container faq-content animate-fade-in">
      <div class="faq-header">
        <span class="sub-label">Central de Ajuda</span>
        <h1 class="brand-gradient-text">Perguntas Frequentes</h1>
        <p>Tudo o que você precisa saber sobre a Nyvlo e como podemos impulsionar seu negócio.</p>
      </div>

      <div class="faq-container">
        <div v-for="(group, gIndex) in faqs" :key="gIndex" class="faq-group">
          <h2 class="category-title">{{ group.category }}</h2>
          <div class="faq-list">
            <div 
              v-for="(item, iIndex) in group.items" 
              :key="iIndex" 
              class="faq-item glass"
              :class="{ active: activeIndex === `${gIndex}-${iIndex}` }"
            >
              <button class="faq-question" @click="toggleFaq(`${gIndex}-${iIndex}`)">
                <span>{{ item.question }}</span>
                <span class="icon"></span>
              </button>
              <div class="faq-answer">
                <div class="answer-content">
                  {{ item.answer }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="faq-footer-card glass">
        <h3>Ainda tem dúvidas?</h3>
        <p>Nossa equipe de suporte está pronta para te ajudar com qualquer questão específica.</p>
        <RouterLink to="/contact" class="btn-contact bg-gradient">Falar com Suporte</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.faq-page {
  min-height: 100vh;
  padding: 10rem 0 8rem;
  position: relative;
  background-color: var(--background);
  background-image: url('../assets/backgrounds/features_bg.webp');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

.faq-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(8, 12, 24, 0.95) 0%, rgba(8, 12, 24, 0.9) 100%);
  z-index: 1;
}

.faq-content {
  position: relative;
  z-index: 2;
  max-width: 800px;
  margin: 0 auto;
}

.faq-header {
  text-align: center;
  margin-bottom: 5rem;
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

.faq-header h1 {
  font-size: 3.5rem;
  font-weight: 900;
  margin-bottom: 1.5rem;
}

.faq-header p {
  color: var(--text-muted);
  font-size: 1.1rem;
}

.faq-group {
  margin-bottom: 4rem;
}

.category-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: white;
  margin-bottom: 2rem;
  padding-left: 1rem;
  border-left: 4px solid var(--vibrant-green);
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.faq-item {
  border-radius: 1.5rem;
  overflow: hidden;
  transition: all 0.3s ease;
}

.faq-item:hover {
  border-color: rgba(89, 195, 72, 0.3);
}

.faq-item.active {
  border-color: var(--vibrant-green);
}

.faq-question {
  width: 100%;
  padding: 1.8rem 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  color: white;
  font-size: 1.1rem;
  font-weight: 700;
  text-align: left;
}

.faq-question .icon {
  width: 20px;
  height: 20px;
  position: relative;
  transition: all 0.3s ease;
}

.faq-question .icon::before,
.faq-question .icon::after {
  content: '';
  position: absolute;
  background: white;
}

.faq-question .icon::before {
  width: 100%;
  height: 2px;
  top: 50%;
  transform: translateY(-50%);
}

.faq-question .icon::after {
  height: 100%;
  width: 2px;
  left: 50%;
  transform: translateX(-50%);
}

.faq-item.active .faq-question .icon {
  transform: rotate(45deg);
}

.faq-item.active .faq-question .icon::before,
.faq-item.active .faq-question .icon::after {
  background: var(--vibrant-green);
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.faq-item.active .faq-answer {
  max-height: 500px;
}

.answer-content {
  padding: 0 2.5rem 2.5rem;
  color: var(--text-muted);
  line-height: 1.7;
  font-size: 1.05rem;
}

.faq-footer-card {
  margin-top: 6rem;
  padding: 4rem;
  border-radius: 2.5rem;
  text-align: center;
}

.faq-footer-card h3 {
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

.faq-footer-card p {
  color: var(--text-muted);
  margin-bottom: 2.5rem;
}

.btn-contact {
  display: inline-block;
  padding: 1.2rem 3rem;
  border-radius: 1.2rem;
  font-weight: 800;
  color: white;
  transition: all 0.3s ease;
}

.btn-contact:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(89, 195, 72, 0.3);
}

@media (max-width: 768px) {
  .faq-header h1 { font-size: 2.5rem; }
  .faq-question { padding: 1.5rem; font-size: 1rem; }
  .answer-content { padding: 0 1.5rem 1.5rem; }
}
</style>
