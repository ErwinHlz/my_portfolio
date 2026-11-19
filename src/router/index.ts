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
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutView.vue'),
    },
    {
      path: '/leistungen',
      name: 'services',
      component: () => import('@/views/ServicesView.vue'),
    },
    {
      path: '/projekte',
      name: 'projects',
      component: () => import('@/views/ProjectsView.vue'),
    },
    {
      path: '/playground',
      name: 'playground',
      component: () => import('@/views/PlaygroundView.vue'),
    },
    {
      path: '/contact',
      name: 'contact',
      component: () => import('@/views/ContactView.vue'),
    },
    {
      path: '/datenschutz',
      name: 'privacy',
      component: () => import('@/views/PrivacyView.vue'),
    },
    {
      path: '/impressum',
      name: 'imprint',
      component: () => import('@/views/ImprintView.vue'),
    },
    // alte URL weiterleiten
    { path: '/my-projects', redirect: '/projekte' },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
});

export default router;
