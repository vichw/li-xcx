const tcb = require('@cloudbase/node-sdk');

class Database {
    constructor() {
        this.app = tcb.init({
            env: process.env.TCB_ENV_ID,
            secretId: process.env.TCB_SECRET_ID,
            secretKey: process.env.TCB_SECRET_KEY
        });
        this.db = this.app.database();
    }

    async getList(collection, query = {}, options = {}) {
        try {
            const result = await this.db.collection(collection)
                .where(query)
                .limit(options.limit || 100)
                .skip(options.skip || 0)
                .get();
            return result;
        } catch (error) {
            console.error('获取数据失败：', error);
            throw error;
        }
    }

    async add(collection, data) {
        try {
            const result = await this.db.collection(collection).add(data);
            return result;
        } catch (error) {
            console.error('添加数据失败：', error);
            throw error;
        }
    }

    async update(collection, id, data) {
        try {
            const result = await this.db.collection(collection)
                .doc(id)
                .update(data);
            return result;
        } catch (error) {
            console.error('更新数据失败：', error);
            throw error;
        }
    }

    async delete(collection, id) {
        try {
            const result = await this.db.collection(collection)
                .doc(id)
                .remove();
            return result;
        } catch (error) {
            console.error('删除数据失败：', error);
            throw error;
        }
    }
}

module.exports = new Database();
