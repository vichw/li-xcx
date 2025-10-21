const tcb = require('@cloudbase/node-sdk');

class Storage {
    constructor() {
        this.app = tcb.init({
            env: process.env.TCB_ENV_ID,
            secretId: process.env.TCB_SECRET_ID,
            secretKey: process.env.TCB_SECRET_KEY
        });
        this.storage = this.app.storage();
    }

    async listFiles(prefix = '') {
        try {
            const result = await this.storage.listFilesByPath(prefix);
            return result.data;
        } catch (error) {
            console.error('获取文件列表失败：', error);
            throw error;
        }
    }

    async deleteFile(fileId) {
        try {
            const result = await this.storage.deleteFile([fileId]);
            return result;
        } catch (error) {
            console.error('删除文件失败：', error);
            throw error;
        }
    }

    async getFileUrl(fileId) {
        try {
            const result = await this.storage.getTemporaryUrl([fileId]);
            return result.fileList[0];
        } catch (error) {
            console.error('获取文件链接失败：', error);
            throw error;
        }
    }
}

module.exports = new Storage();
