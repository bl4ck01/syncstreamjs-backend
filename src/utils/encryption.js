import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const keyLength = 32;
const saltLength = 64;
const tagLength = 16;
const ivLength = 16;

// Get encryption key from environment
const getKey = () => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== keyLength) {
        throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
    }
    return Buffer.from(key);
};

// Encrypt text
export const encrypt = (text) => {
    try {
        const key = getKey();
        const iv = crypto.randomBytes(ivLength);
        const salt = crypto.randomBytes(saltLength);

        const cipher = crypto.createCipheriv(algorithm, key, iv);

        const encrypted = Buffer.concat([
            cipher.update(text, 'utf8'),
            cipher.final()
        ]);

        const tag = cipher.getAuthTag();

        // Combine salt, iv, tag, and encrypted data
        const combined = Buffer.concat([salt, iv, tag, encrypted]);

        return combined.toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

// Decrypt text
export const decrypt = (encryptedText) => {
    try {
        const key = getKey();
        const combined = Buffer.from(encryptedText, 'base64');

        // Extract components
        const salt = combined.slice(0, saltLength);
        const iv = combined.slice(saltLength, saltLength + ivLength);
        const tag = combined.slice(saltLength + ivLength, saltLength + ivLength + tagLength);
        const encrypted = combined.slice(saltLength + ivLength + tagLength);

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(tag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        return decrypted.toString('utf8');
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
};
