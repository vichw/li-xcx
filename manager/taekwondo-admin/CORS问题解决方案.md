# CORS跨域问题解决方案

## 问题描述
访问页面时出现CORS错误：
```
Access to fetch at 'https://cloud1-9gzafxc7e0a56cdb.ap-shanghai.tcb-api.tencentcloudapi.com/auth/v1/signin/anonymously' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
Request header field undefined is not allowed by Access-Control-Allow-Headers in preflight response.
```

## 根本原因
腾讯云SDK在发送请求时添加了名称为 `undefined` 的请求头，导致CORS预检请求失败。

## 解决方案（已实施）

### ✅ 方案1：简化SDK初始化配置
**已修改文件：** `src/utils/cloudbase.js`

移除了可能导致问题的配置项：
- 移除 `region` 配置（让SDK自动选择）
- 移除 `debug` 配置（避免添加额外请求头）

```javascript
const app = cloudbase.init({
  env: 'cloud1-9gzafxc7e0a56cdb',
  timeout: 15000
})
```

### ⚠️ 方案2：配置Vite代理（备用）
**已修改文件：** `vite.config.js`

添加了代理配置，但由于SDK内部自动构建API URL，此方案可能不生效。如需使用代理，需要进一步调整SDK配置。

## 最佳解决方案（推荐）

### 🔧 在腾讯云控制台配置Web安全域名

这是最根本的解决方法：

1. 登录腾讯云控制台：https://console.cloud.tencent.com/tcb
2. 选择环境：`cloud1-9gzafxc7e0a56cdb`
3. 进入 **环境设置** → **安全配置** → **Web安全域名**
4. 添加以下域名：
   - `http://localhost:5173`（开发环境）
   - `http://127.0.0.1:5173`（开发环境）
   - 你的生产环境域名（如有）

### 🔧 确认匿名登录已启用

1. 腾讯云控制台 → **环境设置** → **登录授权**
2. 确认 **匿名登录** 已开启
3. 如未开启，点击开启并保存

### 🔧 检查数据库权限配置

1. 腾讯云控制台 → **数据库** → **数据库**
2. 选择集合（如 `students`）→ **权限设置**
3. 推荐权限配置：
   ```json
   {
     "read": true,
     "write": "auth != null"
   }
   ```

## 测试步骤

配置完成后，按以下步骤测试：

1. 清除浏览器缓存和Cookie
2. 重启开发服务器：
   ```bash
   npm run dev
   ```
3. 打开浏览器控制台（F12）
4. 访问页面，查看是否还有CORS错误

## 如果问题仍未解决

### 方案A：升级SDK版本
```bash
cd manager/taekwondo-admin
npm install @cloudbase/js-sdk@latest
```

### 方案B：使用完整的代理配置

修改 `vite.config.js`，添加完整的腾讯云API代理：

```javascript
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/tcb': {
        target: 'https://tcb-api.tencentcloudapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tcb/, '')
      }
    }
  }
})
```

同时需要修改SDK的请求基础路径（需要深度定制SDK）。

### 方案C：临时禁用浏览器CORS检查（仅用于开发测试）

**Chrome：**
```bash
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir="C:\tmp\chrome_dev"

# Mac
open -na Google\ Chrome --args --disable-web-security --user-data-dir=/tmp/chrome_dev
```

**⚠️ 警告：** 此方法仅用于本地开发调试，不要在生产环境使用。

## 变更记录

### 2025-12-01
- ✅ 简化cloudbase.init配置，移除region和debug
- ✅ 添加vite代理配置（备用）
- 📝 创建此解决方案文档

## 相关文件
- `src/utils/cloudbase.js` - SDK初始化配置
- `vite.config.js` - Vite开发服务器配置
- `package.json` - 依赖版本管理

