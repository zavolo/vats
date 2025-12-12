import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: () => import('@/views/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue')
        },
        {
          path: 'calls',
          name: 'calls',
          component: () => import('@/views/CallsView.vue'),
          meta: { permission: { resource: 'calls', action: 'read' } }
        },
        {
          path: 'dongles',
          name: 'dongles',
          component: () => import('@/views/DonglesView.vue'),
          meta: { permission: { resource: 'dongles', action: 'read' } }
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UsersView.vue'),
          meta: { permission: { resource: 'users', action: 'read' } }
        },
        {
          path: 'companies',
          name: 'companies',
          component: () => import('@/views/CompaniesView.vue'),
          meta: { permission: { resource: 'companies', action: 'read' } }
        },
        {
          path: 'payments',
          name: 'payments',
          component: () => import('@/views/PaymentsView.vue')
        },
        {
          path: 'tariffs',
          name: 'tariffs',
          component: () => import('@/views/TariffsView.vue')
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue')
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue')
        }
      ]
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const permissionsStore = usePermissionsStore()
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login')
    return
  }

  if (to.path === '/login' && authStore.isAuthenticated) {
    next('/')
    return
  }

  if (to.meta.permission) {
    const { resource, action } = to.meta.permission
    
    if (!permissionsStore.permissions.length) {
      await permissionsStore.fetchPermissions()
    }

    if (!permissionsStore.hasPermission(resource, action)) {
      next('/')
      return
    }
  }

  next()
})

export default router