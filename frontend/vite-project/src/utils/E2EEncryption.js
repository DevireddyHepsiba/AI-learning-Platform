/**
 * E2EE (End-to-End Encryption) Utilities
 * Using TweetNaCl.js for secure encryption
 * 
 * Flow:
 * 1. User generates key pair on first login
 * 2. Public key shared with other users
 * 3. Messages encrypted with recipient's public key
 * 4. Only recipient can decrypt with private key
 * 5. Server stores encrypted data (cannot read)
 */

// Note: In production, use: npm install tweetnacl tweetnacl-util
// For now, using Web Crypto API which is built-in

export class E2EEncryption {
  /**
   * Generate key pair for user
   */
  static async generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true, // extractable
      ["encrypt", "decrypt"]
    );

    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

    return {
      publicKey: JSON.stringify(publicKeyJwk),
      privateKey: JSON.stringify(privateKeyJwk),
      publicKeyObj: keyPair.publicKey,
      privateKeyObj: keyPair.privateKey,
    };
  }

  /**
   * Encrypt data with public key
   */
  static async encryptWithPublicKey(data, publicKeyJwk) {
    try {
      const publicKey = await window.crypto.subtle.importKey(
        "jwk",
        typeof publicKeyJwk === "string" ? JSON.parse(publicKeyJwk) : publicKeyJwk,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"]
      );

      const encoded = new TextEncoder().encode(JSON.stringify(data));
      const encrypted = await window.crypto.subtle.encrypt("RSA-OAEP", publicKey, encoded);

      return {
        encrypted: Array.from(new Uint8Array(encrypted)),
        algorithm: "RSA-OAEP",
      };
    } catch (error) {
      console.error("❌ Encryption failed:", error);
      throw error;
    }
  }

  /**
   * Decrypt data with private key
   */
  static async decryptWithPrivateKey(encryptedData, privateKeyJwk) {
    try {
      const privateKey = await window.crypto.subtle.importKey(
        "jwk",
        typeof privateKeyJwk === "string" ? JSON.parse(privateKeyJwk) : privateKeyJwk,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["decrypt"]
      );

      const encryptedBytes = new Uint8Array(encryptedData.encrypted);
      const decrypted = await window.crypto.subtle.decrypt("RSA-OAEP", privateKey, encryptedBytes);

      const decoded = new TextDecoder().decode(decrypted);
      return JSON.parse(decoded);
    } catch (error) {
      console.error("❌ Decryption failed:", error);
      throw error;
    }
  }

  /**
   * Sign data with private key
   */
  static async signData(data, privateKeyJwk) {
    try {
      const privateKey = await window.crypto.subtle.importKey(
        "jwk",
        typeof privateKeyJwk === "string" ? JSON.parse(privateKeyJwk) : privateKeyJwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const encoded = new TextEncoder().encode(JSON.stringify(data));
      const signature = await window.crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, encoded);

      return Array.from(new Uint8Array(signature));
    } catch (error) {
      console.error("❌ Signing failed:", error);
      throw error;
    }
  }

  /**
   * Verify signature with public key
   */
  static async verifySignature(data, signature, publicKeyJwk) {
    try {
      const publicKey = await window.crypto.subtle.importKey(
        "jwk",
        typeof publicKeyJwk === "string" ? JSON.parse(publicKeyJwk) : publicKeyJwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
      );

      const encoded = new TextEncoder().encode(JSON.stringify(data));
      const signatureBytes = new Uint8Array(signature);

      const isValid = await window.crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signatureBytes, encoded);
      return isValid;
    } catch (error) {
      console.error("❌ Verification failed:", error);
      return false;
    }
  }

  /**
   * Hash data (for integrity checking)
   */
  static async hashData(data) {
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Store private key securely in sessionStorage
   */
  static storePrivateKey(privateKey, userId) {
    try {
      // Only store in sessionStorage (cleared on browser close)
      sessionStorage.setItem(`private-key-${userId}`, privateKey);
      return true;
    } catch (error) {
      console.error("❌ Failed to store private key:", error);
      return false;
    }
  }

  /**
   * Retrieve private key from sessionStorage
   */
  static getPrivateKey(userId) {
    try {
      return sessionStorage.getItem(`private-key-${userId}`);
    } catch (error) {
      console.error("❌ Failed to retrieve private key:", error);
      return null;
    }
  }

  /**
   * Clear private key from sessionStorage
   */
  static clearPrivateKey(userId) {
    try {
      sessionStorage.removeItem(`private-key-${userId}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to clear private key:", error);
      return false;
    }
  }
}

export default E2EEncryption;
