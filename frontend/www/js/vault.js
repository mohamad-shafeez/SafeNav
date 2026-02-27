
// TravelMate Vault 

class TravelMateVault {
    constructor() {
        // Hardwired to production cloud link
        this.apiBaseUrl = 'https://safenav-18sk.onrender.com/api'; 
            
        this.documents = [];
        this.currentFilters = {};
        this.voiceEnabled = true;
        this.recognition = null;
        this.isScanning = false;
        this.init();
    }

    init() {
        this.initializeVoiceRecognition();
        this.setupEventListeners();
        this.loadVaultData();
        this.updateStats();
        this.setupFileUpload();
    }

    setupEventListeners() {
        // Upload form
        document.getElementById('uploadForm').addEventListener('submit', (e) => this.handleUpload(e));
        document.getElementById('scanExisting').addEventListener('click', () => this.scanExistingDocuments());
        document.getElementById('voiceUpload').addEventListener('click', () => this.startVoiceUpload());
        
        // File drop zone
        const dropArea = document.getElementById('dropArea');
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.classList.add('dragover');
        });
        
        dropArea.addEventListener('dragleave', () => {
            dropArea.classList.remove('dragover');
        });
        
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.classList.remove('dragover');
            this.handleDroppedFiles(e.dataTransfer.files);
        });
        
        // Voice controls
        document.getElementById('voiceToggleBtn').addEventListener('click', () => this.toggleVoice());
        document.getElementById('voiceCommandBtn').addEventListener('click', () => this.toggleVoiceCommand());
        document.querySelectorAll('.voice-feature-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleVoiceFeature(e.target.id));
        });
        
        // Vault controls
        document.getElementById('refreshVault').addEventListener('click', () => this.loadVaultData());
        document.getElementById('exportAll').addEventListener('click', () => this.exportAllDocuments());
        document.getElementById('bulkActions').addEventListener('click', () => this.showBulkActions());
        document.getElementById('vaultSearch').addEventListener('input', (e) => this.filterDocuments(e.target.value));
        
        // Filter controls
        document.getElementById('categoryFilter').addEventListener('change', (e) => this.applyCategoryFilter(e.target.value));
        document.getElementById('statusFilter').addEventListener('change', (e) => this.applyStatusFilter(e.target.value));
        
        // Vault tabs
        document.querySelectorAll('.vault-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchVaultTab(e.target.dataset.tab));
        });
        
        // AI Scan
        document.getElementById('startScan').addEventListener('click', () => this.startAIScan());
        
        // Quick actions
        document.getElementById('emergencyExport').addEventListener('click', () => this.emergencyExport());
        document.getElementById('backupNow').addEventListener('click', () => this.createBackup());
        document.getElementById('validateAll').addEventListener('click', () => this.validateAllDocuments());
        document.getElementById('encryptAll').addEventListener('click', () => this.encryptAllDocuments());
        
        // Emergency panel
        document.getElementById('shareEmergency').addEventListener('click', () => this.shareEmergencyDocuments());
        document.getElementById('exportEmergency').addEventListener('click', () => this.exportEmergencyPDF());
        document.getElementById('callEmergency').addEventListener('click', () => this.callEmergencyServices());
        
        // Voice assistant
        document.querySelector('.close-voice').addEventListener('click', () => this.closeVoiceAssistant());
        document.querySelectorAll('.voice-mode').forEach(mode => {
            mode.addEventListener('click', (e) => this.setVoiceMode(e.target.dataset.mode));
        });
        
        // Clear voice log
        document.querySelector('.clear-log').addEventListener('click', () => this.clearVoiceLog());
    }

    setupFileUpload() {
        const fileInput = document.getElementById('fileInput');
        const dropArea = document.getElementById('dropArea');
        
        fileInput.addEventListener('change', (e) => {
            this.handleDroppedFiles(e.target.files);
        });
        
        dropArea.addEventListener('click', () => {
            fileInput.click();
        });
    }

    async loadVaultData() {
        try {
            this.showLoading('Loading vault data...');
            
            const response = await fetch(`${this.apiBaseUrl}/documents`);
            if (!response.ok) throw new Error('Failed to load documents');
            
            this.documents = await response.json();
            this.renderVaultDocuments();
            this.updateStats();
            this.updateBadges();
            
            this.hideLoading();
            this.showToast('Vault refreshed successfully', 'success');
        } catch (error) {
            console.error('Error loading vault data:', error);
            this.showToast('Failed to load vault data', 'error');
            this.hideLoading();
        }
    }

    async handleUpload(event) {
        event.preventDefault();
        
        const fileInput = document.getElementById('fileInput');
        if (!fileInput.files.length) {
            this.showToast('Please select a file to upload', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        const docType = document.getElementById('docType').value;
        const tagsInput = document.getElementById('docTags').value;
        const expiryDate = document.getElementById('expiryDate').value;
        const encryptionLevel = document.getElementById('encryptionLevel').value;
        
        if (!docType) {
            this.showToast('Please select a document type', 'warning');
            return;
        }
        
        const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', docType);
        formData.append('tags', tags.join(','));
        if (expiryDate) formData.append('expiry_date', expiryDate);
        formData.append('encryption_level', encryptionLevel);
        formData.append('notes', 'Uploaded via TravelMate Vault Pro');
        
        try {
            this.showLoading('Uploading and securing document...');
            
            const response = await fetch(`${this.apiBaseUrl}/documents/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Upload failed');
            
            const document = await response.json();
            
            // Reset form
            event.target.reset();
            fileInput.value = '';
            
            // Add to local documents array
            this.documents.push(document);
            
            // Update UI
            this.renderVaultDocuments();
            this.updateStats();
            this.updateBadges();
            
            this.hideLoading();
            this.showToast('Document uploaded and secured successfully!', 'success');
            
            // Start AI scan if enabled
            if (this.isScanning) {
                this.startDocumentScan(document.id);
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('Failed to upload document', 'error');
            this.hideLoading();
        }
    }

    handleDroppedFiles(files) {
        const fileInput = document.getElementById('fileInput');
        const dataTransfer = new DataTransfer();
        
        // Add existing files
        for (let i = 0; i < fileInput.files.length; i++) {
            dataTransfer.items.add(fileInput.files[i]);
        }
        
        // Add new files
        for (let i = 0; i < files.length; i++) {
            dataTransfer.items.add(files[i]);
        }
        
        fileInput.files = dataTransfer.files;
        
        // Update UI to show file count
        const dropArea = document.getElementById('dropArea');
        const fileCount = fileInput.files.length;
        
        if (fileCount > 0) {
            dropArea.innerHTML = `
                <i class="fas fa-file-check"></i>
                <p>${fileCount} file${fileCount > 1 ? 's' : ''} selected</p>
                <span class="upload-info">Click to add more files or drag & drop</span>
            `;
        }
        
        this.showToast(`${fileCount} file${fileCount > 1 ? 's' : ''} added to upload`, 'info');
    }

    renderVaultDocuments() {
        const encryptedGrid = document.getElementById('encryptedGrid');
        const generalList = document.getElementById('generalList');
        
        // Clear existing content
        encryptedGrid.innerHTML = '';
        generalList.innerHTML = '';
        
        if (this.documents.length === 0) {
            encryptedGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock"></i>
                    <p>No encrypted documents yet</p>
                    <small>Upload documents and enable encryption</small>
                </div>
            `;
            
            generalList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>No documents in vault</p>
                    <small>Upload your first document to get started</small>
                </div>
            `;
            return;
        }
        
        // Separate encrypted and general documents
        const encryptedDocs = this.documents.filter(doc => doc.is_encrypted);
        const generalDocs = this.documents.filter(doc => !doc.is_encrypted);
        
        // Render encrypted documents grid
        if (encryptedDocs.length > 0) {
            encryptedDocs.forEach(doc => {
                const docCard = this.createDocumentCard(doc);
                encryptedGrid.appendChild(docCard);
            });
        } else {
            encryptedGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock"></i>
                    <p>No encrypted documents yet</p>
                    <small>Upload documents and enable encryption</small>
                </div>
            `;
        }
        
        // Render general documents list
        if (generalDocs.length > 0) {
            generalDocs.forEach(doc => {
                const docItem = this.createDocumentListItem(doc);
                generalList.appendChild(docItem);
            });
        } else {
            generalList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>No general documents</p>
                    <small>All documents are encrypted</small>
                </div>
            `;
        }
    }

    createDocumentCard(document) {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.dataset.id = document.id;
        
        const expiryClass = this.getExpiryClass(document);
        const statusIcon = this.getStatusIcon(document.status);
        
        card.innerHTML = `
            <div class="card-header ${expiryClass}">
                <div class="card-type">
                    <i class="fas ${this.getDocumentIcon(document.document_type)}"></i>
                    <span>${this.formatDocumentType(document.document_type)}</span>
                </div>
                <div class="card-actions">
                    <button class="icon-btn view-doc" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="icon-btn download-doc" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="icon-btn delete-doc" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="card-content">
                <h4>${document.original_filename}</h4>
                <p class="card-info">
                    <i class="fas fa-calendar"></i>
                    ${this.formatDate(document.upload_date)}
                </p>
                <div class="card-tags">
                    ${document.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="card-stats">
                    <div class="stat">
                        <i class="fas fa-shield-alt"></i>
                        <span>${document.security_level}</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-chart-line"></i>
                        <span>${document.metadata?.confidence_score || 0}%</span>
                    </div>
                </div>
                <div class="card-status">
                    <span class="status-badge ${expiryClass}">
                        ${statusIcon} ${document.status}
                    </span>
                    ${document.expiry_date ? `
                        <span class="expiry-date">
                            <i class="fas fa-clock"></i>
                            ${this.formatExpiryDate(document.expiry_date)}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Add event listeners
        card.querySelector('.view-doc').addEventListener('click', () => this.viewDocument(document.id));
        card.querySelector('.download-doc').addEventListener('click', () => this.downloadDocument(document.id));
        card.querySelector('.delete-doc').addEventListener('click', () => this.deleteDocument(document.id));
        
        return card;
    }

    createDocumentListItem(document) {
        const item = document.createElement('div');
        item.className = 'document-item';
        item.dataset.id = document.id;
        
        const expiryClass = this.getExpiryClass(document);
        const statusIcon = this.getStatusIcon(document.status);
        
        item.innerHTML = `
            <div class="item-icon ${expiryClass}">
                <i class="fas ${this.getDocumentIcon(document.document_type)}"></i>
            </div>
            <div class="item-info">
                <h5>${document.original_filename}</h5>
                <div class="item-meta">
                    <span><i class="fas fa-tag"></i> ${this.formatDocumentType(document.document_type)}</span>
                    <span><i class="fas fa-calendar"></i> ${this.formatDate(document.upload_date)}</span>
                    ${document.expiry_date ? `
                        <span><i class="fas fa-clock"></i> ${this.formatExpiryDate(document.expiry_date)}</span>
                    ` : ''}
                </div>
                <div class="item-tags">
                    ${document.tags.map(tag => `<small class="tag">${tag}</small>`).join('')}
                </div>
            </div>
            <div class="item-actions">
                <span class="status-badge ${expiryClass}">
                    ${statusIcon} ${document.status}
                </span>
                <div class="action-buttons">
                    <button class="icon-btn view-doc" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="icon-btn download-doc" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="icon-btn delete-doc" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        item.querySelector('.view-doc').addEventListener('click', () => this.viewDocument(document.id));
        item.querySelector('.download-doc').addEventListener('click', () => this.downloadDocument(document.id));
        item.querySelector('.delete-doc').addEventListener('click', () => this.deleteDocument(document.id));
        
        return item;
    }

    async viewDocument(documentId) {
        try {
            this.showLoading('Loading document...');
            
            // In a real implementation, this would open a document viewer
            // For now, we'll download and show a preview
            const response = await fetch(`${this.apiBaseUrl}/documents/${documentId}`);
            const document = await response.json();
            
            // Show document info in a modal
            this.showDocumentModal(document);
            
            this.hideLoading();
        } catch (error) {
            console.error('Error viewing document:', error);
            this.showToast('Failed to load document', 'error');
            this.hideLoading();
        }
    }

    async downloadDocument(documentId, decrypt = false) {
        try {
            this.showLoading('Preparing download...');
            
            const response = await fetch(`${this.apiBaseUrl}/documents/${documentId}/download?decrypt=${decrypt}`);
            
            if (!response.ok) throw new Error('Download failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Get filename from headers
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `document_${documentId}`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.hideLoading();
            this.showToast('Document downloaded successfully', 'success');
            
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Failed to download document', 'error');
            this.hideLoading();
        }
    }

    async deleteDocument(documentId) {
        if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
            return;
        }
        
        try {
            this.showLoading('Deleting document...');
            
            const response = await fetch(`${this.apiBaseUrl}/documents/${documentId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Delete failed');
            
            // Remove from local array
            this.documents = this.documents.filter(doc => doc.id !== documentId);
            
            // Update UI
            this.renderVaultDocuments();
            this.updateStats();
            this.updateBadges();
            
            this.hideLoading();
            this.showToast('Document deleted successfully', 'success');
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('Failed to delete document', 'error');
            this.hideLoading();
        }
    }

    async startAIScan() {
        if (this.isScanning) {
            this.showToast('Scan already in progress', 'warning');
            return;
        }
        
        this.isScanning = true;
        this.updateScanUI(true);
        
        try {
            // Simulate AI scanning progress
            await this.simulateAIScan();
            
            // Update all documents with fresh AI analysis
            for (const doc of this.documents) {
                await this.startDocumentScan(doc.id);
            }
            
            this.showToast('AI scan completed successfully', 'success');
            
        } catch (error) {
            console.error('AI scan error:', error);
            this.showToast('AI scan failed', 'error');
        } finally {
            this.isScanning = false;
            this.updateScanUI(false);
        }
    }

    async simulateAIScan() {
        return new Promise((resolve) => {
            const duration = 5000; // 5 seconds
            const startTime = Date.now();
            
            const updateProgress = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Update progress bars
                const integrityProgress = Math.floor(progress * 100);
                const extractionProgress = Math.floor(progress * 85);
                const securityProgress = Math.floor(progress * 95);
                
                document.getElementById('integrityPercent').textContent = `${integrityProgress}%`;
                document.getElementById('extractionPercent').textContent = `${extractionProgress}%`;
                document.getElementById('securityPercent').textContent = `${securityProgress}%`;
                
                document.getElementById('integrityProgress').style.width = `${integrityProgress}%`;
                document.getElementById('extractionProgress').style.width = `${extractionProgress}%`;
                document.getElementById('securityProgress').style.width = `${securityProgress}%`;
                
                // Update metrics
                document.getElementById('confidenceScore').textContent = `${Math.floor(progress * 95)}%`;
                document.getElementById('riskLevel').textContent = progress > 0.7 ? 'LOW' : progress > 0.4 ? 'MEDIUM' : 'HIGH';
                document.getElementById('validationScore').textContent = `${Math.floor(progress * 10)}/10`;
                document.getElementById('aiProcessing').textContent = `${Math.floor(elapsed)}ms`;
                
                if (progress < 1) {
                    requestAnimationFrame(updateProgress);
                } else {
                    resolve();
                }
            };
            
            updateProgress();
        });
    }

    async startDocumentScan(documentId) {
        // In a real implementation, this would call an AI scanning API
        // For now, we'll simulate the process
        
        const document = this.documents.find(doc => doc.id === documentId);
        if (!document) return;
        
        // Simulate AI analysis results
        const confidence = 70 + Math.random() * 25;
        const riskLevel = confidence > 85 ? 'LOW' : confidence > 70 ? 'MEDIUM' : 'HIGH';
        
        // Update document metadata
        document.metadata = {
            confidence_score: Math.round(confidence),
            risk_level: riskLevel,
            validation_score: Math.round(confidence / 10),
            integrity_score: 0.8 + Math.random() * 0.15,
            extraction_accuracy: 0.75 + Math.random() * 0.2,
            security_validation: 0.85 + Math.random() * 0.1,
            processing_time_ms: 500 + Math.random() * 1000
        };
        
        document.status = confidence >= 70 ? 'VALIDATED' : 'UPLOADED';
        
        // Update UI
        this.renderVaultDocuments();
        this.updateStats();
    }

    updateStats() {
        const totalDocs = this.documents.length;
        const encryptedCount = this.documents.filter(doc => doc.is_encrypted).length;
        const validatedCount = this.documents.filter(doc => doc.status === 'VALIDATED').length;
        const expiringCount = this.documents.filter(doc => {
            if (!doc.expiry_date) return false;
            const expiryDate = new Date(doc.expiry_date);
            const today = new Date();
            const daysDiff = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            return daysDiff <= 30 && daysDiff > 0;
        }).length;
        
        // Update header stats
        document.getElementById('encryptedCount').textContent = encryptedCount;
        document.getElementById('validatedCount').textContent = validatedCount;
        document.getElementById('expiringCount').textContent = expiringCount;
        
        // Update analytics
        const encryptionRate = totalDocs > 0 ? Math.round((encryptedCount / totalDocs) * 100) : 0;
        const validationRate = totalDocs > 0 ? Math.round((validatedCount / totalDocs) * 100) : 0;
        
        document.getElementById('encryptionRate').textContent = `${encryptionRate}%`;
        document.getElementById('validationRate').textContent = `${validationRate}%`;
        
        // Update security score
        const securityScore = Math.round((encryptionRate * 0.4 + validationRate * 0.4 + 20) * 10) / 10;
        const scoreCircle = document.querySelector('.score-progress');
        if (scoreCircle) {
            const circumference = 2 * Math.PI * 35;
            const offset = circumference - (securityScore / 100) * circumference;
            scoreCircle.style.strokeDasharray = circumference;
            scoreCircle.style.strokeDashoffset = offset;
            document.querySelector('.score-text').textContent = `${securityScore}%`;
        }
    }

    updateBadges() {
        const encryptedCount = this.documents.filter(doc => doc.is_encrypted).length;
        const validatedCount = this.documents.filter(doc => doc.status === 'VALIDATED').length;
        const expiringCount = this.documents.filter(doc => {
            if (!doc.expiry_date) return false;
            const expiryDate = new Date(doc.expiry_date);
            const today = new Date();
            const daysDiff = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            return daysDiff <= 30 && daysDiff > 0;
        }).length;
        const generalCount = this.documents.filter(doc => !doc.is_encrypted).length;
        
        document.getElementById('encryptedBadge').textContent = encryptedCount;
        document.getElementById('generalBadge').textContent = generalCount;
        document.getElementById('validatedBadge').textContent = validatedCount;
        document.getElementById('expiringBadge').textContent = expiringCount;
    }

    filterDocuments(searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        
        document.querySelectorAll('.document-card, .document-item').forEach(element => {
            const docId = element.dataset.id;
            const document = this.documents.find(doc => doc.id === docId);
            
            if (!document) return;
            
            const matches = 
                document.original_filename.toLowerCase().includes(searchLower) ||
                document.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
                document.document_type.toLowerCase().includes(searchLower) ||
                document.notes.toLowerCase().includes(searchLower);
            
            element.style.display = matches ? '' : 'none';
        });
    }

    applyCategoryFilter(category) {
        this.currentFilters.category = category;
        this.applyFilters();
    }

    applyStatusFilter(status) {
        this.currentFilters.status = status;
        this.applyFilters();
    }

    applyFilters() {
        document.querySelectorAll('.document-card, .document-item').forEach(element => {
            const docId = element.dataset.id;
            const document = this.documents.find(doc => doc.id === docId);
            
            if (!document) {
                element.style.display = 'none';
                return;
            }
            
            let matches = true;
            
            if (this.currentFilters.category && this.currentFilters.category !== '') {
                matches = matches && document.category === this.currentFilters.category;
            }
            
            if (this.currentFilters.status && this.currentFilters.status !== '') {
                if (this.currentFilters.status === 'valid') {
                    matches = matches && document.status === 'VALIDATED';
                } else if (this.currentFilters.status === 'expiring') {
                    const expiryDate = new Date(document.expiry_date);
                    const today = new Date();
                    const daysDiff = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                    matches = matches && daysDiff <= 30 && daysDiff > 0;
                } else if (this.currentFilters.status === 'expired') {
                    const expiryDate = new Date(document.expiry_date);
                    const today = new Date();
                    matches = matches && expiryDate < today;
                } else if (this.currentFilters.status === 'encrypted') {
                    matches = matches && document.is_encrypted;
                }
            }
            
            element.style.display = matches ? '' : 'none';
        });
    }

    switchVaultTab(tabName) {
        // Update active tab
        document.querySelectorAll('.vault-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });
        
        // Show active section
        document.querySelectorAll('.vault-section').forEach(section => {
            section.classList.remove('active');
            if (section.id === `${tabName}Section`) {
                section.classList.add('active');
            }
        });
    }

    // Voice Control Functions
    initializeVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                this.processVoiceCommand(transcript);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Voice recognition error:', event.error);
                this.showToast('Voice recognition error', 'error');
                this.updateVoiceStatus('Error - Please try again');
            };
            
            this.recognition.onend = () => {
                document.getElementById('voiceCommandBtn').classList.remove('listening');
                this.updateVoiceStatus('Ready for commands');
            };
        } else {
            console.warn('Speech recognition not supported');
            document.getElementById('voiceToggleBtn').disabled = true;
            document.getElementById('voiceToggleBtn').innerHTML = '<i class="fas fa-microphone-slash"></i> Voice: NOT SUPPORTED';
            this.voiceEnabled = false;
        }
    }

    toggleVoice() {
        this.voiceEnabled = !this.voiceEnabled;
        const btn = document.getElementById('voiceToggleBtn');
        
        if (this.voiceEnabled) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-microphone-alt"></i> Voice: ENABLED <div class="voice-indicator"></div>';
            this.showToast('Voice control enabled', 'success');
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-microphone-slash"></i> Voice: DISABLED';
            this.showToast('Voice control disabled', 'warning');
        }
    }

    toggleVoiceCommand() {
        if (!this.voiceEnabled || !this.recognition) {
            this.showToast('Voice control is not available', 'warning');
            return;
        }
        
        const btn = document.getElementById('voiceCommandBtn');
        
        if (btn.classList.contains('listening')) {
            this.recognition.stop();
            btn.classList.remove('listening');
        } else {
            this.recognition.start();
            btn.classList.add('listening');
            this.updateVoiceStatus('Listening...');
            this.showToast('Listening for voice command', 'info');
        }
    }

    processVoiceCommand(command) {
        this.addToVoiceLog(`Command: ${command}`);
        
        // Process common commands
        if (command.includes('scan') && command.includes('document')) {
            this.startAIScan();
            this.showToast('Starting AI document scan', 'info');
        } else if (command.includes('show') && command.includes('passport')) {
            const passport = this.documents.find(doc => doc.document_type === 'PASSPORT');
            if (passport) {
                this.viewDocument(passport.id);
            } else {
                this.showToast('No passport found in vault', 'warning');
            }
        } else if (command.includes('validate') && command.includes('all')) {
            this.validateAllDocuments();
        } else if (command.includes('export') && command.includes('summary')) {
            this.exportAllDocuments();
        } else if (command.includes('emergency') && command.includes('checklist')) {
            this.showEmergencyPanel();
        } else if (command.includes('upload') && command.includes('document')) {
            document.getElementById('fileInput').click();
            this.showToast('Please select a file to upload', 'info');
        } else {
            this.showToast(`Command not recognized: ${command}`, 'warning');
        }
    }

    setVoiceMode(mode) {
        document.querySelectorAll('.voice-mode').forEach(m => m.classList.remove('active'));
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        this.showToast(`Voice mode set to: ${mode}`, 'info');
    }

    updateVoiceStatus(status) {
        document.getElementById('voiceStatus').textContent = status;
        
        // Add visualizer animation
        const visualizer = document.getElementById('voiceVisualizer');
        visualizer.innerHTML = '';
        
        if (status === 'Listening...') {
            for (let i = 0; i < 10; i++) {
                const bar = document.createElement('div');
                bar.style.animationDelay = `${i * 0.1}s`;
                visualizer.appendChild(bar);
            }
        }
    }

    addToVoiceLog(message) {
        const logContent = document.getElementById('voiceLogContent');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `<span class="log-time">${timestamp}</span> <span class="log-message">${message}</span>`;
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    clearVoiceLog() {
        document.getElementById('voiceLogContent').innerHTML = '';
        this.showToast('Voice log cleared', 'info');
    }

    handleVoiceFeature(featureId) {
        switch (featureId) {
            case 'voiceScan':
                this.startAIScan();
                break;
            case 'voiceValidate':
                this.validateAllDocuments();
                break;
            case 'voiceExport':
                this.exportAllDocuments();
                break;
            case 'voiceEmergency':
                this.showEmergencyPanel();
                break;
        }
    }

    // Utility Functions
    getDocumentIcon(docType) {
        const icons = {
            'PASSPORT': 'fa-passport',
            'AADHAR': 'fa-id-card',
            'PAN': 'fa-id-card',
            'DRIVING_LICENSE': 'fa-id-card',
            'VOTER_ID': 'fa-id-card',
            'NATIONAL_ID': 'fa-id-card',
            'VISA': 'fa-stamp',
            'TRAVEL_TICKET': 'fa-ticket-alt',
            'HOTEL_BOOKING': 'fa-hotel',
            'TOUR_ITINERARY': 'fa-map-marked-alt',
            'TRAVEL_INSURANCE': 'fa-shield-alt',
            'VACCINATION_CERT': 'fa-syringe',
            'MEDICAL_REPORTS': 'fa-file-medical',
            'HEALTH_INSURANCE': 'fa-heartbeat',
            'FOREX_RECEIPT': 'fa-money-bill-wave',
            'CREDIT_CARD': 'fa-credit-card',
            'TRAVELERS_CHEQUE': 'fa-money-check',
            'BANK_STATEMENT': 'fa-file-invoice-dollar',
            'EMERGENCY_CONTACTS': 'fa-address-book',
            'TRAVEL_GUIDE': 'fa-book',
            'MAPS': 'fa-map',
            'OTHER': 'fa-file'
        };
        return icons[docType] || 'fa-file';
    }

    formatDocumentType(docType) {
        const names = {
            'PASSPORT': 'Passport',
            'AADHAR': 'Aadhar Card',
            'PAN': 'PAN Card',
            'DRIVING_LICENSE': 'Driving License',
            'VOTER_ID': 'Voter ID',
            'NATIONAL_ID': 'National ID',
            'VISA': 'Visa',
            'TRAVEL_TICKET': 'Travel Ticket',
            'HOTEL_BOOKING': 'Hotel Booking',
            'TOUR_ITINERARY': 'Tour Itinerary',
            'TRAVEL_INSURANCE': 'Travel Insurance',
            'VACCINATION_CERT': 'Vaccination Certificate',
            'MEDICAL_REPORTS': 'Medical Reports',
            'HEALTH_INSURANCE': 'Health Insurance',
            'FOREX_RECEIPT': 'Forex Receipt',
            'CREDIT_CARD': 'Credit Card',
            'TRAVELERS_CHEQUE': 'Traveler\'s Cheque',
            'BANK_STATEMENT': 'Bank Statement',
            'EMERGENCY_CONTACTS': 'Emergency Contacts',
            'TRAVEL_GUIDE': 'Travel Guide',
            'MAPS': 'Maps',
            'OTHER': 'Other Document'
        };
        return names[docType] || docType;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatExpiryDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const daysDiff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) {
            return `Expired ${Math.abs(daysDiff)} days ago`;
        } else if (daysDiff === 0) {
            return 'Expires today';
        } else if (daysDiff === 1) {
            return 'Expires tomorrow';
        } else if (daysDiff <= 30) {
            return `${daysDiff} days remaining`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    getExpiryClass(document) {
        if (!document.expiry_date) return '';
        
        const expiryDate = new Date(document.expiry_date);
        const today = new Date();
        const daysDiff = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) return 'expired';
        if (daysDiff <= 7) return 'critical';
        if (daysDiff <= 30) return 'warning';
        return '';
    }

    getStatusIcon(status) {
        const icons = {
            'UPLOADED': '📤',
            'PROCESSING': '⚙️',
            'ENCRYPTED': '🔒',
            'VALIDATED': '✅',
            'EXPIRING': '⚠️',
            'EXPIRED': '❌',
            'ARCHIVED': '📦',
            'DECRYPTED': '🔓'
        };
        return icons[status] || '📄';
    }

    updateScanUI(scanning) {
        const statusIndicator = document.getElementById('scanStatusIndicator');
        const statusText = document.getElementById('scanStatusText');
        const scanBtn = document.getElementById('startScan');
        
        if (scanning) {
            statusIndicator.className = 'status-indicator scanning';
            statusText.textContent = 'Scanning in progress...';
            scanBtn.disabled = true;
            scanBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Scanning...';
        } else {
            statusIndicator.className = 'status-indicator ready';
            statusText.textContent = 'Ready to Scan';
            scanBtn.disabled = false;
            scanBtn.innerHTML = '<i class="fas fa-play"></i> Start Deep Scan';
        }
    }

    // Action Functions
    async scanExistingDocuments() {
        this.showToast('Starting scan of existing documents...', 'info');
        await this.startAIScan();
    }

    startVoiceUpload() {
        if (this.voiceEnabled && this.recognition) {
            this.showToast('Say "upload document" to start voice upload', 'info');
            this.toggleVoiceCommand();
        } else {
            document.getElementById('fileInput').click();
        }
    }

    async exportAllDocuments() {
        try {
            this.showLoading('Preparing export...');
            
            const response = await fetch(`${this.apiBaseUrl}/export/summary`);
            if (!response.ok) throw new Error('Export failed');
            
            const summary = await response.json();
            
            // Create and download JSON file
            const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vault_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.hideLoading();
            this.showToast('Export completed successfully', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Failed to export documents', 'error');
            this.hideLoading();
        }
    }

    showBulkActions() {
        // In a real implementation, this would show a modal with bulk actions
        this.showToast('Bulk actions feature coming soon', 'info');
    }

    async validateAllDocuments() {
        try {
            this.showLoading('Validating all documents...');
            
            // Simulate validation process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.hideLoading();
            this.showToast('All documents validated successfully', 'success');
            
        } catch (error) {
            console.error('Validation error:', error);
            this.showToast('Validation failed', 'error');
            this.hideLoading();
        }
    }

    async encryptAllDocuments() {
        if (!confirm('This will encrypt all unencrypted documents. Continue?')) {
            return;
        }
        
        try {
            this.showLoading('Encrypting all documents...');
            
            // In a real implementation, this would call an API endpoint
            // For now, simulate the process
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            this.hideLoading();
            this.showToast('All documents encrypted successfully', 'success');
            
            // Refresh vault data
            await this.loadVaultData();
            
        } catch (error) {
            console.error('Encryption error:', error);
            this.showToast('Encryption failed', 'error');
            this.hideLoading();
        }
    }

    emergencyExport() {
        this.showEmergencyPanel();
    }

    async createBackup() {
        try {
            this.showLoading('Creating backup...');
            
            // In a real implementation, this would call a backup API endpoint
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.hideLoading();
            this.showToast('Backup created successfully', 'success');
            
        } catch (error) {
            console.error('Backup error:', error);
            this.showToast('Backup failed', 'error');
            this.hideLoading();
        }
    }

    showEmergencyPanel() {
        document.getElementById('emergencyPanel').classList.add('active');
        this.showToast('Emergency mode activated', 'warning');
    }

    closeEmergencyPanel() {
        document.getElementById('emergencyPanel').classList.remove('active');
    }

    shareEmergencyDocuments() {
        this.showToast('Emergency documents shared with contacts', 'info');
    }

    exportEmergencyPDF() {
        this.showToast('Emergency PDF generated', 'info');
    }

    callEmergencyServices() {
        this.showToast('Calling emergency services...', 'warning');
        // In a real app, this would initiate a phone call
    }

    closeVoiceAssistant() {
        document.getElementById('voiceAssistant').classList.remove('active');
    }

    showDocumentModal(document) {
        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas ${this.getDocumentIcon(document.document_type)}"></i> ${document.original_filename}</h3>
                        <button class="modal-close"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <div class="document-details">
                            <div class="detail-row">
                                <span class="detail-label">Document Type:</span>
                                <span class="detail-value">${this.formatDocumentType(document.document_type)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Upload Date:</span>
                                <span class="detail-value">${this.formatDate(document.upload_date)}</span>
                            </div>
                            ${document.expiry_date ? `
                                <div class="detail-row">
                                    <span class="detail-label">Expiry Date:</span>
                                    <span class="detail-value ${this.getExpiryClass(document)}">${this.formatExpiryDate(document.expiry_date)}</span>
                                </div>
                            ` : ''}
                            <div class="detail-row">
                                <span class="detail-label">Security Level:</span>
                                <span class="detail-value">${document.security_level}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Status:</span>
                                <span class="detail-value">${document.status}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">AI Confidence:</span>
                                <span class="detail-value">${document.metadata?.confidence_score || 0}%</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Tags:</span>
                                <span class="detail-value">${document.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</span>
                            </div>
                            ${document.notes ? `
                                <div class="detail-row">
                                    <span class="detail-label">Notes:</span>
                                    <span class="detail-value">${document.notes}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-actions">
                            <button class="btn-primary download-now">
                                <i class="fas fa-download"></i> Download
                            </button>
                            <button class="btn-secondary close-modal">
                                <i class="fas fa-times"></i> Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        // Add event listeners
        modalContainer.querySelector('.modal-close').addEventListener('click', () => {
            modalContainer.remove();
        });
        
        modalContainer.querySelector('.close-modal').addEventListener('click', () => {
            modalContainer.remove();
        });
        
        modalContainer.querySelector('.download-now').addEventListener('click', () => {
            this.downloadDocument(document.id);
        });
        
        // Close on overlay click
        modalContainer.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === modalContainer.querySelector('.modal-overlay')) {
                modalContainer.remove();
            }
        });
    }

    // UI Helper Functions
    showLoading(message = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        loadingText.textContent = message;
        overlay.classList.add('active');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.remove('active');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        container.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.travelMateVault = new TravelMateVault();
});

// Add CSS for dynamic elements
const dynamicStyles = `
    .document-card {
        background: rgba(30, 41, 59, 0.8);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        overflow: hidden;
        transition: all 0.3s ease;
    }
    
    .document-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        border-color: rgba(99, 102, 241, 0.5);
    }
    
    .card-header {
        padding: 16px;
        background: rgba(99, 102, 241, 0.1);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .card-header.critical {
        background: rgba(239, 68, 68, 0.1);
        border-bottom-color: rgba(239, 68, 68, 0.3);
    }
    
    .card-header.warning {
        background: rgba(245, 158, 11, 0.1);
        border-bottom-color: rgba(245, 158, 11, 0.3);
    }
    
    .card-header.expired {
        background: rgba(107, 114, 128, 0.1);
        border-bottom-color: rgba(107, 114, 128, 0.3);
    }
    
    .card-type {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
    }
    
    .card-content {
        padding: 16px;
    }
    
    .card-content h4 {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    .card-info {
        color: #9ca3af;
        font-size: 14px;
        margin: 8px 0;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    
    .card-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin: 12px 0;
    }
    
    .tag {
        background: rgba(99, 102, 241, 0.2);
        color: #c7d2fe;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .card-stats {
        display: flex;
        gap: 12px;
        margin: 12px 0;
    }
    
    .card-stats .stat {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        color: #9ca3af;
    }
    
    .card-status {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 12px;
    }
    
    .status-badge {
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        background: rgba(34, 197, 94, 0.2);
        color: #86efac;
    }
    
    .status-badge.critical {
        background: rgba(239, 68, 68, 0.2);
        color: #fca5a5;
    }
    
    .status-badge.warning {
        background: rgba(245, 158, 11, 0.2);
        color: #fcd34d;
    }
    
    .status-badge.expired {
        background: rgba(107, 114, 128, 0.2);
        color: #d1d5db;
    }
    
    .expiry-date {
        font-size: 12px;
        color: #9ca3af;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .document-item {
        display: flex;
        align-items: center;
        padding: 12px;
        background: rgba(30, 41, 59, 0.8);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 8px;
        transition: all 0.3s ease;
    }
    
    .document-item:hover {
        background: rgba(30, 41, 59, 0.9);
        border-color: rgba(99, 102, 241, 0.3);
    }
    
    .item-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: rgba(99, 102, 241, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        margin-right: 12px;
    }
    
    .item-icon.critical {
        background: rgba(239, 68, 68, 0.2);
    }
    
    .item-icon.warning {
        background: rgba(245, 158, 11, 0.2);
    }
    
    .item-icon.expired {
        background: rgba(107, 114, 128, 0.2);
    }
    
    .item-info {
        flex: 1;
    }
    
    .item-info h5 {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 600;
    }
    
    .item-meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: #9ca3af;
        margin-bottom: 4px;
    }
    
    .item-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
    
    .item-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
    }
    
    .action-buttons {
        display: flex;
        gap: 4px;
    }
    
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    
    .modal-overlay.active {
        display: flex;
        animation: fadeIn 0.3s ease;
    }
    
    .modal-content {
        background: #1e293b;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
    }
    
    .modal-header {
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .modal-header h3 {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .modal-close {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 20px;
        transition: all 0.3s ease;
    }
    
    .modal-close:hover {
        color: #fff;
        transform: rotate(90deg);
    }
    
    .modal-body {
        padding: 20px;
    }
    
    .document-details {
        margin-bottom: 20px;
    }
    
    .detail-row {
        display: flex;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .detail-row:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
    }
    
    .detail-label {
        flex: 0 0 120px;
        font-weight: 600;
        color: #9ca3af;
    }
    
    .detail-value {
        flex: 1;
        color: #fff;
    }
    
    .modal-actions {
        display: flex;
        gap: 12px;
    }
    
    .toast.fade-out {
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    }
    
    .log-entry {
        padding: 8px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 14px;
    }
    
    .log-entry:last-child {
        border-bottom: none;
    }
    
    .log-time {
        color: #9ca3af;
        font-size: 12px;
        margin-right: 8px;
    }
    
    .log-message {
        color: #fff;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;

// Add dynamic styles to page
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);