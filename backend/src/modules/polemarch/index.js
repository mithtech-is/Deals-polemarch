const { model, Module, MedusaService } = require("@medusajs/framework/utils");
const fs = require("fs");
const path = require("path");

// Models
const KycRequest = model.define("kyc_request", {
  id: model.id().primaryKey(),
  customer_id: model.text().index(),
  pan_number: model.text(),
  aadhaar_number: model.text(),
  dp_name: model.text(),
  demat_number: model.text(),
  pan_file_url: model.text(),
  cmr_file_url: model.text(),
  status: model.enum(["pending", "approved", "rejected", "on_hold"]).default("pending"),
});

const Notification = model.define("user_notifications", {
  id: model.id().primaryKey(),
  customer_id: model.text().index(),
  title: model.text(),
  message: model.text(),
  type: model.text(),
  is_read: model.boolean().default(false),
});

// Services
class FileService {
    constructor() {
        this.staticDir = path.join(process.cwd(), "static");
        if (!fs.existsSync(this.staticDir)) {
            fs.mkdirSync(this.staticDir, { recursive: true });
        }
    }
    async uploadLocal(file) {
        const sanitizedName = path.basename(file.originalname || "upload.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileName = `${Date.now()}_${sanitizedName}`;
        return await this.saveFile(file.buffer, fileName);
    }
    async saveFile(buffer, fileName) {
        const uploadPath = path.join(this.staticDir, fileName);
        try {
            fs.writeFileSync(uploadPath, buffer);
            return { url: `/static/${fileName}`, fileName };
        } catch (error) {
            throw new Error("Failed to save file");
        }
    }
    async deleteLocal(url) {
        if (!url || typeof url !== "string") return { success: false };
        // Strict prefix check
        if (!url.startsWith("/static/")) return { success: false };
        // Extract basename, reject any path traversal
        const fileName = path.basename(url);
        if (!fileName || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
            return { success: false };
        }
        const filePath = path.join(this.staticDir, fileName);
        // Ensure resolved path stays inside staticDir
        const resolved = path.resolve(filePath);
        if (!resolved.startsWith(path.resolve(this.staticDir) + path.sep)) {
            return { success: false };
        }
        try {
            if (fs.existsSync(resolved)) {
                fs.unlinkSync(resolved);
            }
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }
}

class PolemarchModuleService extends MedusaService({
    KycRequest,
    Notification
}) {
    constructor(container) {
        super(container);
        this.fileService = new FileService();
    }
    
    // File Service methods proxy
    async uploadLocal(file) {
        return await this.fileService.uploadLocal(file);
    }
    async deleteFile(url) {
        return await this.fileService.deleteLocal(url);
    }
}

module.exports = Module("polemarch", {
    service: PolemarchModuleService,
});
