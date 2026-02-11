<template>
  <footer class="footer">
    <div class="container footer-content">
      <div class="footer-brand">
        <div class="logo-container">
          <img src="../assets/logo.png" alt="Nyvlo Logo" class="logo-img" />
          <span class="logo-text brand-gradient-text">Nyvlo</span>
        </div>
        <p>Transformando a comunicação entre empresas e clientes através de tecnologia de ponta e Inteligência Artificial avançada.</p>
        <div class="social-links">
          <a href="#" class="social-icon">Instagram</a>
          <a href="#" class="social-icon">LinkedIn</a>
          <a href="#" class="social-icon">Twitter</a>
        </div>
      </div>
      
      <div class="footer-links">
        <div class="link-group">
          <h4>Produto</h4>
          <RouterLink to="/features">Funcionalidades</RouterLink>
          <a href="#pricing">Preços</a>
          <RouterLink to="/integrations">Integrações</RouterLink>
        </div>
        <div class="link-group">
          <h4>Empresa</h4>
          <RouterLink to="/about">Sobre nós</RouterLink>
          <a href="#contact">Contato</a>
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
  padding-top: 8rem;
  background: var(--background);
  border-top: 1px solid var(--border);
  position: relative;
}

.footer-content {
  display: grid;
  grid-template-columns: 1.5fr 2fr;
  gap: 6rem;
  padding-bottom: 6rem;
}

.footer-brand p {
  color: var(--text-muted);
  margin: 2rem 0 2.5rem;
  max-width: 350px;
  line-height: 1.7;
  font-size: 1.05rem;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-img {
  height: 40px;
}

.logo-text {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: -0.05em;
}

.social-links {
  display: flex;
  gap: 2rem;
}

.social-icon {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
  transition: color 0.3s ease;
}

.social-icon:hover {
  color: var(--vibrant-green);
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.link-group h4 {
  margin-bottom: 2rem;
  font-size: 1.1rem;
  font-weight: 800;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.link-group a {
  display: block;
  margin-bottom: 1rem;
  color: var(--text-muted);
  font-size: 1rem;
  transition: all 0.3s ease;
}

.link-group a:hover {
  color: white;
  transform: translateX(5px);
}

.footer-bottom {
  padding: 2.5rem 0;
  border-top: 1px solid var(--border);
  text-align: center;
  font-size: 0.95rem;
  color: var(--text-muted);
  opacity: 0.7;
}

@media (max-width: 1024px) {
  .footer-content {
    gap: 4rem;
  }
}

@media (max-width: 768px) {
  .footer { padding-top: 6rem; }
  
  .footer-content {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 4rem;
    padding-bottom: 4rem;
  }
  
  .footer-brand p {
    margin: 2rem auto;
  }
  
  .logo-container {
    justify-content: center;
  }
  
  .social-links {
    justify-content: center;
  }
  
  .footer-links {
    grid-template-columns: 1fr;
    gap: 4rem;
  }
  
  .link-group h4 {
    margin-bottom: 1.5rem;
  }
}
</style>
