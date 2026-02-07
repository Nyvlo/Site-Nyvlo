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
  <nav :class="['navbar', { 'navbar-scrolled': isScrolled }]">
    <div class="container nav-content">
      <div class="logo-container">
        <div class="logo-wrapper">
          <img src="../assets/logo.png" alt="Nyvlo Logo" class="logo-img" />
        </div>
      </div>
      
      <div class="nav-links">
        <a href="#hero">Início</a>
        <a href="#pricing">Preços</a>
        <a href="#contact">Contato</a>
        <a href="#contact" class="btn-primary">Solicitar Demo</a>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 1.5rem 0;
  transition: all 0.3s ease;
}

.navbar-scrolled {
  padding: 1rem 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--glass-border);
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-wrapper {
  background: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-img {
  height: 160px;
  width: auto;
  display: block;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-links a {
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--text-muted);
}

.nav-links a:hover {
  color: var(--text);
}

.btn-primary {
  display: inline-block;
  background: var(--primary);
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;
  text-align: center;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
}
</style>
