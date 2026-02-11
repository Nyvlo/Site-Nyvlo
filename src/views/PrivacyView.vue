<script setup>
import { onMounted } from 'vue';

onMounted(() => {
  window.scrollTo(0, 0);
});
</script>

<template>
  <div class="privacy-page">
    <div class="privacy-overlay"></div>
    <div class="container privacy-content animate-fade-in">
      <div class="privacy-card glass">
        <div class="privacy-header">
          <span class="sub-label">Segurança & Transparência</span>
          <h1 class="brand-gradient-text">Política de Privacidade</h1>
          <p>Última atualização: 11 de Fevereiro de 2026</p>
        </div>

        <div class="privacy-body">
          <section>
            <h2>1. Compromisso com a Privacidade</h2>
            <p>Na Nyvlo, a privacidade e a segurança dos dados de nossos clientes são prioridades absolutas. Esta política descreve como coletamos, usamos e protegemos suas informações em total conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>.</p>
          </section>

          <section>
            <h2>2. Dados Coletados</h2>
            <p>Para fornecer nossos serviços de automação e integração, coletamos as seguintes informações:</p>
            <ul>
              <li><strong>Dados de Registro:</strong> Nome, e-mail corporativo, WhatsApp e nome da empresa.</li>
              <li><strong>Dados de Faturamento:</strong> CNPJ/CPF, endereço empresarial e informações de pagamento (processadas de forma segura por gateways parceiros).</li>
              <li><strong>Dados de Uso:</strong> Informações sobre como você interage com nossa plataforma para melhoria contínua da experiência.</li>
            </ul>
          </section>

          <section>
            <h2>3. Finalidade do Tratamento</h2>
            <p>Seus dados são utilizados exclusivamente para:</p>
            <ul>
              <li>Ativação e configuração do seu ambiente de comunicação.</li>
              <li>Processamento de pagamentos e emissão de notas fiscais.</li>
              <li>Suporte técnico e comunicações importantes sobre o sistema.</li>
              <li>Personalização da inteligência artificial conforme seu ramo de atuação.</li>
            </ul>
          </section>

          <section>
            <h2>4. Seus Direitos (LGPD)</h2>
            <p>Como titular dos dados, você tem o direito de:</p>
            <ul>
              <li>Confirmar a existência de tratamento de seus dados.</li>
              <li>Acessar, corrigir ou atualizar suas informações a qualquer momento.</li>
              <li>Solicitar a anonimização ou exclusão de dados desnecessários.</li>
              <li>Revogar o consentimento para comunicações de marketing.</li>
            </ul>
          </section>

          <section>
            <h2>5. Segurança e Armazenamento</h2>
            <p>Utilizamos criptografia de ponta a ponta e servidores de alta segurança para garantir que suas informações estejam protegidas contra acessos não autorizados. Seus dados são armazenados apenas pelo tempo necessário para cumprir as finalidades descritas ou obrigações legais.</p>
          </section>

          <section>
            <h2>6. Contato</h2>
            <p>Para dúvidas sobre privacidade ou para exercer seus direitos, entre em contato através do e-mail: <a href="mailto:privacidade@nyvlo.com" class="link-highlight">privacidade@nyvlo.com</a></p>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.privacy-page {
  min-height: 100vh;
  padding: 6rem 0 3rem;
  position: relative;
  background-color: var(--background);
  background-image: url('../assets/backgrounds/pricing_bg.webp');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

.privacy-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(8, 12, 24, 0.95) 0%, rgba(8, 12, 24, 0.85) 100%);
  z-index: 1;
}

.privacy-content {
  position: relative;
  z-index: 2;
  max-width: 900px;
  margin: 0 auto;
}

.privacy-card {
  padding: 3rem 4rem;
  border-radius: 2rem;
  line-height: 1.6;
}

.privacy-header {
  margin-bottom: 2rem;
  text-align: center;
}

.sub-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  color: var(--vibrant-green);
  margin-bottom: 0.5rem;
}

.privacy-header h1 {
  font-size: 2.8rem;
  font-weight: 900;
  margin-bottom: 0.5rem;
}

.privacy-header p {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-bottom: 0;
}

/* CRITICAL: Overriding global section padding from style.css with balanced margin */
.privacy-body section {
  padding: 0 !important;
  margin-bottom: 1.8rem;
}

.privacy-body h2 {
  font-size: 1.3rem;
  font-weight: 800;
  color: white;
  margin-bottom: 0.8rem;
  line-height: 1.2;
}

.privacy-body p {
  color: var(--text-muted);
  font-size: 1rem;
  margin-bottom: 1rem;
}

.privacy-body ul {
  list-style: none;
  padding-left: 0.5rem;
  margin-bottom: 1rem;
}

.privacy-body li {
  color: var(--text-muted);
  font-size: 1rem;
  margin-bottom: 0.6rem;
  display: flex;
  gap: 0.8rem;
  align-items: flex-start;
  line-height: 1.5;
}

.privacy-body li::before {
  content: "→";
  color: var(--vibrant-green);
  font-weight: 900;
}

.link-highlight {
  color: var(--vibrant-green);
  font-weight: 700;
  text-decoration: underline;
}

@media (max-width: 768px) {
  .privacy-page { padding: 8rem 0 4rem; }
  .privacy-card { padding: 2.5rem 1.5rem; }
  .privacy-header h1 { font-size: 2.5rem; }
}
</style>
