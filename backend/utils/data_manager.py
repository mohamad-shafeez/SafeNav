import json
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
import shutil
import hashlib

# Database paths
DB_FILE = "storage/metadata.json"
DB_BACKUP_FILE = "storage/metadata_backup.json"
AUDIT_LOG_FILE = "storage/audit_log.json"
STATISTICS_FILE = "storage/statistics.json"
os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)

def load_metadata() -> Dict[str, List[Dict]]:
    """
    Reads the database to show files in the gallery
    Enhanced with backup fallback
    """
    # Try to load main database
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Validate structure
            if 'encrypted' not in data:
                data['encrypted'] = []
            if 'general' not in data:
                data['general'] = []
                
            return data
            
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error loading main database: {e}")
            # Try backup
            return _load_backup()
    
    # Return empty structure if no database exists
    return {"encrypted": [], "general": []}

def _load_backup() -> Dict[str, List[Dict]]:
    """Load from backup if main database is corrupted"""
    if os.path.exists(DB_BACKUP_FILE):
        try:
            with open(DB_BACKUP_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            print("Loaded from backup database")
            # Restore backup to main
            save_metadata(data)
            return data
        except:
            pass
    
    # Return empty if backup also fails
    return {"encrypted": [], "general": []}

def save_metadata(data: Dict[str, List[Dict]]) -> bool:
    """Saves the database updates with backup"""
    try:
        # Create backup of current database
        if os.path.exists(DB_FILE):
            shutil.copy2(DB_FILE, DB_BACKUP_FILE)
        
        # Save new data
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        # Update statistics
        _update_statistics(data)
        
        return True
        
    except Exception as e:
        print(f"Error saving metadata: {e}")
        return False

def add_document_record(category: str, doc_data: Dict) -> Dict:
    """
    Adds a new file info to the list with enhanced validation
    Returns: The added document with any modifications
    """
    db = load_metadata()
    
    # Ensure category exists
    if category not in db:
        db[category] = []
    
    # Validate and enhance document data
    enhanced_doc = _enhance_document_data(doc_data)
    
    # Check for duplicates (by ID or content hash)
    if not _is_duplicate_document(db, enhanced_doc, category):
        # Add to the TOP of the list (newest first)
        db[category].insert(0, enhanced_doc)
        
        if save_metadata(db):
            # Log the addition
            _log_audit_event('ADD', enhanced_doc['id'], category, 
                           f"Added document: {enhanced_doc['name']}")
            
            # Update upload statistics
            _update_upload_stats(category, enhanced_doc['type'])
            
            return enhanced_doc
    
    return enhanced_doc

def remove_document_record(category: str, doc_id: str) -> bool:
    """
    Removes a file info from the list
    Returns: True if removed, False if not found
    """
    db = load_metadata()
    
    if category not in db:
        return False
    
    # Find document
    found_doc = None
    original_length = len(db[category])
    
    db[category] = [d for d in db[category] if str(d.get('id')) != str(doc_id)]
    
    if len(db[category]) < original_length:
        # Document was removed
        if save_metadata(db):
            _log_audit_event('DELETE', doc_id, category, "Document deleted")
            return True
    
    return False

def get_document_by_id(doc_id: str) -> Optional[Dict]:
    """Get document by ID from any category"""
    db = load_metadata()
    
    for category in ['encrypted', 'general']:
        for doc in db.get(category, []):
            if str(doc.get('id')) == str(doc_id):
                return {**doc, 'category': category}
    
    return None

def search_documents(query: str, category: str = None) -> Dict[str, List[Dict]]:
    """
    Search documents by name, type, or tags
    Returns: Filtered documents by category
    """
    db = load_metadata()
    query_lower = query.lower()
    
    results = {"encrypted": [], "general": []}
    
    for cat in ['encrypted', 'general']:
        if category and cat != category:
            continue
            
        for doc in db.get(cat, []):
            # Search in name
            if query_lower in doc.get('name', '').lower():
                results[cat].append(doc)
                continue
                
            # Search in type
            if query_lower in doc.get('type', '').lower():
                results[cat].append(doc)
                continue
                
            # Search in tags
            tags = doc.get('tags', [])
            if any(query_lower in tag.lower() for tag in tags):
                results[cat].append(doc)
                continue
                
            # Search in extracted fields
            extracted = doc.get('extracted_fields', {})
            for field, value in extracted.items():
                if isinstance(value, str) and query_lower in value.lower():
                    results[cat].append(doc)
                    break
                elif isinstance(value, list):
                    if any(query_lower in str(item).lower() for item in value):
                        results[cat].append(doc)
                        break
    
    return results

def filter_by_type(doc_type: str, category: str = None) -> Dict[str, List[Dict]]:
    """Filter documents by document type"""
    db = load_metadata()
    
    results = {"encrypted": [], "general": []}
    
    for cat in ['encrypted', 'general']:
        if category and cat != category:
            continue
            
        for doc in db.get(cat, []):
            if doc.get('type', '').upper() == doc_type.upper():
                results[cat].append(doc)
    
    return results

def get_statistics() -> Dict[str, Any]:
    """Get document statistics"""
    db = load_metadata()
    
    stats = {
        'total_documents': len(db['encrypted']) + len(db['general']),
        'encrypted_count': len(db['encrypted']),
        'general_count': len(db['general']),
        'by_type': {},
        'recent_uploads': [],
        'storage_analysis': _analyze_storage(db)
    }
    
    # Count by type
    all_docs = db['encrypted'] + db['general']
    for doc in all_docs:
        doc_type = doc.get('type', 'UNKNOWN')
        stats['by_type'][doc_type] = stats['by_type'].get(doc_type, 0) + 1
    
    # Get recent uploads (last 10)
    for doc in sorted(all_docs, 
                     key=lambda x: x.get('uploadedAt', ''), 
                     reverse=True)[:10]:
        stats['recent_uploads'].append({
            'id': doc.get('id'),
            'name': doc.get('name'),
            'type': doc.get('type'),
            'date': doc.get('date'),
            'category': 'encrypted' if doc in db['encrypted'] else 'general'
        })
    
    # Load additional statistics from file
    if os.path.exists(STATISTICS_FILE):
        try:
            with open(STATISTICS_FILE, 'r') as f:
                file_stats = json.load(f)
                stats['upload_stats'] = file_stats.get('upload_stats', {})
                stats['validation_stats'] = file_stats.get('validation_stats', {})
        except:
            pass
    
    return stats

def _enhance_document_data(doc_data: Dict) -> Dict:
    """Enhance document data with additional fields"""
    enhanced = doc_data.copy()
    
    # Ensure required fields
    if 'id' not in enhanced:
        enhanced['id'] = str(int(time.time() * 1000))
    
    if 'uploadedAt' not in enhanced:
        enhanced['uploadedAt'] = datetime.now().isoformat()
    
    if 'date' not in enhanced:
        enhanced['date'] = datetime.now().strftime("%b %d, %Y")
    
    # Add metadata
    enhanced['metadata'] = {
        'added_timestamp': time.time(),
        'added_date': datetime.now().isoformat(),
        'version': '2.0'  # Version of data schema
    }
    
    # Calculate content hash for deduplication
    if 'physical_name' in enhanced:
        enhanced['content_hash'] = _calculate_content_hash(enhanced)
    
    return enhanced

def _is_duplicate_document(db: Dict, doc: Dict, category: str) -> bool:
    """Check if document already exists (by ID or content)"""
    # Check by ID
    for existing_doc in db.get(category, []):
        if existing_doc.get('id') == doc.get('id'):
            return True
    
    # Optional: Check by content hash
    if 'content_hash' in doc:
        for existing_doc in db.get(category, []):
            if existing_doc.get('content_hash') == doc['content_hash']:
                return True
    
    return False

def _calculate_content_hash(doc: Dict) -> str:
    """Calculate hash for document content identification"""
    hash_input = f"{doc.get('name', '')}{doc.get('type', '')}{doc.get('size', '')}"
    return hashlib.md5(hash_input.encode()).hexdigest()

def _log_audit_event(action: str, doc_id: str, category: str, details: str):
    """Log audit events"""
    audit_entry = {
        'timestamp': time.time(),
        'date': datetime.now().isoformat(),
        'action': action,
        'doc_id': doc_id,
        'category': category,
        'details': details,
        'user_agent': 'system'  # In production, add user info
    }
    
    # Load existing audit log
    audit_log = []
    if os.path.exists(AUDIT_LOG_FILE):
        try:
            with open(AUDIT_LOG_FILE, 'r') as f:
                audit_log = json.load(f)
        except:
            pass
    
    # Add new entry and keep only last 1000 entries
    audit_log.append(audit_entry)
    if len(audit_log) > 1000:
        audit_log = audit_log[-1000:]
    
    # Save audit log
    try:
        with open(AUDIT_LOG_FILE, 'w') as f:
            json.dump(audit_log, f, indent=2)
    except:
        pass

def _update_statistics(data: Dict):
    """Update statistics file"""
    stats = {
        'last_updated': datetime.now().isoformat(),
        'document_counts': {
            'total': len(data['encrypted']) + len(data['general']),
            'encrypted': len(data['encrypted']),
            'general': len(data['general'])
        }
    }
    
    # Load existing stats
    existing_stats = {}
    if os.path.exists(STATISTICS_FILE):
        try:
            with open(STATISTICS_FILE, 'r') as f:
                existing_stats = json.load(f)
        except:
            pass
    
    # Merge with existing stats
    merged_stats = {**existing_stats, **stats}
    
    # Save updated stats
    try:
        with open(STATISTICS_FILE, 'w') as f:
            json.dump(merged_stats, f, indent=2)
    except:
        pass

def _update_upload_stats(category: str, doc_type: str):
    """Update upload statistics"""
    stats = {}
    if os.path.exists(STATISTICS_FILE):
        try:
            with open(STATISTICS_FILE, 'r') as f:
                stats = json.load(f)
        except:
            stats = {}
    
    # Initialize stats structure
    if 'upload_stats' not in stats:
        stats['upload_stats'] = {}
    
    if category not in stats['upload_stats']:
        stats['upload_stats'][category] = {}
    
    if doc_type not in stats['upload_stats'][category]:
        stats['upload_stats'][category][doc_type] = 0
    
    # Increment count
    stats['upload_stats'][category][doc_type] += 1
    
    # Save updated stats
    try:
        with open(STATISTICS_FILE, 'w') as f:
            json.dump(stats, f, indent=2)
    except:
        pass

def _analyze_storage(db: Dict) -> Dict:
    """Analyze storage usage and document characteristics"""
    analysis = {
        'total_documents': len(db['encrypted']) + len(db['general']),
        'document_types': {},
        'encrypted_percentage': 0,
        'recent_activity': {},
        'size_analysis': {
            'small': 0,  # < 100KB
            'medium': 0, # 100KB - 1MB
            'large': 0   # > 1MB
        }
    }
    
    if analysis['total_documents'] > 0:
        analysis['encrypted_percentage'] = (
            len(db['encrypted']) / analysis['total_documents']
        ) * 100
    
    # Analyze all documents
    all_docs = db['encrypted'] + db['general']
    for doc in all_docs:
        # Count by type
        doc_type = doc.get('type', 'UNKNOWN')
        analysis['document_types'][doc_type] = \
            analysis['document_types'].get(doc_type, 0) + 1
        
        # Size analysis (simplified)
        size_str = doc.get('size', '0 KB')
        try:
            size_num = float(size_str.split()[0])
            size_unit = size_str.split()[1].upper()
            
            if size_unit == 'MB':
                size_kb = size_num * 1024
            else:
                size_kb = size_num
            
            if size_kb < 100:
                analysis['size_analysis']['small'] += 1
            elif size_kb < 1024:
                analysis['size_analysis']['medium'] += 1
            else:
                analysis['size_analysis']['large'] += 1
                
        except:
            pass
    
    # Recent activity (last 7 days)
    week_ago = time.time() - (7 * 24 * 3600)
    recent_docs = [
        doc for doc in all_docs 
        if doc.get('metadata', {}).get('added_timestamp', 0) > week_ago
    ]
    
    analysis['recent_activity'] = {
        'last_7_days': len(recent_docs),
        'by_category': {
            'encrypted': len([d for d in recent_docs if d in db['encrypted']]),
            'general': len([d for d in recent_docs if d in db['general']])
        }
    }
    
    return analysis

def cleanup_orphaned_records(secure_dir: str, general_dir: str) -> Dict:
    """
    Clean up database records for files that no longer exist
    Returns: Cleanup statistics
    """
    db = load_metadata()
    cleanup_stats = {
        'removed_encrypted': 0,
        'removed_general': 0,
        'errors': []
    }
    
    # Check encrypted documents
    new_encrypted = []
    for doc in db.get('encrypted', []):
        filename = doc.get('physical_name', '')
        filepath = os.path.join(secure_dir, f"{filename}.enc")
        
        if os.path.exists(filepath):
            new_encrypted.append(doc)
        else:
            cleanup_stats['removed_encrypted'] += 1
            _log_audit_event('CLEANUP', doc.get('id'), 'encrypted', 
                           f"Removed orphaned record: {doc.get('name')}")
    
    # Check general documents
    new_general = []
    for doc in db.get('general', []):
        filename = doc.get('physical_name', '')
        filepath = os.path.join(general_dir, filename)
        
        if os.path.exists(filepath):
            new_general.append(doc)
        else:
            cleanup_stats['removed_general'] += 1
            _log_audit_event('CLEANUP', doc.get('id'), 'general', 
                           f"Removed orphaned record: {doc.get('name')}")
    
    # Update database if changes were made
    if cleanup_stats['removed_encrypted'] > 0 or cleanup_stats['removed_general'] > 0:
        db['encrypted'] = new_encrypted
        db['general'] = new_general
        save_metadata(db)
    
    return cleanup_stats

def export_database(export_path: str = None) -> str:
    """Export database to JSON file"""
    if not export_path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        export_path = f"storage/exports/database_export_{timestamp}.json"
    
    os.makedirs(os.path.dirname(export_path), exist_ok=True)
    
    db = load_metadata()
    
    with open(export_path, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=4, ensure_ascii=False)
    
    return export_path