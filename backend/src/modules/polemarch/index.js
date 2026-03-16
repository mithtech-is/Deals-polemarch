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
    async uploadLocal(file, userName, docType) {
        const sanitizedName = userName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const extension = path.extname(file.originalname) || ".pdf";
        const fileName = `${sanitizedName}_${docType}_${Date.now()}${extension}`;
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
    async uploadLocal(file, userName, docType) {
        return await this.fileService.uploadLocal(file, userName, docType);
    }
}

module.exports = Module("polemarch", {
    service: PolemarchModuleService,
});
