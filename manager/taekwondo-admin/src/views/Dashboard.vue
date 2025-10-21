<template>
  <div class="h-full flex">
    <!-- 侧边栏 -->
    <div class="w-64 bg-gray-800 text-white flex flex-col">
      <div class="px-4 py-6">
        <h1 class="text-xl font-semibold">跆拳道管理系统</h1>
      </div>
      
      <div class="flex-1 overflow-y-auto">
        <el-menu
          router
          background-color="#1F2937"
          text-color="#fff"
          active-text-color="#409EFF"
          class="border-none"
          :default-active="activeMenu"
        >
          <el-menu-item index="/dashboard">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </el-menu-item>
          
          <el-menu-item index="/dashboard/student">
            <el-icon><User /></el-icon>
            <span>学生管理</span>
          </el-menu-item>
          
          <el-menu-item index="/dashboard/honor">
            <el-icon><Trophy /></el-icon>
            <span>荣誉管理</span>
          </el-menu-item>
          
          <el-menu-item index="/dashboard/registration">
            <el-icon><Document /></el-icon>
            <span>注册管理</span>
          </el-menu-item>

          <el-menu-item index="/dashboard/export-grade-exam">
            <el-icon><Document /></el-icon>
            <span>报名管理</span>
          </el-menu-item>
        </el-menu>
      </div>
      
      <div class="p-4 border-t border-gray-700">
        <el-button type="danger" plain @click="handleLogout" class="w-full">
          <el-icon class="mr-2"><SwitchButton /></el-icon>
          退出登录
        </el-button>
      </div>
    </div>
    
    <!-- 主内容区 -->
    <div class="flex-1 flex flex-col overflow-x-hidden">
      <!-- 顶部导航栏 -->
      <header class="bg-white shadow-sm">
        <div class="flex justify-between items-center px-6 py-4">
          <div class="flex items-center">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
              <el-breadcrumb-item v-if="currentRouteMeta">{{ currentRouteMeta.title }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          
          <div class="flex items-center">
            <el-dropdown>
              <span class="flex items-center cursor-pointer">
                <el-avatar :size="32" icon="UserFilled" />
                <span class="ml-2">{{ userName }}</span>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </header>
      
      <!-- 页面内容 -->
      <main class="flex-1 overflow-y-auto p-6 bg-gray-50">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 活跃菜单项
const activeMenu = computed(() => route.path)

// 当前路由元信息
const currentRouteMeta = computed(() => route.meta)

// 用户名
const userName = computed(() => {
  const user = userStore.userInfo
  return user ? user.username : '管理员'
})

// 登出处理
const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    userStore.logout()
    router.push('/')
  }).catch(() => {})
}

// 检查登录状态
onMounted(() => {
  if (!userStore.isLoggedIn) {
    router.push('/')
  }
})
</script> 