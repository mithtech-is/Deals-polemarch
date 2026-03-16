export const maskSensitiveData = (data: any) => {
    if (!data) return data;
    
    const shaded = { ...data };
    
    if (shaded.metadata) {
        if (shaded.metadata.pan_number) {
            const pan = shaded.metadata.pan_number;
            shaded.metadata.pan_number = pan.substring(0, 5) + "****" + pan.substring(pan.length - 1);
        }
        
        if (shaded.metadata.aadhaar_number) {
            const aadhaar = shaded.metadata.aadhaar_number;
            shaded.metadata.aadhaar_number = "********" + aadhaar.substring(aadhaar.length - 4);
        }
    }
    
    return shaded;
};
