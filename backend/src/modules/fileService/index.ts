import { Module } from "@medusajs/framework/utils"
import fs from "fs"
import path from "path"

class FileService {
    protected staticDir: string;

    constructor() {
        this.staticDir = path.join(process.cwd(), "static");
        if (!fs.existsSync(this.staticDir)) {
            fs.mkdirSync(this.staticDir, { recursive: true });
        }
    }

    async uploadLocal(file: any, userName: string, docType: string) {
        const sanitizedName = userName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const extension = path.extname(file.originalname) || ".pdf";
        const fileName = `${sanitizedName}_${docType}_${Date.now()}${extension}`;
        
        return await this.saveFile(file.buffer, fileName);
    }

    async saveFile(buffer: Buffer, fileName: string) {
        const uploadPath = path.join(this.staticDir, fileName);
        
        try {
            fs.writeFileSync(uploadPath, buffer);
            return {
                url: `/static/${fileName}`,
                fileName
            };
        } catch (error: any) {
            throw new Error("Failed to save file");
        }
    }

    async uploadS3(file: any, userName: string, docType: string) {
        throw new Error("S3 Upload not implemented yet");
    }
}

export default Module("fileService", {
    service: FileService,
})
