# backend/routes/documents_routes.py

import os
import io
import asyncio
from datetime import date
from flask import Blueprint, request, send_file, jsonify

# Import the real Data Models we verified
from routes.documents import DocumentType, EncryptionLevel, DocumentStatus

# Import the real AI, Encryption, and Storage Engine
from services.documents_engine import DocumentVault

documents_bp = Blueprint("documents", __name__)

# Initialize the REAL Document Vault
# This completely replaces the fake "documents_storage = []" list.
# It automatically loads your metadata.json and handles permanent storage.
vault = DocumentVault()

# ------------------------------
# Upload a file (Real AI + Encryption)
# ------------------------------
@documents_bp.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        # Extract form data sent by frontend
        document_type = request.form.get("document_type", "OTHER")
        tags_str = request.form.get("tags", "")
        expiry_date_str = request.form.get("expiry_date")
        encryption_level = request.form.get("encryption_level", "standard")
        notes = request.form.get("notes", "")

        # Process form data
        file_bytes = file.read()
        tags_list = [tag.strip() for tag in tags_str.split(",") if tag.strip()]
        expiry = date.fromisoformat(expiry_date_str) if expiry_date_str else None

        # Call the real vault engine (wrapped in asyncio.run because Flask is synchronous and Gemini AI is async)
        document = asyncio.run(vault.upload_document(
            file_data=file_bytes,
            original_filename=file.filename,
            document_type=DocumentType(document_type),
            tags=tags_list,
            expiry_date=expiry,
            encryption_level=EncryptionLevel(encryption_level),
            notes=notes
        ))

        return jsonify(document.to_dict()), 201

    except Exception as e:
        import logging
        logging.error(f"Upload failed: {str(e)}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

# ------------------------------
# List all documents (Real Database Query)
# ------------------------------
@documents_bp.route("/list", methods=["GET"])
@documents_bp.route("/", methods=["GET"]) # Added alias to match frontend expectations
def list_documents():
    # Extract optional filters from query parameters
    category = request.args.get("category")
    status = request.args.get("status")
    search = request.args.get("search")
    
    filters = {}
    if category: filters["category"] = category
    if status: filters["status"] = status
    if search: filters["search"] = search
    
    documents = vault.get_all_documents(filters)
    return jsonify([doc.to_dict() for doc in documents]), 200

# ------------------------------
# Download a document (Real Decryption)
# ------------------------------
@documents_bp.route("/download/<doc_id>", methods=["GET"])
@documents_bp.route("/<doc_id>/download", methods=["GET"]) # Alias for frontend
def download_document(doc_id):
    doc = vault.get_document(doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    # Check if frontend requested on-the-fly decryption
    decrypt = request.args.get("decrypt", "false").lower() == "true"

    try:
        file_data = vault.get_document_file(doc_id, decrypt=decrypt)
        if not file_data:
            return jsonify({"error": "File data missing or corrupted on disk"}), 404

        filename = doc.original_filename
        if decrypt and doc.is_encrypted:
            filename = filename.replace('.enc', '')

        # Use io.BytesIO to send the raw bytes directly from memory securely
        return send_file(
            io.BytesIO(file_data),
            as_attachment=True,
            download_name=filename,
            mimetype="application/octet-stream"
        )
    except Exception as e:
        return jsonify({"error": f"Failed to download/decrypt: {str(e)}"}), 500

# ------------------------------
# Delete a document (Real Secure Wipe)
# ------------------------------
@documents_bp.route("/delete/<doc_id>", methods=["DELETE"])
@documents_bp.route("/<doc_id>", methods=["DELETE"]) # Alias for frontend
def delete_document(doc_id):
    success = vault.delete_document(doc_id)
    if not success:
        return jsonify({"error": "Document not found or already deleted"}), 404

    return jsonify({"message": "Document securely deleted"}), 200

# ------------------------------
# Update document metadata
# ------------------------------
@documents_bp.route("/update/<doc_id>", methods=["PATCH"])
def update_document(doc_id):
    doc = vault.get_document(doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    updates = {}
    if "notes" in data:
        updates["notes"] = data["notes"]
    if "status" in data:
        try:
            updates["status"] = DocumentStatus(data["status"])
        except ValueError:
            return jsonify({"error": "Invalid status value"}), 400

    try:
        updated_doc = vault.update_document(doc_id, updates)
        return jsonify(updated_doc.to_dict()), 200
    except Exception as e:
        return jsonify({"error": f"Update failed: {str(e)}"}), 500

# ------------------------------
# Get Vault Statistics
# ------------------------------
@documents_bp.route("/statistics", methods=["GET"])
def get_statistics():
    return jsonify(vault.get_statistics()), 200

# ------------------------------
# Export Vault Summary
# ------------------------------
@documents_bp.route("/export/summary", methods=["GET"])
def export_summary():
    return jsonify(vault.export_vault_summary()), 200