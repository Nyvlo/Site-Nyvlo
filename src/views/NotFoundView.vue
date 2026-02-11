<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

onMounted(() => {
  window.scrollTo(0, 0);
});

const goHome = () => {
  router.push('/');
};
</script>

<template>
  <div class="not-found-page">
    <div class="container relative-z">
      <div class="error-content animate-fade-in">
        <h1 class="error-code">404</h1>
        <div class="divider bg-gradient"></div>
        <h2>Ops! Página não encontrada</h2>
        <p>Parece que você se perdeu na rede. Não se preocupe, vamos te levar de volta para a segurança do início.</p>
        <button @click="goHome" class="btn-home bg-gradient">
          Voltar ao Início
        </button>
      </div>
    </div>
    
    <!-- Decorative background elements -->
    <div class="glow-1"></div>
    <div class="glow-2"></div>
  </div>
</template>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--background);
  color: white;
  position: relative;
  overflow: hidden;
  text-align: center;
  padding: 2rem;
}

.relative-z {
  position: relative;
  z-index: 2;
}

.error-content {
  max-width: 600px;
  margin: 0 auto;
}

.error-code {
  font-size: 10rem;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 1rem;
  opacity: 0.1;
  background: white;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.divider {
  height: 4px;
  width: 80px;
  margin: 0 auto 2.5rem;
  border-radius: 2px;
}

h2 {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  font-weight: 800;
}

p {
  color: var(--text-muted);
  font-size: 1.15rem;
  line-height: 1.6;
  margin-bottom: 3rem;
}

.btn-home {
  padding: 1.2rem 3rem;
  border-radius: 1rem;
  color: white;
  font-weight: 800;
  font-size: 1.1rem;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 10px 20px rgba(89, 195, 72, 0.2);
}

.btn-home:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 30px rgba(89, 195, 72, 0.4);
}

.glow-1, .glow-2 {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  filter: blur(120px);
  z-index: 0;
  opacity: 0.15;
}

.glow-1 {
  background: var(--primary);
  top: -100px;
  left: -100px;
}

.glow-2 {
  background: var(--vibrant-green);
  bottom: -100px;
  right: -100px;
}

@media (max-width: 768px) {
  .error-code { font-size: 6rem; }
  h2 { font-size: 1.75rem; }
}
</style>
