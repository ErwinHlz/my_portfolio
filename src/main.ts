import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { vReveal } from '@/shared/directives/reveal';

import './styles/variables.scss';
import './styles/global.scss';
import './styles/realm.scss';

createApp(App).use(router).directive('reveal', vReveal).mount('#app');
