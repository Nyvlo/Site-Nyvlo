<template>
  <footer class="footer">
    <div class="container footer-content">
      <div class="footer-brand">
        <div class="logo-container">
          <img src="../assets/logo.png" alt="Nyvlo Logo" class="logo-img" />
          <span class="logo-text">Nyvlo</span>
        </div>
        <p>Transformando a comunicação entre empresas e clientes através da tecnologia e IA.</p>
        <div class="social-links">
          <a href="#" class="social-icon">Instagram</a>
          <a href="#" class="social-icon">LinkedIn</a>
          <a href="#" class="social-icon">Twitter</a>
        </div>
      </div>
      
      <div class="footer-links">
        <div class="link-group">
          <h4>Produto</h4>
          <a href="#">Funcionalidades</a>
          <a href="#">Preços</a>
          <a href="#">Integrações</a>
        </div>
        <div class="link-group">
          <h4>Empresa</h4>
          <a href="#">Sobre nós</a>
          <a href="#">Contato</a>
          <a href="#">Blog</a>
        </div>
        <div class="link-group">
          <h4>Legal</h4>
          <a href="#">Termos de Uso</a>
          <a href="#">Privacidade</a>
        </div>
      </div>
    </div>
    
    <div class="footer-bottom">
      <div class="container">
        <p>&copy; 2026 Nyvlo System. Todos os direitos reservados.</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  padding-top: 6rem;
  background: var(--surface);
  border-top: 1px solid var(--surface-border);
}

.footer-content {
  display: grid;
  grid-template-columns: 1.5fr 2fr;
  gap: 4rem;
  padding-bottom: 4rem;
}

.footer-brand p {
  color: var(--text-muted);
  margin: 1.5rem 0 2rem;
  max-width: 300px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-img {
  height: 32px;
}

.logo-text {
  font-family: 'Outfit', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.social-links {
  display: flex;
  gap: 1.5rem;
}

.social-icon {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.social-icon:hover {
  color: var(--primary);
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.link-group h4 {
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
}

.link-group a {
  display: block;
  margin-bottom: 0.75rem;
  color: var(--text-muted);
  font-size: 0.95rem;
}

.link-group a:hover {
  color: var(--text);
  transform: translateX(5px);
}

.footer-bottom {
  padding: 2rem 0;
  border-top: 1px solid var(--surface-border);
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .footer-brand p {
    margin: 1.5rem auto;
  }
  
  .logo-container {
    justify-content: center;
  }
  
  .social-links {
    justify-content: center;
  }
  
  .footer-links {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
}
</style>
