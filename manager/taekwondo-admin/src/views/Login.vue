<template>
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #F9FAFB; padding: 48px 16px;">
    <div style="max-width: 400px; width: 100%; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="font-size: 1.875rem; font-weight: bold; color: #111827; margin-bottom: 8px;">跆拳道管理系统</h2>
        <p style="font-size: 0.875rem; color: #4B5563;">
          请登录管理员账号
        </p>
      </div>
      
      <!-- 使用原生HTML表单 -->
      <form @submit.prevent="handleLogin" style="margin-top: 24px;">
        <div style="margin-bottom: 16px;">
          <label for="username" style="display: none;">用户名</label>
          <input 
            id="username" 
            name="username" 
            type="text" 
            v-model="loginForm.username" 
            required 
            style="display: block; width: 100%; padding: 10px 12px; border: 1px solid #D1D5DB; border-radius: 4px; font-size: 14px; color: #111827; background-color: white;" 
            placeholder="用户名"
          />
        </div>
        <div style="margin-bottom: 24px;">
          <label for="password" style="display: none;">密码</label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            v-model="loginForm.password" 
            required 
            style="display: block; width: 100%; padding: 10px 12px; border: 1px solid #D1D5DB; border-radius: 4px; font-size: 14px; color: #111827; background-color: white;" 
            placeholder="密码"
          />
        </div>
        
        <!-- 登录按钮 -->
        <div style="margin-top: 24px;">
          <button 
            type="submit"
            :disabled="loading"
            style="width: 100%; padding: 12px; background-color: #4F46E5; color: white; border-radius: 4px; font-weight: 500; border: none; cursor: pointer; font-size: 14px;"
          >
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { adminLogin } from '../utils/cloudbase'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    alert('请输入用户名和密码');
    return;
  }
  
  loading.value = true;
  try {
    // 默认账号密码：admin/admin123
    if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
      const userData = {
        _id: 'admin001',
        username: 'admin',
        name: '管理员',
        role: 'admin'
      };
      
      // 将用户信息存入状态管理
      userStore.setUser(userData);
      userStore.setToken(userData._id);
      
      alert('登录成功');
      router.push('/dashboard');
      return;
    }
    
    // 调用登录API
    const result = await adminLogin(loginForm.username, loginForm.password);
    
    if (result.success) {
      // 将用户信息存入状态管理
      userStore.setUser(result.data);
      userStore.setToken(result.data._id); // 使用ID作为简单的token
      
      alert('登录成功');
      router.push('/dashboard');
    } else {
      alert(result.message || '登录失败');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('登录出现错误，请稍后再试');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* 确保按钮样式被正确应用 */
button[type="submit"] {
  width: 100%;
  padding: 12px;
  background-color: #4F46E5;
  color: white;
  border-radius: 4px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  margin-top: 24px;
  font-size: 14px;
}

button[type="submit"]:hover {
  background-color: #4338CA;
}

button[type="submit"]:disabled {
  background-color: #6B7280;
  cursor: not-allowed;
}

input {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  font-size: 14px;
  color: #111827;
  background-color: white;
}

input:focus {
  outline: none;
  border-color: #4F46E5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}
</style> 