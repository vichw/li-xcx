<template>
  <router-view />
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', sans-serif;
}

/* 修改Element Plus默认主题样式 */
:root {
  --el-color-primary: #4f46e5;
  --el-color-success: #10b981;
  --el-color-warning: #f59e0b;
  --el-color-danger: #ef4444;
  --el-color-info: #6b7280;
}

/* 修复暗模式下的一些样式 */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1f2937;
    color: #f9fafb;
  }
}
</style>
