<script setup>
import Navbar from './components/Navbar.vue'
import Hero from './components/Hero.vue'
import Features from './components/Features.vue'
import Pricing from './components/Pricing.vue'
import ContactForm from './components/ContactForm.vue'
import Footer from './components/Footer.vue'
</script>

<template>
  <div class="app-wrapper">
    <div class="bg-blur"></div>
    <Navbar />
    <main>
      <Hero />
      <Features />
      <Pricing />
      <ContactForm />
    </main>
    <Footer />
  </div>
</template>

<style>
.app-wrapper {
  position: relative;
  min-height: 100vh;
}

.bg-blur {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  background: radial-gradient(circle at 0% 0%, rgba(37, 211, 102, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 100% 100%, rgba(18, 140, 126, 0.05) 0%, transparent 40%);
  pointer-events: none;
}

main {
  width: 100%;
}
</style>
