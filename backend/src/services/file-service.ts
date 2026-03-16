import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";

export default class FileService {
    protected staticDir: string;

    constructor(container: any) {
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
            logger.info(`File saved successfully: ${fileName}`);
            return {
                url: `/static/${fileName}`,
                fileName
            };
        } catch (error: any) {
            logger.error(`Failed to save file: ${fileName}`, { error: error.message });
            throw new Error("Failed to save file");
        }
    }

    async uploadS3(file: any, userName: string, docType: string) {
        logger.info("S3 Upload requested - Implementation pending");
        throw new Error("S3 Upload not implemented yet");
    }
}
