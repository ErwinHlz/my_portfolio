import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  linkActiveClass: '',
  linkExactActiveClass: 'active',
  routes: [
    { path: '/', redirect: '/home' },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/pages/home/HomeView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/pages/about/AboutView.vue'),
    },
    {
      path: '/leistungen',
      name: 'services',
      component: () => import('@/pages/services/ServicesView.vue'),
    },
    {
      path: '/projekte',
      name: 'projects',
      component: () => import('@/pages/projects/ProjectsView.vue'),
    },
    {
      path: '/playground',
      name: 'playground',
      component: () => import('@/pages/playground/PlaygroundView.vue'),
    },
    {
      path: '/contact',
      name: 'contact',
      component: () => import('@/pages/contact/ContactView.vue'),
    },
    {
      path: '/datenschutz',
      name: 'privacy',
      component: () => import('@/pages/legal/PrivacyView.vue'),
    },
    {
      path: '/impressum',
      name: 'imprint',
      component: () => import('@/pages/legal/ImprintView.vue'),
    },
    // alte URL weiterleiten
    { path: '/my-projects', redirect: '/projekte' },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
});

export default router;
