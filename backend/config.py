# backend/config.py
import os

# Base backend folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Vault storage root
VAULT_STORAGE = os.path.join(BASE_DIR, "vault_storage")

# Subfolders inside vault_storage
RAW_FOLDER = os.path.join(VAULT_STORAGE, "raw_files")          # original files
ENCRYPTED_FOLDER = os.path.join(VAULT_STORAGE, "encrypted_files")  # encrypted copies
KEYS_FOLDER = os.path.join(VAULT_STORAGE, "keys")             # encryption keys
BACKUPS_FOLDER = os.path.join(VAULT_STORAGE, "backups")       # backup files
TEMP_FOLDER = os.path.join(VAULT_STORAGE, "temp_uploads")     # temporary uploads

# Ensure all folders exist
for folder in [VAULT_STORAGE, RAW_FOLDER, ENCRYPTED_FOLDER, KEYS_FOLDER, BACKUPS_FOLDER, TEMP_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# Allowed file types for upload
ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}

def allowed_file(filename: str) -> bool:
    """Check if the file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Flask configuration
SECRET_KEY = "dev-secret-change-later"  # change this in production
