// ==========================================
// admin-dashboard.js - Advanced Admin Analytics
// Real-time monitoring with Firestore integration
// ==========================================

class AdminDashboard {
    constructor() {
        this.baseUrl = CONFIG.BACKEND_URL;
        this.token = null;
        this.refreshInterval = 30000; // 30 seconds
        this.charts = {};
        this.init();
    }

    async init() {
        await this.getToken();
        this.loadSystemHealth();
        this.loadAuditLogs();
        this.loadUsersAnalytics();
        this.loadHealthProfilesAnalytics();
        this.loadApiQuotaStatus();
        this.loadRoutesAnalytics();
        this.setupAutoRefresh();
    }

    async getToken() {
        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                window.location.href = '/login.html';
                return;
            }
            this.token = await user.getIdToken();
        } catch (error) {
            console.error('Token fetch failed:', error);
            window.location.href = '/login.html';
        }
    }

    // ─── SYSTEM HEALTH DASHBOARD ───
    async loadSystemHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/analytics/system-health`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();

            this.displaySystemHealth(data);
        } catch (error) {
            console.error('System health fetch failed:', error);
            this.showNotification('Failed to load system health', 'error');
        }
    }

    displaySystemHealth(data) {
        const container = document.getElementById('system-health-container');
        if (!container) return;

        const killSwitchLevel = data.kill_switch?.level || 0;
        const apiStats = data.api_usage || {};
        const dailyStats = data.daily_stats || {};

        let html = `
            <div class="analytics-grid">
                <div class="stat-card ${killSwitchLevel > 0 ? 'alert' : 'ok'}">
                    <div class="stat-label">System Status</div>
                    <div class="stat-value">${killSwitchLevel === 0 ? '🟢 OPERATIONAL' : '🔴 KILL SWITCH'}</div>
                    <div class="stat-sub">${data.kill_switch?.label || 'All systems running'}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">Routes Generated Today</div>
                    <div class="stat-value">${dailyStats.routesToday || 0}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">API Calls (Total)</div>
                    <div class="stat-value">${Object.values(apiStats).reduce((a, b) => a + (b || 0), 0)}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">Timestamp</div>
                    <div class="stat-value" style="font-size: 0.8em;">${new Date(data.timestamp).toLocaleTimeString()}</div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // ─── AUDIT LOG VIEWER ───
    async loadAuditLogs() {
        try {
            const response = await fetch(
                `${this.baseUrl}/api/admin/analytics/audit-logs?limit=50&severity=CRITICAL`,
                { headers: { 'Authorization': `Bearer ${this.token}` } }
            );
            const data = await response.json();
            this.displayAuditLogs(data.logs);
        } catch (error) {
            console.error('Audit logs fetch failed:', error);
        }
    }

    displayAuditLogs(logs) {
        const container = document.getElementById('audit-logs-container');
        if (!container) return;

        if (logs.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">No critical actions logged</p>';
            return;
        }

        let html = '<table class="audit-table"><thead><tr><th>Time</th><th>Action</th><th>Admin</th><th>Target</th><th>Severity</th></tr></thead><tbody>';

        logs.slice(0, 20).forEach(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const severity = `<span class="severity-${log.severity.toLowerCase()}">${log.severity}</span>`;
            html += `
                <tr>
                    <td>${time}</td>
                    <td>${log.action}</td>
                    <td>${log.actor}</td>
                    <td>${log.target}</td>
                    <td>${severity}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // ─── USERS ANALYTICS ───
    async loadUsersAnalytics() {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/analytics/users?limit=50`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            this.displayUsersTable(data.users);
        } catch (error) {
            console.error('Users analytics fetch failed:', error);
        }
    }

    displayUsersTable(users) {
        const container = document.getElementById('users-table-container');
        if (!container) return;

        let html = '<table class="users-table"><thead><tr><th>Email</th><th>Status</th><th>Role</th><th>Health Profile</th><th>Actions</th></tr></thead><tbody>';

        users.forEach(user => {
            const health = user.health_profile?.length > 0 ? user.health_profile.join(', ') : 'Standard';
            html += `
                <tr>
                    <td>${user.email}</td>
                    <td><span class="status-${user.status.toLowerCase()}">${user.status}</span></td>
                    <td>${user.role}</td>
                    <td>${health}</td>
                    <td>
                        <button class="btn-xs" onclick="adminDash.banUser('${user.uid}')">Ban</button>
                        <button class="btn-xs" onclick="adminDash.deleteUser('${user.uid}')">Delete</button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // ─── HEALTH PROFILES DISTRIBUTION ───
    async loadHealthProfilesAnalytics() {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/analytics/health-profiles`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            this.displayHealthProfiles(data);
        } catch (error) {
            console.error('Health profiles fetch failed:', error);
        }
    }

    displayHealthProfiles(data) {
        const container = document.getElementById('health-profiles-container');
        if (!container) return;

        const conditions = [
            { label: 'Cardiac', value: data.cardiac },
            { label: 'Asthma', value: data.asthma },
            { label: 'Diabetes', value: data.diabetes },
            { label: 'Hypertension', value: data.hypertension },
            { label: 'Standard', value: data.standard }
        ];

        let html = '<div class="health-distribution">';
        conditions.forEach(cond => {
            const percentage = data.total_users > 0 ? ((cond.value / data.total_users) * 100).toFixed(1) : 0;
            html += `
                <div class="health-row">
                    <div class="health-label">${cond.label}</div>
                    <div class="health-bar">
                        <div class="health-fill" style="width: ${percentage}%;"></div>
                    </div>
                    <div class="health-stat">${cond.value} (${percentage}%)</div>
                </div>
            `;
        });
        html += `<div class="health-total">Total Users: ${data.total_users}</div>`;
        html += '</div>';

        container.innerHTML = html;
    }

    // ─── API QUOTA STATUS ───
    async loadApiQuotaStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/analytics/api-quota`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            this.displayApiQuota(data);
        } catch (error) {
            console.error('API quota fetch failed:', error);
        }
    }

    displayApiQuota(quota) {
        const container = document.getElementById('api-quota-container');
        if (!container) return;

        let html = '<div class="quota-grid">';

        Object.entries(quota).forEach(([api, stats]) => {
            const statusClass = stats.status.toLowerCase();
            html += `
                <div class="quota-card quota-${statusClass}">
                    <div class="quota-name">${api.toUpperCase()}</div>
                    <div class="quota-usage">${stats.current} / ${stats.limit}</div>
                    <div class="quota-bar">
                        <div class="quota-fill" style="width: ${stats.percentage}%;"></div>
                    </div>
                    <div class="quota-remaining">Remaining: ${stats.remaining}</div>
                    <div class="quota-status">${stats.status}</div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    // ─── ROUTES ANALYTICS ───
    async loadRoutesAnalytics() {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/analytics/routes-today`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            this.displayRoutesAnalytics(data);
        } catch (error) {
            console.error('Routes analytics fetch failed:', error);
        }
    }

    displayRoutesAnalytics(data) {
        const container = document.getElementById('routes-analytics-container');
        if (!container) return;

        let html = `
            <div class="routes-stats">
                <div class="stat-item">
                    <div class="stat-label">Routes Generated</div>
                    <div class="stat-number">${data.routes_generated}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Avg Safety Score</div>
                    <div class="stat-number">${data.avg_safety_score.toFixed(1)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Trips Completed</div>
                    <div class="stat-number">${data.trips_completed}</div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // ─── USER ACTIONS ───
    async banUser(uid) {
        if (!confirm('Ban this user? They will lose access immediately.')) return;

        try {
            const response = await fetch(`${this.baseUrl}/api/admin/user-action`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    targetUid: uid,
                    action: 'ban'
                })
            });

            if (response.ok) {
                this.showNotification('User banned successfully', 'success');
                this.loadUsersAnalytics();
            } else {
                this.showNotification('Failed to ban user', 'error');
            }
        } catch (error) {
            console.error('Ban user failed:', error);
            this.showNotification('Error banning user', 'error');
        }
    }

    async deleteUser(uid) {
        if (!confirm('Delete this user permanently? This cannot be undone.')) return;

        try {
            const response = await fetch(`${this.baseUrl}/api/admin/user-action`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    targetUid: uid,
                    action: 'delete'
                })
            });

            if (response.ok) {
                this.showNotification('User deleted successfully', 'success');
                this.loadUsersAnalytics();
            } else {
                this.showNotification('Failed to delete user', 'error');
            }
        } catch (error) {
            console.error('Delete user failed:', error);
            this.showNotification('Error deleting user', 'error');
        }
    }

    // ─── AUTO REFRESH ───
    setupAutoRefresh() {
        setInterval(() => {
            this.loadSystemHealth();
            this.loadApiQuotaStatus();
            this.loadRoutesAnalytics();
            this.loadAuditLogs();
        }, this.refreshInterval);
    }

    // ─── UTILITIES ───
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }
}

// Initialize on page load
let adminDash;
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined') {
        adminDash = new AdminDashboard();
    }
});
