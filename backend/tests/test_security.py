import os

import pytest
from cryptography.fernet import Fernet
from flask import Flask, jsonify

from services.documents_engine import (
    DocumentEncryptionError,
    EncryptionEngine,
    EncryptionLevel,
    TravelDocument,
)
from utils.firebase_auth import firebase_required


def test_fernet_roundtrip_and_legacy_levels_are_rejected():
    engine = EncryptionEngine(master_key=Fernet.generate_key())
    document = TravelDocument(id="doc-1", encryption_level=EncryptionLevel.STANDARD)

    encrypted, key_id = engine.encrypt_document(document, b"passport bytes")
    assert encrypted != b"passport bytes"
    assert engine.decrypt_document(encrypted, key_id) == b"passport bytes"

    document.encryption_level = EncryptionLevel.MILITARY
    with pytest.raises(DocumentEncryptionError):
        engine.encrypt_document(document, b"passport bytes")


def test_document_vault_statistics_are_scoped_to_owner(tmp_path, monkeypatch):
    monkeypatch.setenv("VAULT_KEY_FILE", str(tmp_path / "keys" / "master.key"))
    from services.documents_engine import DocumentVault

    vault = DocumentVault(storage_path=str(tmp_path / "vault"))
    alice = TravelDocument(id="alice-doc", owner_id="alice", is_encrypted=True)
    bob = TravelDocument(id="bob-doc", owner_id="bob", is_encrypted=True)
    vault.documents = {alice.id: alice, bob.id: bob}

    assert vault.get_statistics("alice")["total_documents"] == 1
    assert vault.get_statistics("bob")["total_documents"] == 1
    assert vault.get_statistics("nobody")["total_documents"] == 0

    summary = vault.export_vault_summary("alice")
    assert [document["id"] for document in summary["documents"]] == ["alice-doc"]


def test_firebase_decorator_fails_closed_without_a_token(monkeypatch):
    app = Flask(__name__)

    @app.route("/protected")
    @firebase_required
    def protected():
        return jsonify({"ok": True})

    client = app.test_client()
    assert client.get("/protected").status_code == 401

    monkeypatch.setattr(
        "utils.firebase_auth.verify_firebase_token",
        lambda token: {"uid": "firebase-user-1"},
    )
    response = client.get(
        "/protected", headers={"Authorization": "Bearer valid-token"}
    )
    assert response.status_code == 200
    assert response.get_json() == {"ok": True}
