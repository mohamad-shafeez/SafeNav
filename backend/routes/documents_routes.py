# backend/routes/documents_routes.py

import os
from flask import Blueprint, request, send_file, jsonify
from werkzeug.utils import secure_filename
from services.documents_engine import TravelDocument, DocumentType
from config import RAW_FOLDER, TEMP_FOLDER, allowed_file

documents_bp = Blueprint("documents", __name__)

# In-memory storage for documents (replace with DB later)
documents_storage = []

# ------------------------------
# Upload a file
# ------------------------------
@documents_bp.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return {"error": "No file part"}, 400

    file = request.files["file"]
    if file.filename == "":
        return {"error": "No selected file"}, 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        temp_path = os.path.join(TEMP_FOLDER, filename)
        file.save(temp_path)

        # Move to raw folder
        raw_path = os.path.join(RAW_FOLDER, filename)
        os.rename(temp_path, raw_path)

        # Create TravelDocument object
        doc = TravelDocument(
            filename=filename,
            original_filename=file.filename,
            file_size=os.path.getsize(raw_path),
            file_type=filename.rsplit(".", 1)[1].lower(),
            document_type=DocumentType.OTHER
        )
        documents_storage.append(doc)

        return doc.to_dict(), 201
    else:
        return {"error": "File type not allowed"}, 400

# ------------------------------
# List all documents
# ------------------------------
@documents_bp.route("/list", methods=["GET"])
def list_documents():
    return jsonify([doc.to_dict() for doc in documents_storage])

# ------------------------------
# Download a document
# ------------------------------
@documents_bp.route("/download/<doc_id>", methods=["GET"])
def download_document(doc_id):
    doc = next((d for d in documents_storage if d.id == doc_id), None)
    if not doc:
        return {"error": "Document not found"}, 404

    file_path = os.path.join(RAW_FOLDER, doc.filename)
    if not os.path.exists(file_path):
        return {"error": "File not found on server"}, 404

    return send_file(file_path, as_attachment=True, download_name=doc.original_filename)

# ------------------------------
# Delete a document
# ------------------------------
@documents_bp.route("/delete/<doc_id>", methods=["DELETE"])
def delete_document(doc_id):
    global documents_storage
    doc = next((d for d in documents_storage if d.id == doc_id), None)
    if not doc:
        return {"error": "Document not found"}, 404

    file_path = os.path.join(RAW_FOLDER, doc.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    # Remove from in-memory storage
    documents_storage = [d for d in documents_storage if d.id != doc_id]

    return {"message": f"Document {doc.filename} deleted successfully."}, 200

# ------------------------------
# Update document notes or status
# ------------------------------
@documents_bp.route("/update/<doc_id>", methods=["PATCH"])
def update_document(doc_id):
    doc = next((d for d in documents_storage if d.id == doc_id), None)
    if not doc:
        return {"error": "Document not found"}, 404

    data = request.get_json()
    if not data:
        return {"error": "No data provided"}, 400

    notes = data.get("notes")
    status = data.get("status")

    if notes is not None:
        doc.notes = notes
    if status is not None:
        try:
            from services.documents_engine import DocumentStatus
            doc.status = DocumentStatus(status)
        except ValueError:
            return {"error": "Invalid status value"}, 400

    return doc.to_dict(), 200
