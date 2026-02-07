<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const isScrolled = ref(false);

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
  <header :class="['header-fixed', { 'header-scrolled': isScrolled }]">
    <!-- Top Bar: Área do Cliente -->
    <div class="top-bar" :class="{ 'top-bar-hidden': isScrolled }">
      <div class="container top-bar-content">
        <span class="client-area-label">ÁREA DO CLIENTE | LOGIN</span>
        <div class="login-form">
          <div class="login-field">
            <label>Conecte-se:</label>
            <input type="text" placeholder="Usuário" />
          </div>
          <div class="login-field">
            <label>Senha:</label>
            <input type="password" placeholder="••••••" />
          </div>
          <button class="btn-enter">ENTRAR</button>
        </div>
      </div>
    </div>

    <!-- Main Navbar -->
    <nav class="navbar">
      <div class="container nav-content">
        
        <div class="nav-links-right">
          <a href="#hero">Início</a>
          <a href="#pricing">Preços</a>
          <a href="#contact">Contato</a>
          <a href="#contact" class="btn-demo">Solicitar Demo</a>
        </div>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.header-fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.header-scrolled {
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.1);
}

.top-bar {
  background: var(--text);
  color: white;
  padding: 0.5rem 0;
  font-size: 0.75rem;
  transition: transform 0.4s ease, opacity 0.3s ease;
  transform-origin: top;
}

.top-bar-hidden {
  transform: translateY(-100%);
  opacity: 0;
  pointer-events: none;
  height: 0;
  padding: 0;
}

.top-bar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.client-area-label {
  font-weight: 700;
  letter-spacing: 0.05em;
}

.login-form {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.login-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.login-field input {
  background: white;
  border: none;
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  width: 100px;
}

.btn-enter {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.2rem 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-enter:hover {
  opacity: 0.9;
}

.navbar {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--surface-border);
  transition: all 0.4s ease;
}

.header-scrolled .navbar {
  padding: 0.4rem 0;
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.nav-content {
  display: flex;
}

.logo-text {
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e40af;
  letter-spacing: -0.02em;
}

.nav-links-right {
  display: flex;
  align-items: center;
  gap: 2.5rem;
  margin-left: auto;
}

.nav-links-right a {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.nav-links-right a:not(.btn-demo):hover {
  color: var(--primary);
}

.btn-demo {
  background: var(--primary);
  color: white !important;
  padding: 0.7rem 1.5rem;
  border-radius: 50px;
  font-weight: 700 !important;
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.2);
  transition: all 0.3s ease;
}

.btn-demo:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(37, 211, 102, 0.4);
}

@media (max-width: 1024px) {
  .top-bar-content {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}

@media (max-width: 768px) {
  .nav-links-right {
    display: none;
  }
}
</style>
