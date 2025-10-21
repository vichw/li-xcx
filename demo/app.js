require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./src/db');
const storage = require('./src/storage');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

// 数据库操作路由
app.get('/api/list/:collection', async (req, res) => {
    try {
        const result = await db.getList(req.params.collection);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/add/:collection', async (req, res) => {
    try {
        const result = await db.add(req.params.collection, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/update/:collection/:id', async (req, res) => {
    try {
        const result = await db.update(req.params.collection, req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/delete/:collection/:id', async (req, res) => {
    try {
        const result = await db.delete(req.params.collection, req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 存储操作路由
app.get('/api/storage', async (req, res) => {
    try {
        const result = await storage.listFiles(req.query.prefix);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/storage/:fileId', async (req, res) => {
    try {
        const result = await storage.deleteFile(req.params.fileId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/storage/:fileId/url', async (req, res) => {
    try {
        const result = await storage.getFileUrl(req.params.fileId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log('=================================');
    console.log(`服务器启动成功！`);
    console.log(`访问地址：http://localhost:${port}`);
    console.log('=================================');
});
