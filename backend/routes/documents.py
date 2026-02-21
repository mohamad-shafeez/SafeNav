
from datetime import datetime, date
from enum import Enum, auto
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from uuid import uuid4
import json

class DocumentType(Enum):
    """Enumeration of supported document types."""
    PASSPORT = "PASSPORT"
    AADHAR = "AADHAR"
    PAN = "PAN"
    DRIVING_LICENSE = "DRIVING_LICENSE"
    VOTER_ID = "VOTER_ID"
    NATIONAL_ID = "NATIONAL_ID"
    VISA = "VISA"
    TRAVEL_TICKET = "TRAVEL_TICKET"
    HOTEL_BOOKING = "HOTEL_BOOKING"
    TOUR_ITINERARY = "TOUR_ITINERARY"
    TRAVEL_INSURANCE = "TRAVEL_INSURANCE"
    VACCINATION_CERT = "VACCINATION_CERT"
    MEDICAL_REPORTS = "MEDICAL_REPORTS"
    HEALTH_INSURANCE = "HEALTH_INSURANCE"
    FOREX_RECEIPT = "FOREX_RECEIPT"
    CREDIT_CARD = "CREDIT_CARD"
    TRAVELERS_CHEQUE = "TRAVELERS_CHEQUE"
    BANK_STATEMENT = "BANK_STATEMENT"
    EMERGENCY_CONTACTS = "EMERGENCY_CONTACTS"
    TRAVEL_GUIDE = "TRAVEL_GUIDE"
    MAPS = "MAPS"
    OTHER = "OTHER"

class EncryptionLevel(Enum):
    """Enumeration of encryption levels."""
    STANDARD = "standard"  # AES-256
    MILITARY = "military"  # Military Grade
    BIOMETRIC = "biometric"  # Biometric + Encryption
    QUANTUM = "quantum"  # Quantum-Resistant

class DocumentStatus(Enum):
    """Enumeration of document statuses."""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    ENCRYPTED = "encrypted"
    VALIDATED = "validated"
    EXPIRING = "expiring"
    EXPIRED = "expired"
    ARCHIVED = "archived"
    DECRYPTED = "decrypted"

class RiskLevel(Enum):
    """Enumeration of risk levels."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

@dataclass
class DocumentMetadata:
    """Metadata for a document including AI analysis results."""
    confidence_score: float = 0.0
    risk_level: RiskLevel = RiskLevel.LOW
    validation_score: int = 0
    integrity_score: float = 0.0
    extraction_accuracy: float = 0.0
    security_validation: float = 0.0
    processing_time_ms: int = 0
    detected_fields: List[str] = field(default_factory=list)
    anomalies: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert metadata to dictionary for serialization."""
        return {
            'confidence_score': self.confidence_score,
            'risk_level': self.risk_level.value,
            'validation_score': self.validation_score,
            'integrity_score': self.integrity_score,
            'extraction_accuracy': self.extraction_accuracy,
            'security_validation': self.security_validation,
            'processing_time_ms': self.processing_time_ms,
            'detected_fields': self.detected_fields,
            'anomalies': self.anomalies,
            'suggestions': self.suggestions
        }

@dataclass
class TravelDocument:
    """
    Main document class representing a travel document in the vault.
    """
    id: str = field(default_factory=lambda: str(uuid4()))
    filename: str = ""
    original_filename: str = ""
    file_size: int = 0  # in bytes
    file_type: str = ""  # pdf, jpg, png, etc.
    document_type: DocumentType = DocumentType.OTHER
    upload_date: datetime = field(default_factory=datetime.now)
    last_modified: datetime = field(default_factory=datetime.now)
    expiry_date: Optional[date] = None
    tags: List[str] = field(default_factory=list)
    encryption_level: EncryptionLevel = EncryptionLevel.STANDARD
    status: DocumentStatus = DocumentStatus.UPLOADED
    metadata: DocumentMetadata = field(default_factory=DocumentMetadata)
    is_encrypted: bool = False
    encryption_key_id: Optional[str] = None
    cloud_backup_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    owner_id: str = "default_user"
    category: str = "uncategorized"
    notes: str = ""
    
    @property
    def is_valid(self) -> bool:
        """Check if document is currently valid (not expired)."""
        if not self.expiry_date:
            return True
        return self.expiry_date > date.today()
    
    @property
    def is_expiring_soon(self) -> bool:
        """Check if document expires within 30 days."""
        if not self.expiry_date:
            return False
        days_until_expiry = (self.expiry_date - date.today()).days
        return 0 < days_until_expiry <= 30
    
    @property
    def is_expired(self) -> bool:
        """Check if document is expired."""
        if not self.expiry_date:
            return False
        return self.expiry_date <= date.today()
    
    @property
    def days_until_expiry(self) -> Optional[int]:
        """Get number of days until expiry (negative if expired)."""
        if not self.expiry_date:
            return None
        return (self.expiry_date - date.today()).days
    
    @property
    def security_level(self) -> str:
        """Get human-readable security level."""
        if self.is_encrypted:
            return f"{self.encryption_level.value.upper()} ENCRYPTED"
        return "UNENCRYPTED"
    
    @property
    def status_icon(self) -> str:
        """Get appropriate icon for document status."""
        icons = {
            DocumentStatus.UPLOADED: "📤",
            DocumentStatus.PROCESSING: "⚙️",
            DocumentStatus.ENCRYPTED: "🔒",
            DocumentStatus.VALIDATED: "✅",
            DocumentStatus.EXPIRING: "⚠️",
            DocumentStatus.EXPIRED: "❌",
            DocumentStatus.ARCHIVED: "📦",
            DocumentStatus.DECRYPTED: "🔓"
        }
        return icons.get(self.status, "📄")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert document to dictionary for serialization."""
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'file_type': self.file_type,
            'document_type': self.document_type.value,
            'upload_date': self.upload_date.isoformat(),
            'last_modified': self.last_modified.isoformat(),
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'tags': self.tags,
            'encryption_level': self.encryption_level.value,
            'status': self.status.value,
            'metadata': self.metadata.to_dict(),
            'is_encrypted': self.is_encrypted,
            'encryption_key_id': self.encryption_key_id,
            'cloud_backup_url': self.cloud_backup_url,
            'thumbnail_url': self.thumbnail_url,
            'owner_id': self.owner_id,
            'category': self.category,
            'notes': self.notes,
            'is_valid': self.is_valid,
            'is_expiring_soon': self.is_expiring_soon,
            'is_expired': self.is_expired,
            'days_until_expiry': self.days_until_expiry,
            'security_level': self.security_level,
            'status_icon': self.status_icon
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TravelDocument':
        """Create document from dictionary."""
        doc = cls()
        doc.id = data.get('id', str(uuid4()))
        doc.filename = data.get('filename', '')
        doc.original_filename = data.get('original_filename', '')
        doc.file_size = data.get('file_size', 0)
        doc.file_type = data.get('file_type', '')
        doc.document_type = DocumentType(data.get('document_type', 'OTHER'))
        doc.upload_date = datetime.fromisoformat(data.get('upload_date', datetime.now().isoformat()))
        doc.last_modified = datetime.fromisoformat(data.get('last_modified', datetime.now().isoformat()))
        
        expiry_date = data.get('expiry_date')
        doc.expiry_date = date.fromisoformat(expiry_date) if expiry_date else None
        
        doc.tags = data.get('tags', [])
        doc.encryption_level = EncryptionLevel(data.get('encryption_level', 'standard'))
        doc.status = DocumentStatus(data.get('status', 'uploaded'))
        
        metadata_data = data.get('metadata', {})
        doc.metadata = DocumentMetadata(
            confidence_score=metadata_data.get('confidence_score', 0.0),
            risk_level=RiskLevel(metadata_data.get('risk_level', 'LOW')),
            validation_score=metadata_data.get('validation_score', 0),
            integrity_score=metadata_data.get('integrity_score', 0.0),
            extraction_accuracy=metadata_data.get('extraction_accuracy', 0.0),
            security_validation=metadata_data.get('security_validation', 0.0),
            processing_time_ms=metadata_data.get('processing_time_ms', 0),
            detected_fields=metadata_data.get('detected_fields', []),
            anomalies=metadata_data.get('anomalies', []),
            suggestions=metadata_data.get('suggestions', [])
        )
        
        doc.is_encrypted = data.get('is_encrypted', False)
        doc.encryption_key_id = data.get('encryption_key_id')
        doc.cloud_backup_url = data.get('cloud_backup_url')
        doc.thumbnail_url = data.get('thumbnail_url')
        doc.owner_id = data.get('owner_id', 'default_user')
        doc.category = data.get('category', 'uncategorized')
        doc.notes = data.get('notes', '')
        
        return doc

@dataclass
class VaultStatistics:
    """Statistics for the document vault."""
    total_documents: int = 0
    encrypted_count: int = 0
    validated_count: int = 0
    expiring_count: int = 0
    expired_count: int = 0
    total_file_size: int = 0  # in bytes
    average_confidence_score: float = 0.0
    average_risk_score: float = 0.0
    encryption_rate: float = 0.0
    validation_rate: float = 0.0
    last_backup: Optional[datetime] = None
    security_score: float = 0.0
    
    def update_from_documents(self, documents: List[TravelDocument]) -> None:
        """Update statistics based on document list."""
        if not documents:
            return
        
        self.total_documents = len(documents)
        self.encrypted_count = sum(1 for doc in documents if doc.is_encrypted)
        self.validated_count = sum(1 for doc in documents if doc.status == DocumentStatus.VALIDATED)
        self.expiring_count = sum(1 for doc in documents if doc.is_expiring_soon)
        self.expired_count = sum(1 for doc in documents if doc.is_expired)
        self.total_file_size = sum(doc.file_size for doc in documents)
        
        # Calculate averages
        confidence_scores = [doc.metadata.confidence_score for doc in documents]
        risk_scores = [self._risk_to_score(doc.metadata.risk_level) for doc in documents]
        
        self.average_confidence_score = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
        self.average_risk_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        
        self.encryption_rate = (self.encrypted_count / self.total_documents) * 100 if self.total_documents else 0
        self.validation_rate = (self.validated_count / self.total_documents) * 100 if self.total_documents else 0
        
        # Calculate security score (0-100)
        self.security_score = (
            self.encryption_rate * 0.4 +
            self.validation_rate * 0.3 +
            (100 - self.average_risk_score) * 0.2 +
            self.average_confidence_score * 0.1
        )
    
    def _risk_to_score(self, risk_level: RiskLevel) -> float:
        """Convert risk level to numerical score (0-100, higher = more risk)."""
        risk_scores = {
            RiskLevel.LOW: 25,
            RiskLevel.MEDIUM: 50,
            RiskLevel.HIGH: 75,
            RiskLevel.CRITICAL: 100
        }
        return risk_scores.get(risk_level, 50)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert statistics to dictionary."""
        return {
            'total_documents': self.total_documents,
            'encrypted_count': self.encrypted_count,
            'validated_count': self.validated_count,
            'expiring_count': self.expiring_count,
            'expired_count': self.expired_count,
            'total_file_size': self.total_file_size,
            'average_confidence_score': self.average_confidence_score,
            'average_risk_score': self.average_risk_score,
            'encryption_rate': self.encryption_rate,
            'validation_rate': self.validation_rate,
            'last_backup': self.last_backup.isoformat() if self.last_backup else None,
            'security_score': self.security_score
        }

class DocumentCategory(Enum):
    """Enumeration of document categories."""
    IDENTIFICATION = "identification"
    TRAVEL = "travel"
    MEDICAL = "medical"
    FINANCIAL = "financial"
    MISCELLANEOUS = "miscellaneous"
    
    @classmethod
    def from_document_type(cls, doc_type: DocumentType) -> 'DocumentCategory':
        """Get category from document type."""
        categories = {
            DocumentType.PASSPORT: cls.IDENTIFICATION,
            DocumentType.AADHAR: cls.IDENTIFICATION,
            DocumentType.PAN: cls.IDENTIFICATION,
            DocumentType.DRIVING_LICENSE: cls.IDENTIFICATION,
            DocumentType.VOTER_ID: cls.IDENTIFICATION,
            DocumentType.NATIONAL_ID: cls.IDENTIFICATION,
            DocumentType.VISA: cls.TRAVEL,
            DocumentType.TRAVEL_TICKET: cls.TRAVEL,
            DocumentType.HOTEL_BOOKING: cls.TRAVEL,
            DocumentType.TOUR_ITINERARY: cls.TRAVEL,
            DocumentType.TRAVEL_INSURANCE: cls.TRAVEL,
            DocumentType.VACCINATION_CERT: cls.MEDICAL,
            DocumentType.MEDICAL_REPORTS: cls.MEDICAL,
            DocumentType.HEALTH_INSURANCE: cls.MEDICAL,
            DocumentType.FOREX_RECEIPT: cls.FINANCIAL,
            DocumentType.CREDIT_CARD: cls.FINANCIAL,
            DocumentType.TRAVELERS_CHEQUE: cls.FINANCIAL,
            DocumentType.BANK_STATEMENT: cls.FINANCIAL,
            DocumentType.EMERGENCY_CONTACTS: cls.MISCELLANEOUS,
            DocumentType.TRAVEL_GUIDE: cls.MISCELLANEOUS,
            DocumentType.MAPS: cls.MISCELLANEOUS,
            DocumentType.OTHER: cls.MISCELLANEOUS
        }
        return categories.get(doc_type, cls.MISCELLANEOUS)