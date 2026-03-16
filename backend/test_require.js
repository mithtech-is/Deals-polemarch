const path = require('path');
try {
    const kycPath = path.resolve(__dirname, "dist/modules/kyc/index.js");
    console.log("Attempting to require kyc from:", kycPath);
    const kyc = require(kycPath);
    console.log("Successfully required kyc module");
} catch (e) {
    console.error("Failed to require kyc module:", e.message);
}

try {
    const fileServicePath = path.resolve(__dirname, "dist/modules/file-service/index.js");
    console.log("Attempting to require file_service from:", fileServicePath);
    const fileService = require(fileServicePath);
    console.log("Successfully required file_service module");
} catch (e) {
    console.error("Failed to require file_service module:", e.message);
}
