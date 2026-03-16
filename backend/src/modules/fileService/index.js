const { Module } = require("@medusajs/framework/utils");

class FileService {
    constructor() {
        const path = require("path");
        const fs = require("fs");
        this.staticDir = path.join(process.cwd(), "static");
        if (!fs.existsSync(this.staticDir)) {
            fs.mkdirSync(this.staticDir, { recursive: true });
        }
    }

    async uploadLocal(file, userName, docType) {
        const path = require("path");
        const sanitizedName = userName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const extension = path.extname(file.originalname) || ".pdf";
        const fileName = `${sanitizedName}_${docType}_${Date.now()}${extension}`;
        
        return await this.saveFile(file.buffer, fileName);
    }

    async saveFile(buffer, fileName) {
        const path = require("path");
        const fs = require("fs");
        const uploadPath = path.join(this.staticDir, fileName);
        
        try {
            fs.writeFileSync(uploadPath, buffer);
            return {
                url: `/static/${fileName}`,
                fileName
            };
        } catch (error) {
            throw new Error("Failed to save file");
        }
    }

    async uploadS3(file, userName, docType) {
        throw new Error("S3 Upload not implemented yet");
    }
}

module.exports = Module("fileService", {
    service: FileService,
});
