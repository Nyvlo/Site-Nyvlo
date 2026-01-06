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
        <span class="logo-text">Nyvlo</span>
      </div>
      
      <div class="nav-links">
        <a href="#hero">Início</a>
        <a href="#pricing">Preços</a>
        <a href="#about">Sobre</a>
        <button class="btn-primary">Acessar Sistema</button>
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
  background: rgba(13, 13, 18, 0.8);
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
  background: white;
  padding: 4px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.logo-img {
  height: 52px;
  width: auto;
  display: block;
}

.logo-text {
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
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
  background: var(--primary);
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
}
</style>
