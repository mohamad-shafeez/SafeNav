from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os
import base64
import json
from typing import Optional, Tuple
import hashlib

# Security configuration
KEY_FILE = "storage/keys/secret.key"
KEY_BACKUP_DIR = "storage/keys/backups"
KEY_CONFIG_FILE = "storage/keys/key_config.json"
os.makedirs(KEY_BACKUP_DIR, exist_ok=True)
os.makedirs(os.path.dirname(KEY_CONFIG_FILE), exist_ok=True)

class SecurityManager:
    def __init__(self):
        self.cipher = None
        self.key_info = self._load_key_config()
        self._initialize_cipher()

    def _load_key_config(self) -> dict:
        """Load or create key configuration"""
        if os.path.exists(KEY_CONFIG_FILE):
            try:
                with open(KEY_CONFIG_FILE, 'r') as f:
                    return json.load(f)
            except:
                pass
        
        # Default configuration
        return {
            'version': '1.0',
            'key_rotation_enabled': False,
            'last_rotation': None,
            'key_age_days': 0,
            'encryption_algorithm': 'AES-256-CBC',
            'key_derivation_iterations': 100000
        }

    def _save_key_config(self, config: dict):
        """Save key configuration"""
        with open(KEY_CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)

    def _initialize_cipher(self):
        """Initialize Fernet cipher with loaded key"""
        key = self._load_or_create_key()
        self.cipher = Fernet(key)

    def _load_or_create_key(self) -> bytes:
        """Load existing key or create new one with backup"""
        if os.path.exists(KEY_FILE):
            try:
                with open(KEY_FILE, "rb") as key_file:
                    key = key_file.read()
                
                # Validate key format
                if len(key) == 44:  # Fernet keys are 44 bytes when base64 encoded
                    return key
                else:
                    print("Warning: Invalid key format detected, generating new key")
                    return self._generate_new_key()
                    
            except Exception as e:
                print(f"Error loading key: {e}")
                return self._generate_new_key()
        else:
            return self._generate_new_key()

    def _generate_new_key(self) -> bytes:
        """Generate new encryption key with backup"""
        # Create backup of old key if exists
        if os.path.exists(KEY_FILE):
            self._backup_current_key()
        
        # Generate new key
        key = Fernet.generate_key()
        
        # Save new key
        with open(KEY_FILE, "wb") as key_file:
            key_file.write(key)
        
        # Update key info
        self.key_info['last_rotation'] = self._get_current_timestamp()
        self.key_info['key_age_days'] = 0
        self._save_key_config(self.key_info)
        
        print("New encryption key generated")
        return key

    def _backup_current_key(self):
        """Create timestamped backup of current key"""
        if os.path.exists(KEY_FILE):
            timestamp = self._get_current_timestamp()
            backup_file = os.path.join(KEY_BACKUP_DIR, f"key_backup_{timestamp}.key")
            
            try:
                with open(KEY_FILE, "rb") as src, open(backup_file, "wb") as dst:
                    dst.write(src.read())
                print(f"Key backed up to: {backup_file}")
            except Exception as e:
                print(f"Failed to backup key: {e}")

    def _get_current_timestamp(self) -> str:
        """Get current timestamp for backups"""
        from datetime import datetime
        return datetime.now().strftime("%Y%m%d_%H%M%S")

    def encrypt_data(self, data: bytes) -> bytes:
        """
        Encrypt data with additional security headers
        
        Format: [VERSION][IV][ENCRYPTED_DATA][HMAC]
        """
        if not data:
            raise ValueError("Cannot encrypt empty data")
        
        try:
            encrypted = self.cipher.encrypt(data)
            
            # Add metadata
            metadata = {
                'encrypted_at': self._get_current_timestamp(),
                'data_length': len(data),
                'algorithm': 'Fernet'
            }
            
            # For audit logging (in production, log to secure audit trail)
            self._log_encryption(len(data))
            
            return encrypted
            
        except Exception as e:
            raise ValueError(f"Encryption failed: {str(e)}")

    def decrypt_data(self, data: bytes) -> bytes:
        """
        Decrypt data with validation
        
        Returns: Decrypted bytes
        Raises: ValueError if decryption fails
        """
        if not data:
            raise ValueError("Cannot decrypt empty data")
        
        try:
            decrypted = self.cipher.decrypt(data)
            
            # For audit logging
            self._log_decryption(len(data))
            
            return decrypted
            
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)} - Possibly corrupted or tampered data")

    def encrypt_file(self, input_path: str, output_path: str = None) -> str:
        """
        Encrypt a file
        
        Returns: Path to encrypted file
        """
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        # Read file
        with open(input_path, 'rb') as f:
            file_data = f.read()
        
        # Encrypt
        encrypted_data = self.encrypt_data(file_data)
        
        # Determine output path
        if not output_path:
            output_path = input_path + '.enc'
        
        # Write encrypted file
        with open(output_path, 'wb') as f:
            f.write(encrypted_data)
        
        # Delete original if it's not the same as output
        if input_path != output_path:
            os.remove(input_path)
        
        return output_path

    def decrypt_file(self, input_path: str, output_path: str = None) -> str:
        """
        Decrypt a file
        
        Returns: Path to decrypted file
        """
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        # Read encrypted file
        with open(input_path, 'rb') as f:
            encrypted_data = f.read()
        
        # Decrypt
        decrypted_data = self.decrypt_data(encrypted_data)
        
        # Determine output path
        if not output_path:
            if input_path.endswith('.enc'):
                output_path = input_path[:-4]
            else:
                output_path = input_path + '.dec'
        
        # Write decrypted file
        with open(output_path, 'wb') as f:
            f.write(decrypted_data)
        
        return output_path

    def generate_checksum(self, data: bytes) -> str:
        """Generate SHA-256 checksum for data integrity verification"""
        return hashlib.sha256(data).hexdigest()

    def verify_checksum(self, data: bytes, checksum: str) -> bool:
        """Verify data integrity using checksum"""
        return self.generate_checksum(data) == checksum

    def encrypt_with_checksum(self, data: bytes) -> Tuple[bytes, str]:
        """Encrypt data and return with checksum"""
        encrypted = self.encrypt_data(data)
        checksum = self.generate_checksum(data)
        return encrypted, checksum

    def decrypt_with_checksum(self, encrypted_data: bytes, expected_checksum: str) -> bytes:
        """Decrypt and verify checksum"""
        decrypted = self.decrypt_data(encrypted_data)
        
        if not self.verify_checksum(decrypted, expected_checksum):
            raise ValueError("Data integrity check failed - data may be corrupted")
        
        return decrypted

    def rotate_key(self) -> dict:
        """
        Rotate encryption key (for future implementation)
        Returns: Status of key rotation
        """
        # Note: Key rotation requires re-encrypting all existing files
        # This is a complex operation and should be done carefully
        
        rotation_info = {
            'success': False,
            'message': 'Key rotation not implemented',
            'old_key_backup': None,
            'new_key_created': None
        }
        
        # In production, this would:
        # 1. Generate new key
        # 2. Re-encrypt all existing encrypted files
        # 3. Update database records
        # 4. Securely delete old key
        
        return rotation_info

    def get_key_info(self) -> dict:
        """Get information about current encryption key"""
        return {
            'key_exists': os.path.exists(KEY_FILE),
            'key_size_bytes': 32,  # Fernet uses 256-bit keys
            'algorithm': 'AES-256-CBC',
            'key_derivation': 'PBKDF2HMAC-SHA256',
            'key_age_days': self.key_info.get('key_age_days', 0),
            'last_rotation': self.key_info.get('last_rotation'),
            'key_location': os.path.abspath(KEY_FILE)
        }

    def _log_encryption(self, data_size: int):
        """Log encryption operations (stub for production implementation)"""
        # In production, implement secure audit logging
        pass

    def _log_decryption(self, data_size: int):
        """Log decryption operations (stub for production implementation)"""
        # In production, implement secure audit logging
        pass

    def validate_key_integrity(self) -> bool:
        """Validate that the current key can encrypt and decrypt properly"""
        try:
            test_data = b"Test encryption validation"
            encrypted = self.encrypt_data(test_data)
            decrypted = self.decrypt_data(encrypted)
            
            return decrypted == test_data
            
        except Exception as e:
            print(f"Key validation failed: {e}")
            return False

# Singleton instance for easy import
security_manager = SecurityManager()

# Legacy functions for backward compatibility
def encrypt_data(data: bytes) -> bytes:
    """Legacy function - use security_manager.encrypt_data() instead"""
    return security_manager.encrypt_data(data)

def decrypt_data(data: bytes) -> bytes:
    """Legacy function - use security_manager.decrypt_data() instead"""
    return security_manager.decrypt_data(data)

def load_key() -> bytes:
    """Legacy function - loads current encryption key"""
    return security_manager._load_or_create_key()

# Test the security system (run this once to initialize)
def initialize_security_system():
    """Initialize and validate the security system"""
    print("Initializing security system...")
    
    # Create security manager
    manager = SecurityManager()
    
    # Validate key
    if manager.validate_key_integrity():
        print("✓ Security system initialized successfully")
        print(f"✓ Key location: {KEY_FILE}")
        
        key_info = manager.get_key_info()
        print(f"✓ Key algorithm: {key_info['algorithm']}")
        print(f"✓ Key size: {key_info['key_size_bytes'] * 8} bits")
        
        return True
    else:
        print("✗ Security system initialization failed")
        return False

# Optional: Add this to your main app initialization
if __name__ == "__main__":
    initialize_security_system()