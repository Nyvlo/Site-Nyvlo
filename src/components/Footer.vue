<template>
  <footer class="footer">
    <div class="container footer-content">
      <div class="footer-brand">
        <div class="logo-container">
          <img src="../assets/logo.png" alt="Nyvlo Logo" class="logo-img" />
          <span class="logo-text brand-gradient-text">Nyvlo</span>
        </div>
        <p class="brand-desc">Transformando a comunicação entre empresas e clientes através de tecnologia de ponta e Inteligência Artificial avançada.</p>
        <div class="social-links">
          <a href="#" class="social-icon" aria-label="Instagram">
            <i class="fa-brands fa-instagram"></i>
          </a>
          <a href="#" class="social-icon" aria-label="LinkedIn">
            <i class="fa-brands fa-linkedin-in"></i>
          </a>
          <a href="#" class="social-icon" aria-label="X (Twitter)">
            <i class="fa-brands fa-x-twitter"></i>
          </a>
          <a href="#" class="social-icon" aria-label="Facebook">
            <i class="fa-brands fa-facebook-f"></i>
          </a>
        </div>
      </div>
      
      <div class="footer-links-grid">
        <div class="link-group">
          <h4>Produto</h4>
          <RouterLink to="/features">Funcionalidades</RouterLink>
          <a href="#pricing">Preços</a>
          <RouterLink to="/integrations">Integrações</RouterLink>
        </div>
        <div class="link-group">
          <h4>Empresa</h4>
          <RouterLink to="/about">Sobre nós</RouterLink>
          <RouterLink to="/contact">Contato</RouterLink>
        </div>
        <div class="link-group">
          <h4>Legal</h4>
          <RouterLink to="/privacy">Privacidade</RouterLink>
          <RouterLink to="/terms">Termos de Uso</RouterLink>
          <RouterLink to="/faq">FAQ</RouterLink>
        </div>
      </div>
    </div>
    
    <div class="footer-bottom">
      <div class="container text-center">
        <p>&copy; 2026 Nyvlo System. Todos os direitos reservados.</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  padding-top: 4rem;
  background: var(--background);
  border-top: 1px solid var(--border);
  position: relative;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  gap: 4rem;
  padding-bottom: 4rem;
}

.footer-brand {
  flex: 1;
  max-width: 400px;
}

.brand-desc {
  color: var(--text-muted);
  margin: 1.5rem 0 2rem;
  line-height: 1.6;
  font-size: 0.95rem;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.logo-img {
  height: 32px;
}

.logo-text {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: -0.05em;
}

.social-links {
  display: flex;
  gap: 1rem;
}

.social-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 1.1rem;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.social-icon:hover {
  background: rgba(89, 195, 72, 0.1);
  border-color: var(--vibrant-green);
  color: white;
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(89, 195, 72, 0.15);
}

.footer-links-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3.5rem;
}

.link-group h4 {
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  font-weight: 800;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.link-group a {
  display: block;
  margin-bottom: 0.8rem;
  color: var(--text-muted);
  font-size: 0.95rem;
  transition: all 0.3s ease;
  text-decoration: none;
}

.link-group a:hover {
  color: var(--vibrant-green);
  transform: translateX(4px);
}

.footer-bottom {
  padding: 1.5rem 0;
  border-top: 1px solid var(--border);
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: center;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(89, 195, 72, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(89, 195, 72, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(89, 195, 72, 0); }
}

@media (max-width: 1024px) {
  .footer-content {
    flex-direction: column;
    gap: 3rem;
  }
  
  .footer-links-grid {
    gap: 2rem;
  }
}

@media (max-width: 768px) {
  .footer { padding-top: 3rem; }
  
  .footer-content {
    text-align: center;
    padding-bottom: 3rem;
  }
  
  .footer-brand {
    max-width: 100%;
    margin: 0 auto;
  }
  
  .logo-container, .social-links {
    justify-content: center;
  }
  
  .footer-links-grid {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
  
  .bottom-flex {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
