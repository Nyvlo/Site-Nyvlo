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
    <nav class="navbar" :class="{ 'glass': isScrolled }">
      <div class="container nav-content">
        <RouterLink to="/" class="logo">
          <img src="../assets/logo.png" alt="Nyvlo Logo" class="logo-img" />
        </RouterLink>
        
        <div class="nav-links-right">
          <RouterLink to="/">Início</RouterLink>
          <RouterLink to="/#pricing">Preços</RouterLink>
          <RouterLink to="/#contact">Contato</RouterLink>
          <RouterLink to="/solicitar-demo" class="btn-demo bg-gradient">Solicitar Demo</RouterLink>
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

.top-bar {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  color: var(--foreground);
  padding: 0.5rem 0;
  font-size: 0.75rem;
  transition: transform 0.4s ease, opacity 0.3s ease;
  transform-origin: top;
  border-bottom: 1px solid var(--border);
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
  opacity: 0.8;
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

.login-field label {
  opacity: 0.7;
}

.login-field input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  width: 100px;
  color: white;
  transition: border-color 0.2s;
}

.login-field input:focus {
  border-color: var(--vibrant-green);
  outline: none;
}

.btn-enter {
  background: var(--vibrant-green);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.2rem 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-enter:hover {
  transform: translateY(-1px);
  filter: brightness(1.1);
}

.navbar {
  background: transparent;
  padding: 1.2rem 0;
  transition: all 0.4s ease;
}

.header-scrolled .navbar {
  padding: 0.8rem 0;
  border-bottom: 1px solid var(--border);
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-img {
  height: 48px;
  width: auto;
  display: block;
}

.nav-links-right {
  display: flex;
  align-items: center;
  gap: 2.5rem;
  margin-left: auto;
}

.nav-links-right a {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--foreground);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.8;
  transition: all 0.3s ease;
}

.nav-links-right a:not(.btn-demo):hover {
  color: var(--vibrant-green);
  opacity: 1;
}

.btn-demo {
  color: white !important;
  padding: 0.8rem 1.8rem;
  border-radius: 12px;
  font-weight: 700 !important;
  opacity: 1 !important;
  box-shadow: 0 4px 15px rgba(89, 195, 72, 0.2);
  transition: all 0.3s ease;
}

.btn-demo:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(89, 195, 72, 0.3);
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
