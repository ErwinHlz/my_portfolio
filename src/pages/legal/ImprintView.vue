<script setup lang="ts">
import LegalPage from './components/LegalPage.vue';
import { siteOwner } from '@/shared/data/siteOwner';
</script>

<template>
  <LegalPage title="Impressum">
    <section>
      <h2>Anbieterangaben nach § 5 DDG</h2>
      <address>
        <div>{{ siteOwner.name }}</div>
        <div v-for="line in siteOwner.address" :key="line">{{ line }}</div>
      </address>
    </section>

    <section>
      <h2>Kontakt</h2>
      <p>
        E-Mail <a :href="`mailto:${siteOwner.email}`">{{ siteOwner.email }}</a>
      </p>
    </section>
  </LegalPage>
</template>
