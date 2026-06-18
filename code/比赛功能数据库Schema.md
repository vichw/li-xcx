# 比赛功能数据库 Schema

## 数据库表关系图

```
┌─────────────────────┐
│   competitions      │  比赛主表
│─────────────────────│
│ _id (PK)           │
│ name               │  赛事名称
│ start_date         │  开始日期
│ end_date           │  结束日期
│ grade              │  级别
│ status             │  状态
│ top_display_count  │  展示前几名
│ participant_count  │  参赛人数
│ bracket_generated  │  是否已生成对战表
│ create_time        │
│ update_time        │
└─────────────────────┘
         │ 1
         │
         │ N
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│ competition_brackets │      │ competition_results  │
│──────────────────────│      │──────────────────────│
│ _id (PK)            │      │ _id (PK)            │
│ competition_id (FK) │      │ competition_id (FK) │
│ round               │      │ student_id          │
│ match_no            │      │ student_name        │
│ position            │      │ student_avatar      │
│ student1_id         │      │ rank                │
│ student1_name       │      │ create_time         │
│ student1_avatar     │      └──────────────────────┘
│ student2_id         │
│ student2_name       │
│ student2_avatar     │
│ winner_id           │
│ winner_name         │
│ score               │
│ create_time         │
└──────────────────────┘
```

## 1. competitions (比赛表)

### 表结构

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | String | ✅ | 比赛ID（自动生成） | "comp001" |
| name | String | ✅ | 赛事名称 | "2025春季蓝红带晋级赛" |
| start_date | Date | ✅ | 开始日期 | 2025-03-01 |
| end_date | Date | ✅ | 结束日期 | 2025-03-15 |
| grade | String | ✅ | 级别 | "蓝红带三级" |
| status | String | ✅ | 状态 | "pending" / "ongoing" / "finished" |
| top_display_count | Number | ✅ | 展示前几名 | 3 |
| participant_count | Number | - | 参赛人数 | 16 |
| bracket_generated | Boolean | ✅ | 是否已生成对战表 | false |
| create_time | Date | ✅ | 创建时间 | 2025-03-01 10:00:00 |
| update_time | Date | ✅ | 更新时间 | 2025-03-01 10:00:00 |

### 状态说明

```javascript
{
  "pending": "未开始",    // 当前日期 < 开始日期
  "ongoing": "进行中",    // 开始日期 <= 当前日期 <= 结束日期
  "finished": "已完成"    // 当前日期 > 结束日期 或 手动完成
}
```

### 示例数据

```json
{
  "_id": "674f8e9b680df15701f646c0",
  "name": "2025春季蓝红带晋级赛",
  "start_date": {
    "$date": "2025-03-01T00:00:00.000Z"
  },
  "end_date": {
    "$date": "2025-03-15T23:59:59.999Z"
  },
  "grade": "蓝红带三级",
  "status": "ongoing",
  "top_display_count": 3,
  "participant_count": 16,
  "bracket_generated": true,
  "create_time": {
    "$date": "2025-02-20T08:00:00.000Z"
  },
  "update_time": {
    "$date": "2025-03-01T10:30:00.000Z"
  }
}
```

### 索引建议

```javascript
// 按级别查询
db.competitions.createIndex({ "grade": 1 })

// 按状态查询
db.competitions.createIndex({ "status": 1 })

// 按日期查询
db.competitions.createIndex({ "start_date": -1 })
```

## 2. competition_brackets (对战表)

### 表结构

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | String | ✅ | 对战ID（自动生成） | "match001" |
| competition_id | String | ✅ | 比赛ID | "comp001" |
| round | Number | ✅ | 轮次 | 1 (第一轮) |
| match_no | Number | ✅ | 场次号 | 1 |
| position | String | ✅ | 位置标识 | "R1-M1" |
| student1_id | String | - | 学员1 ID | "stu001" |
| student1_name | String | - | 学员1姓名 | "张三" |
| student1_avatar | String | - | 学员1头像 | "cloud://..." |
| student2_id | String | - | 学员2 ID | "stu002" (轮空时为null) |
| student2_name | String | - | 学员2姓名 | "李四" |
| student2_avatar | String | - | 学员2头像 | "cloud://..." |
| winner_id | String | - | 获胜者ID | "stu001" (未比赛时为null) |
| winner_name | String | - | 获胜者姓名 | "张三" |
| score | String | - | 比分 | "3:2" 或 "轮空" |
| create_time | Date | ✅ | 创建时间 | 2025-03-01 10:00:00 |

### 轮次说明

```
8人单败淘汰赛示例：

Round 1 (第一轮) - 4场
Round 2 (半决赛) - 2场
Round 3 (决赛) - 1场

16人单败淘汰赛示例：

Round 1 (第一轮) - 8场
Round 2 (第二轮) - 4场
Round 3 (半决赛) - 2场
Round 4 (决赛) - 1场
```

### 位置标识说明

```javascript
// position 格式: R{轮次}-M{场次}
"R1-M1"  // 第1轮第1场
"R1-M2"  // 第1轮第2场
"R2-M1"  // 第2轮第1场
"R3-M1"  // 第3轮(决赛)第1场
```

### 示例数据

**第一轮对战：**
```json
{
  "_id": "674f8e9b680df15701f646c1",
  "competition_id": "674f8e9b680df15701f646c0",
  "round": 1,
  "match_no": 1,
  "position": "R1-M1",
  "student1_id": "c42c9d1b680df68801f1654d253b74f1",
  "student1_name": "奥琦",
  "student1_avatar": "cloud://cloud1-6g5xcrtub6610fb6.636c-cloud1-6g5xcrtub6610fb6-1354054349/avatars/1747436888370.jpg",
  "student2_id": "76c63bbb680cbcd701e3589927691106",
  "student2_name": "希如海",
  "student2_avatar": "cloud://cloud1-6g5xcrtub6610fb6.636c-cloud1-6g5xcrtub6610fb6-1354054349/avatars/1750058769249.jpg",
  "winner_id": "c42c9d1b680df68801f1654d253b74f1",
  "winner_name": "奥琦",
  "score": "3:2",
  "create_time": {
    "$date": "2025-03-01T10:00:00.000Z"
  }
}
```

**轮空对战：**
```json
{
  "_id": "674f8e9b680df15701f646c2",
  "competition_id": "674f8e9b680df15701f646c0",
  "round": 1,
  "match_no": 2,
  "position": "R1-M2",
  "student1_id": "2b83cb16680cbd5b01e68b553546571c",
  "student1_name": "杨佳淼",
  "student1_avatar": "https://636c-cloud1-6g5xcrtub6610fb6-1354054349.tcb.qcloud.la/avatars/1750071753584.jpg",
  "student2_id": null,
  "student2_name": null,
  "student2_avatar": null,
  "winner_id": "2b83cb16680cbd5b01e68b553546571c",
  "winner_name": "杨佳淼",
  "score": "轮空",
  "create_time": {
    "$date": "2025-03-01T10:00:00.000Z"
  }
}
```

**待比赛对战：**
```json
{
  "_id": "674f8e9b680df15701f646c3",
  "competition_id": "674f8e9b680df15701f646c0",
  "round": 2,
  "match_no": 1,
  "position": "R2-M1",
  "student1_id": null,
  "student1_name": "待定",
  "student1_avatar": null,
  "student2_id": null,
  "student2_name": "待定",
  "student2_avatar": null,
  "winner_id": null,
  "winner_name": null,
  "score": null,
  "create_time": {
    "$date": "2025-03-01T10:00:00.000Z"
  }
}
```

### 索引建议

```javascript
// 查询某场比赛的所有对战
db.competition_brackets.createIndex({ "competition_id": 1, "round": 1 })

// 查询特定对战
db.competition_brackets.createIndex({ "competition_id": 1, "position": 1 })
```

## 3. competition_results (比赛结果表)

### 表结构

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | String | ✅ | 结果ID（自动生成） | "result001" |
| competition_id | String | ✅ | 比赛ID | "comp001" |
| student_id | String | ✅ | 学员ID | "stu001" |
| student_name | String | ✅ | 学员姓名 | "张三" |
| student_avatar | String | - | 学员头像 | "cloud://..." |
| rank | Number | ✅ | 名次 | 1 |
| create_time | Date | ✅ | 创建时间 | 2025-03-15 18:00:00 |

### 名次说明

```javascript
{
  1: "冠军 🥇",
  2: "亚军 🥈",
  3: "季军 🥉",
  4: "第四名",
  5: "第五名",
  6: "第六名"
  // ... 根据 top_display_count 设置
}
```

### 示例数据

```json
[
  {
    "_id": "674f8e9b680df15701f646c4",
    "competition_id": "674f8e9b680df15701f646c0",
    "student_id": "c42c9d1b680df68801f1654d253b74f1",
    "student_name": "奥琦",
    "student_avatar": "cloud://cloud1-6g5xcrtub6610fb6.636c-cloud1-6g5xcrtub6610fb6-1354054349/avatars/1747436888370.jpg",
    "rank": 1,
    "create_time": {
      "$date": "2025-03-15T18:00:00.000Z"
    }
  },
  {
    "_id": "674f8e9b680df15701f646c5",
    "competition_id": "674f8e9b680df15701f646c0",
    "student_id": "2b83cb16680cbd5b01e68b553546571c",
    "student_name": "杨佳淼",
    "student_avatar": "https://636c-cloud1-6g5xcrtub6610fb6-1354054349.tcb.qcloud.la/avatars/1750071753584.jpg",
    "rank": 2,
    "create_time": {
      "$date": "2025-03-15T18:00:00.000Z"
    }
  },
  {
    "_id": "674f8e9b680df15701f646c6",
    "competition_id": "674f8e9b680df15701f646c0",
    "student_id": "76c63bbb680cbcd701e3589927691106",
    "student_name": "希如海",
    "student_avatar": "cloud://cloud1-6g5xcrtub6610fb6.636c-cloud1-6g5xcrtub6610fb6-1354054349/avatars/1750058769249.jpg",
    "rank": 3,
    "create_time": {
      "$date": "2025-03-15T18:00:00.000Z"
    }
  }
]
```

### 索引建议

```javascript
// 查询某场比赛的结果
db.competition_results.createIndex({ "competition_id": 1, "rank": 1 })
```

## 数据流程示例

### 完整流程（8人单败淘汰赛）

```
1️⃣ 创建比赛
┌─────────────────────┐
│ competitions        │
│─────────────────────│
│ name: "春季蓝红带赛"│
│ grade: "蓝红带三级" │
│ status: "pending"   │
│ bracket_generated:  │
│   false             │
└─────────────────────┘

2️⃣ 生成对战表（自动从students表筛选同级别学员）
┌─────────────────────┐
│ competition_brackets│
│─────────────────────│
│ Round 1: 4场        │
│  M1: A vs B        │
│  M2: C vs D        │
│  M3: E vs F        │
│  M4: G vs H        │
│                     │
│ Round 2: 2场 (待定) │
│  M1: 待定 vs 待定   │
│  M2: 待定 vs 待定   │
│                     │
│ Round 3: 1场 (待定) │
│  M1: 待定 vs 待定   │
└─────────────────────┘

3️⃣ 录入第一轮结果
┌─────────────────────┐
│ R1-M1: A vs B      │
│ 比分: 3:2          │
│ 获胜: A ✅         │
└─────────────────────┘
        ↓
自动晋级到 R2-M1 的 student1

4️⃣ 完成所有对战后，保存最终结果
┌─────────────────────┐
│ competition_results │
│─────────────────────│
│ Rank 1: 学员A 🥇   │
│ Rank 2: 学员C 🥈   │
│ Rank 3: 学员E 🥉   │
└─────────────────────┘

5️⃣ 小程序展示
┌─────────────────────┐
│ 比赛详情            │
│─────────────────────│
│ [对战表] [结果]     │
│                     │
│ 🥇 学员A           │
│ 🥈 学员C           │
│ 🥉 学员E           │
└─────────────────────┘
```

## 数据一致性规则

### 1. 级联删除
```javascript
// 删除比赛时，级联删除相关数据
async function deleteCompetition(competitionId) {
  // 1. 删除对战表
  await db.collection('competition_brackets')
    .where({ competition_id: competitionId })
    .remove();
  
  // 2. 删除比赛结果
  await db.collection('competition_results')
    .where({ competition_id: competitionId })
    .remove();
  
  // 3. 删除比赛
  await db.collection('competitions')
    .doc(competitionId)
    .remove();
}
```

### 2. 状态约束
```javascript
// 只有未开始的比赛可以删除
if (competition.status !== 'pending') {
  throw new Error('只能删除未开始的比赛');
}

// 只有生成对战表后才能录入结果
if (!competition.bracket_generated) {
  throw new Error('请先生成对战表');
}

// 只有比赛完成后才能保存最终结果
if (competition.status !== 'finished') {
  throw new Error('只有已完成的比赛可以保存结果');
}
```

### 3. 数据完整性
```javascript
// 保存结果时验证
function validateResults(results, topDisplayCount) {
  // 名次必须连续
  const ranks = results.map(r => r.rank).sort();
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) {
      throw new Error('名次必须连续');
    }
  }
  
  // 名次数量不能超过设置
  if (results.length > topDisplayCount) {
    throw new Error(`最多只能设置前${topDisplayCount}名`);
  }
}
```

## 查询示例

### 1. 获取进行中的比赛
```javascript
const ongoingCompetitions = await db.collection('competitions')
  .where({
    status: 'ongoing'
  })
  .orderBy('start_date', 'desc')
  .get();
```

### 2. 获取比赛详情（含对战表和结果）
```javascript
async function getCompetitionDetail(competitionId) {
  // 比赛信息
  const competition = await db.collection('competitions')
    .doc(competitionId)
    .get();
  
  // 对战表
  const brackets = await db.collection('competition_brackets')
    .where({ competition_id: competitionId })
    .orderBy('round', 'asc')
    .orderBy('match_no', 'asc')
    .get();
  
  // 比赛结果
  const results = await db.collection('competition_results')
    .where({ competition_id: competitionId })
    .orderBy('rank', 'asc')
    .get();
  
  return {
    competition: competition.data,
    brackets: brackets.data,
    results: results.data
  };
}
```

### 3. 获取某个学员的参赛记录
```javascript
async function getStudentCompetitions(studentId) {
  // 从对战表中查找
  const brackets = await db.collection('competition_brackets')
    .where({
      _: db.command.or([
        { student1_id: studentId },
        { student2_id: studentId }
      ])
    })
    .get();
  
  // 获取比赛信息
  const competitionIds = [...new Set(brackets.data.map(b => b.competition_id))];
  const competitions = await db.collection('competitions')
    .where({
      _id: db.command.in(competitionIds)
    })
    .get();
  
  return competitions.data;
}
```

---

**数据库 Schema 设计完成！** ✅

如需调整或有疑问，请随时反馈！

