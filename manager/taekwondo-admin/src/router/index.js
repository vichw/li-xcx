import { createRouter, createWebHistory } from 'vue-router'
import ExportGradeExam from '../views/ExportGradeExam.vue'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('../views/Home.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'student',
        name: 'Student',
        component: () => import('../views/Student.vue'),
        meta: { title: '学生管理' }
      },
      {
        path: 'honor',
        name: 'Honor',
        component: () => import('../views/Honor.vue'),
        meta: { title: '荣誉管理' }
      },
      {
        path: 'registration',
        name: 'Registration',
        component: () => import('../views/Registration.vue'),
        meta: { title: '注册管理' }
      },
      {
        path: 'export-grade-exam',
        name: 'ExportGradeExam',
        component: () => import('../views/ExportGradeExam.vue'),
        meta: { title: '导出成绩' }
      }
    ]
  },
  
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('token')
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router 