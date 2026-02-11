<script setup>
import { onMounted } from 'vue';

onMounted(() => {
  window.scrollTo(0, 0);
});
</script>

<template>
  <div class="terms-page">
    <div class="terms-overlay"></div>
    <div class="container terms-content animate-fade-in">
      <div class="terms-card glass">
        <div class="terms-header">
          <span class="sub-label">Legal & Compliance</span>
          <h1 class="brand-gradient-text">Termos de Uso</h1>
          <p>Última atualização: 11 de Fevereiro de 2026</p>
        </div>

        <div class="terms-body">
          <section>
            <h2>1. Aceitação dos Termos</h2>
            <p>Ao acessar e utilizar a plataforma Nyvlo, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.</p>
          </section>

          <section>
            <h2>2. Descrição do Serviço</h2>
            <p>A Nyvlo fornece uma plataforma de automação e comunicação baseada em Inteligência Artificial, incluindo integrações com canais de mensagem, automação de fluxos e análise de dados. Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer aspecto do serviço a qualquer momento.</p>
          </section>

          <section>
            <h2>3. Responsabilidades do Usuário</h2>
            <p>O usuário compromete-se a:</p>
            <ul>
              <li>Fornecer informações precisas e completas durante o registro.</li>
              <li>Manter a confidencialidade de suas credenciais de acesso.</li>
              <li>Não utilizar o serviço para fins ilícitos, envio de spam ou qualquer atividade que viole leis vigentes.</li>
              <li>Respeitar os direitos de propriedade intelectual da Nyvlo.</li>
            </ul>
          </section>

          <section>
            <h2>4. Planos e Pagamentos</h2>
            <p>O acesso a certas funcionalidades depende da assinatura de um plano. Os pagamentos são processados via gateways parceiros. O cancelamento pode ser solicitado a qualquer momento, conforme as regras específicas de cada plano detalhadas no momento da contratação.</p>
          </section>

          <section>
            <h2>5. Limitação de Responsabilidade</h2>
            <p>A Nyvlo envida seus melhores esforços para garantir a disponibilidade do sistema, mas não se responsabiliza por interrupções causadas por falhas de terceiros (operadoras de telefonia, servidores externos) ou por mau uso da ferramenta pelo usuário.</p>
          </section>

          <section>
            <h2>6. Propriedade Intelectual</h2>
            <p>Todo o conteúdo, algoritmos, logotipos e marcas exibidos na plataforma são de propriedade exclusiva da Nyvlo ou de seus licenciadores, sendo proibida qualquer reprodução sem autorização prévia.</p>
          </section>

          <section>
            <h2>7. Alterações nos Termos</h2>
            <p>Podemos atualizar estes termos periodicamente. Recomendamos a revisão regular desta página. O uso continuado do serviço após alterações constitui aceitação dos novos termos.</p>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terms-page {
  min-height: 100vh;
  padding: 10rem 0 6rem;
  position: relative;
  background-color: var(--background);
  background-image: url('../assets/backgrounds/contact_view_bg.png');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

.terms-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(8, 12, 24, 0.95) 0%, rgba(8, 12, 24, 0.85) 100%);
  z-index: 1;
}

.terms-content {
  position: relative;
  z-index: 2;
  max-width: 900px;
  margin: 0 auto;
}

.terms-card {
  padding: 3rem 4rem;
  border-radius: 2rem;
  line-height: 1.6;
}

.terms-header {
  margin-bottom: 2.5rem;
  text-align: center;
}

.sub-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  color: var(--vibrant-green);
  margin-bottom: 0.8rem;
}

.terms-header h1 {
  font-size: 3rem;
  font-weight: 900;
  margin-bottom: 0.8rem;
}

.terms-header p {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.terms-body section {
  padding: 0 !important;
  margin-bottom: 1.8rem;
}

.terms-body h2 {
  font-size: 1.3rem;
  font-weight: 800;
  color: white;
  margin-bottom: 0.8rem;
  line-height: 1.2;
}

.terms-body p {
  color: var(--text-muted);
  font-size: 1rem;
  margin-bottom: 1rem;
}

.terms-body ul {
  list-style: none;
  padding-left: 0.5rem;
  margin-bottom: 1rem;
}

.terms-body li {
  color: var(--text-muted);
  font-size: 1rem;
  margin-bottom: 0.6rem;
  display: flex;
  gap: 0.8rem;
  align-items: flex-start;
  line-height: 1.5;
}

.terms-body li::before {
  content: "→";
  color: var(--vibrant-green);
  font-weight: 900;
}

@media (max-width: 768px) {
  .terms-page { padding: 8rem 0 4rem; }
  .terms-card { padding: 2.5rem 1.5rem; }
  .terms-header h1 { font-size: 2.5rem; }
}
</style>
