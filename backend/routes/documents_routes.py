import asyncio
import io
from datetime import date

from flask import Blueprint, jsonify, request, send_file

from routes.documents import DocumentStatus, DocumentType, EncryptionLevel
from routes.dashboard import track_system_event
from services.documents_engine import DocumentVault
from utils.firebase_auth import firebase_required

documents_bp = Blueprint("documents", __name__)
vault = DocumentVault()


def current_uid():
    return request.user.get("uid") or request.user.get("sub")


def owned_document(doc_id):
    doc = vault.get_document(doc_id)
    if not doc or doc.owner_id != current_uid():
        return None
    return doc


@documents_bp.route("/upload", methods=["POST"])
@firebase_required
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        document_type = DocumentType(request.form.get("document_type", "OTHER"))
        encryption_level = EncryptionLevel(
            request.form.get("encryption_level", "standard")
        )
        expiry_date_str = request.form.get("expiry_date")
        expiry = date.fromisoformat(expiry_date_str) if expiry_date_str else None
        tags = [
            tag.strip()
            for tag in request.form.get("tags", "").split(",")
            if tag.strip()
        ]

        document = asyncio.run(
            vault.upload_document(
                file_data=file.read(),
                original_filename=file.filename,
                document_type=document_type,
                tags=tags,
                expiry_date=expiry,
                encryption_level=encryption_level,
                notes=request.form.get("notes", ""),
                owner_id=current_uid(),
            )
        )
        track_system_event("gemini")
        return jsonify(document.to_dict()), 201
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception as error:
        import logging

        logging.exception("Upload failed")
        return jsonify({"error": "Upload failed"}), 500


@documents_bp.route("/list", methods=["GET"])
@documents_bp.route("/", methods=["GET"])
@firebase_required
def list_documents():
    filters = {"owner_id": current_uid()}
    for field in ("category", "status", "search"):
        value = request.args.get(field)
        if value:
            filters[field] = value

    documents = vault.get_all_documents(filters)
    return jsonify([doc.to_dict() for doc in documents]), 200


@documents_bp.route("/download/<doc_id>", methods=["GET"])
@documents_bp.route("/<doc_id>/download", methods=["GET"])
@firebase_required
def download_document(doc_id):
    doc = owned_document(doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    decrypt = request.args.get("decrypt", "false").lower() == "true"
    try:
        file_data = vault.get_document_file(doc_id, decrypt=decrypt)
        if not file_data:
            return jsonify({"error": "File data missing or corrupted on disk"}), 404

        filename = doc.original_filename
        if decrypt and doc.is_encrypted:
            filename = filename.replace(".enc", "")

        return send_file(
            io.BytesIO(file_data),
            as_attachment=True,
            download_name=filename,
            mimetype="application/octet-stream",
        )
    except Exception:
        return jsonify({"error": "Failed to download or decrypt document"}), 500


@documents_bp.route("/delete/<doc_id>", methods=["DELETE"])
@documents_bp.route("/<doc_id>", methods=["DELETE"])
@firebase_required
def delete_document(doc_id):
    doc = owned_document(doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    if not vault.delete_document(doc_id):
        return jsonify({"error": "Document could not be deleted"}), 500
    return jsonify({"message": "Document securely deleted"}), 200


@documents_bp.route("/update/<doc_id>", methods=["PATCH"])
@firebase_required
def update_document(doc_id):
    doc = owned_document(doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    data = request.get_json(silent=True) or {}
    updates = {}
    if isinstance(data.get("notes"), str):
        updates["notes"] = data["notes"][:2000]
    if "status" in data:
        try:
            updates["status"] = DocumentStatus(data["status"])
        except ValueError:
            return jsonify({"error": "Invalid status value"}), 400

    try:
        updated_doc = vault.update_document(doc_id, updates)
        return jsonify(updated_doc.to_dict()), 200
    except Exception:
        return jsonify({"error": "Update failed"}), 500


@documents_bp.route("/statistics", methods=["GET"])
@firebase_required
def get_statistics():
    return jsonify(vault.get_statistics(current_uid())), 200


@documents_bp.route("/export/summary", methods=["GET"])
@firebase_required
def export_summary():
    return jsonify(vault.export_vault_summary(current_uid())), 200
