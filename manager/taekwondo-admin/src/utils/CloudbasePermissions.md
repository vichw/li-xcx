# 腾讯云数据库权限配置指南

## 问题描述

当您遇到以下错误时，表示存在腾讯云开发身份验证或数据库权限问题：

### 匿名登录被禁用错误

```
{
    "code": "ACCESS_TOKEN_DISABLED",
    "message": "access token disabled for ANONYMOUS login 请前往云开发AI小助手查看问题：https://tcb.cloud.tencent.com/dev#/helper/copilot?q=ACCESS_TOKEN_DISABLED",
    "requestId": "83636dee9052c"
}
```

### 数据库权限被拒绝错误

```
{
    "code": "DATABASE_PERMISSION_DENIED",
    "message": "Permission denied 请前往云开发AI小助手查看问题：https://tcb.cloud.tencent.com/dev#/helper/copilot?q=DATABASE_PERMISSION_DENIED",
    "requestId": "199b4af2334b8"
}
```

## 解决 ACCESS_TOKEN_DISABLED 错误

此错误表示匿名登录功能已被禁用。根据腾讯云官方文档，需要在腾讯云控制台中启用匿名登录：

### 启用匿名登录（官方推荐方法）

1. 登录腾讯云开发控制台：https://console.cloud.tencent.com/tcb
2. 选择您的云环境 `cloud1-6g5xcrtub6610fb6`
3. 在左侧导航栏，选择"环境设置"
4. 点击"登录方式"标签页
5. 找到"匿名登录"选项，将其启用
   - 通常在登录方式列表中
   - 将状态切换为"已开启"
6. 点击"保存"按钮

启用后，应用程序可以使用 `auth.signInAnonymously()` 方法进行匿名登录，无需用户名和密码。

### 匿名登录的工作原理

根据腾讯云文档，匿名登录的主要特点：

1. 无需用户输入账号密码即可登录
2. 登录状态由云开发SDK管理
3. 默认登录态会保存在浏览器的localStorage中
4. 每个匿名用户会获得一个唯一的用户ID
5. 适合需要快速体验但不需要保存个人信息的场景

### 匿名登录的API使用

我们的应用使用以下匿名登录流程：

```js
// 初始化云开发SDK
const app = cloudbase.init({
  env: 'cloud1-6g5xcrtub6610fb6',
  region: 'ap-shanghai',
  timeout: 15000
});

// 获取auth服务
const auth = app.auth({
  persistence: 'local'  // 使用本地存储保留登录状态
});

// 执行匿名登录
await auth.signInAnonymously();

// 获取登录状态
const loginState = await auth.getLoginState();
if (loginState && loginState.isAnonymous) {
  console.log('匿名登录成功，用户ID:', loginState.user.uid);
}
```

## 数据库权限配置

启用匿名登录后，需要确保数据库集合的权限设置正确：

### 1. 登录腾讯云开发控制台

访问 https://console.cloud.tencent.com/tcb

### 2. 选择您的云环境

在控制台左侧导航栏，选择"云环境"，然后选择您的环境 `cloud1-6g5xcrtub6610fb6`。

### 3. 配置数据库权限

1. 在左侧导航栏中，选择"数据库"
2. 点击"集合权限"标签页
3. 找到需要访问的集合（如 `students`, `honor`, `registrations` 等）
4. 点击"修改权限"按钮
5. 配置权限规则：

**针对匿名登录的推荐权限设置**
```json
{
  "read": true,  // 允许所有人（包括匿名用户）读取数据
  "write": "auth != null"  // 允许任何已登录用户（包括匿名登录）写入数据
}
```

如果您希望更精确地控制匿名用户权限：
```json
{
  "read": true,  // 允许所有人读取
  "write": "auth != null && auth.loginType == 'ANONYMOUS'"  // 只允许匿名登录用户写入
}
```

### 4. 配置网站托管安全域名

网站托管安全域名设置可以防止未授权域名访问您的资源：

1. 在左侧导航栏，选择"网站托管"
2. 点击"设置"标签页
3. 在"安全配置"部分，添加您的管理后台域名到"安全域名"列表中
   - 例如：`http://localhost:3000`、`http://localhost:5173`、`https://yourdomain.com` 等
   - 务必包括协议(http/https)和完整域名
   - 本地开发时添加 `localhost` 相关域名

### 5. 测试匿名登录

匿名登录配置完成后，您可以检查登录状态是否正确：

```js
const loginState = await auth.getLoginState();
console.log('是否为匿名登录:', loginState.isAnonymous); // 应该为 true
console.log('用户ID:', loginState.user.uid);
```

## 特定集合的权限设置示例

对于不同的集合，可以设置不同的权限：

### students 集合（学生信息）

```json
{
  "read": true,
  "write": "auth != null && auth.loginType == 'ANONYMOUS'"
}
```

### honor 集合（荣誉信息）

```json
{
  "read": true,
  "write": "auth != null"
}
```

### registrations 集合（报名信息）

```json
{
  "read": "auth != null",
  "write": "auth != null"
}
```

## 故障排除

如果您仍然遇到问题：

1. **确认已启用匿名登录**：检查控制台设置，确保状态为"已开启"
2. **刷新页面并清除缓存**：有时浏览器缓存会导致旧的设置仍然生效
3. **检查控制台错误**：打开浏览器开发者工具，查看详细错误信息
4. **验证环境ID正确**：确保代码中的环境ID与控制台显示的一致
5. **检查安全域名设置**：确保您当前访问的域名已添加到安全域名列表
6. **查看腾讯云状态**：确认腾讯云服务是否正常运行

## 环境变量配置

如果您在不同环境中使用不同的云环境ID，建议将环境ID配置为环境变量：

```js
// .env 或 .env.development 文件
VITE_CLOUDBASE_ENV_ID=cloud1-6g5xcrtub6610fb6
VITE_CLOUDBASE_REGION=ap-shanghai

// 在代码中使用
const app = cloudbase.init({
  env: import.meta.env.VITE_CLOUDBASE_ENV_ID,
  region: import.meta.env.VITE_CLOUDBASE_REGION
});
```

如果以上都检查过但问题依然存在，可以临时启用模拟数据（设置 `USE_MOCK = true`）进行开发。 