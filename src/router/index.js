import {createRouter, createWebHistory} from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
            exact: true,
        },
        {
            path: '/about',
            name: 'about',
            // route level code-splitting
            // this generates a separate chunk (About.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import('../views/AboutView.vue')
        },
        {
            path: '/register',
            name: 'register',
            component: () => import('../views/RegisterView.vue'),
            meta: { guestOnly: true },
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('../views/LoginView.vue'),
            meta: { guestOnly: true },
        },
        {
            path: '/forgot-password',
            name: 'forgotPassword',
            component: () => import('../views/ForgotPassword.vue')
        },
        {
            path: '/reset-password',
            name: 'resetPassword',
            component: () => import('../views/ResetPassword.vue')
        },
        {
            path: '/verify-email',
            name: 'verifyEmail',
            component: () => import('../views/VerifyEmail.vue')
        },
        {
            path: '/dashboard',
            name: 'dashboard',
            component: () => import('../views/DashboardView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/project/:projectId/view',
            name: 'ProjectView',
            component: () => import('../views/ProjectView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/public/project/:projectId/view',
            name: 'PublicProjectView',
            component: () => import('../views/PublicProjectView.vue')
        },
        {
            path: '/leaderboard',
            name: 'leaderboard',
            component: () => import('../views/Leaderboard.vue')
        },
        {
            path: '/admin/project/:projectId/data',
            name: 'ProjectDetails',
            component: () => import('../views/Admin/ProjectDetails.vue'),
            props: true,
            meta: { requiresAuth: true },
        },
        {
            path: '/admin/project/:projectId/tasks',
            name: 'TaskManager',
            component: () => import('../views/Admin/TaskManager.vue'),
            props: true,
            meta: { requiresAuth: true },
        },
        {
            path: '/admin/project/:projectId/checkins',
            name: 'AdminCheckins',
            component: () => import('../views/Admin/AdminCheckins.vue'),
            props: true,
            meta: { requiresAuth: true },
        },
        {
            path: '/admin/project/:projectId/gamification/',
            name: 'GamificationConfig',
            component: () => import('../views/Admin/GamificationConfig.vue'),
            props: true,
            meta: { requiresAuth: true },
        },
        {
            path: '/admin/project/:projectId/gamification/fading',
            name: 'BadgeFadingPanel',
            component: () => import('../views/Admin/BadgeFadingPanel.vue'),
            props: true,
            meta: { requiresAuth: true },
        },
        {
            path: '/admin/project/:projectId/gamification/badge/:id',
            name: 'BadgeConfig',
            component: () => import('../views/Admin/AddEditBadge.vue'),
            props: true,
            meta: { requiresAuth: true },
        },
        {
            path: '/admin/project/:projectId/gamification/score-rule/:id',
            name: 'ScoreRuleConfig',
            component: () => import('../views/Admin/AddEditScoreRule.vue'),
            props: true,
            meta: { requiresAuth: true },
        },
        {
            path: '/admin',
            name: 'admin',
            component: () => import('../views/Admin/AdminView.vue'),
            exact: true,
            meta: { requiresAuth: true },
        },
        {
            path: '/admin/analytics',
            name: 'analytics-dashboard',
            component: () => import('../views/Admin/AnalyticsDashboard.vue'),
        },
    ]
})

router.beforeEach((to, from, next) => {
    const hasToken = Boolean(localStorage.getItem('token'));

    if (to.meta.requiresAuth && !hasToken) {
        next({ name: 'login' });
        return;
    }

    if (to.meta.guestOnly && hasToken) {
        next({ name: 'dashboard' });
        return;
    }

    next();
});

export default router
