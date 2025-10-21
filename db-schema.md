# 数据库结构说明

本项目使用云数据库存储所有数据，共包含以下四个集合：

## 1. students 集合（学员信息）

```js
{
  "_id": "学员ID",
  "openid": "微信OpenID",
  "phoneNumber": "手机号",
  "name": "姓名",
  "age": "年龄",
  "grade": "段位/级别",
  "avatar": "头像URL", // 云存储文件ID
  "joinDate": "入馆日期", // 格式: YYYY-MM-DD
  "expireDate": "会费到期日期", // 格式: YYYY-MM-DD
  "status": "会员状态", // 正常、过期、注册中
  "isActive": true/false, // 是否活跃
  "isVipPaid": true/false, // 是否已支付会员费
  "vipPayTime": "会员费支付时间", // 格式: YYYY-MM-DD HH:mm:ss
  "createTime": "创建时间", // 云数据库服务器时间
  "updateTime": "更新时间" // 云数据库服务器时间
}
```

## 2. honors 集合（荣誉记录）

```js
{
  "_id": "荣誉ID",
  "studentId": "学员ID", // 关联students集合
  "competitionName": "比赛名称",
  "competitionDate": "比赛日期", // 格式: YYYY-MM-DD
  "awardName": "奖项名称", // 例如：一等奖、金牌、冠军等
  "rank": "奖牌等级", // gold, silver, bronze
  "imageUrl": "荣誉图片URL", // 云存储文件ID
  "heatValue": 0, // 热度值，初始为0
  "description": "详细描述",
  "createTime": "创建时间", // 云数据库服务器时间
  "updateTime": "更新时间" // 云数据库服务器时间
}
```

## 3. registrations 集合（报名记录）

```js
{
  "_id": "报名ID",
  "openid": "微信OpenID",
  "phoneNumber": "手机号",
  "name": "姓名", // 可选
  "age": "年龄", // 可选
  "remark": "备注", // 可选
  "status": "状态", // 待处理、已联系、已报名、已取消等
  "createTime": "创建时间", // 云数据库服务器时间
  "updateTime": "更新时间" // 云数据库服务器时间
}
```

## 4. orders 集合（订单记录）

```js
{
  "_id": "订单ID",
  "order_no": "订单编号", // 系统生成
  "student_id": "学员ID", // 关联students集合
  "open_id": "微信OpenID",
  "order_type": "订单类型", // 1-会员费 2-考级费
  "amount": "支付金额",
  "status": "订单状态", // 0-待支付 1-已支付 2-已取消 3-已退款
  "wx_order_no": "微信支付订单号",
  "pay_time": "支付时间",
  "pay_method": "支付方式",
  "created_at": "创建时间", // 云数据库服务器时间
  "updated_at": "更新时间" // 云数据库服务器时间
}
```

## 安全规则设置

为确保数据安全，建议对集合设置以下安全规则：

### students 集合

- 所有用户可读取（便于查看学员信息）
- 仅管理员和创建者可写入、更新和删除

### honors 集合

- 所有用户可读取（便于查看荣誉榜）
- 仅管理员可写入、更新和删除
- 任何用户可更新热度值

### registrations 集合

- 仅创建者和管理员可读取
- 所有用户可写入（便于用户报名）
- 仅管理员和创建者可更新和删除

### orders 集合

- 仅创建者和管理员可读取
- 所有用户可写入（便于创建订单）
- 仅管理员和创建者可更新和删除 