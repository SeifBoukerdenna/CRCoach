# server/static/discord_auth_js.py - Discord authentication JavaScript as a Python function

def get_discord_auth_js() -> str:
    """Get the Discord authentication JavaScript"""
    return """
// Discord Authentication JavaScript - Persistent login with server verification
class DiscordAuth {
    constructor() {
        this.user = null;
        this.isAuthenticated = false;
        this.authStatusCallbacks = [];

        // DOM elements
        this.authContainer = null;
        this.connectBtn = null;
        this.disconnectBtn = null;
        this.userInfo = null;
        this.serverStatus = null;

        this.init();
    }

    init() {
        this.createDiscordAuthUI();
        this.checkAuthStatus();

        // Listen for auth status changes
        this.onAuthStatusChange((isAuth, user) => {
            this.updateUI(isAuth, user);
        });

        // Check auth status periodically (every 30 seconds)
        setInterval(() => {
            this.checkAuthStatus();
        }, 30000);
    }

    createDiscordAuthUI() {
        // Create Discord auth container in top-right corner
        this.authContainer = document.createElement('div');
        this.authContainer.id = 'discord-auth';
        this.authContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            background: rgba(30, 30, 30, 0.95);
            border: 1px solid #5865F2;
            border-radius: 8px;
            padding: 12px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            min-width: 200px;
            max-width: 250px;
        `;

        // Connect button
        this.connectBtn = document.createElement('button');
        this.connectBtn.textContent = 'Connect with Discord';
        this.connectBtn.style.cssText = `
            background: #5865F2;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            width: 100%;
            transition: background 0.2s;
            font-weight: 600;
        `;
        this.connectBtn.addEventListener('mouseover', () => {
            if (!this.connectBtn.disabled) {
                this.connectBtn.style.background = '#4752C4';
            }
        });
        this.connectBtn.addEventListener('mouseout', () => {
            if (!this.connectBtn.disabled) {
                this.connectBtn.style.background = '#5865F2';
            }
        });
        this.connectBtn.addEventListener('click', () => this.login());

        // Disconnect button
        this.disconnectBtn = document.createElement('button');
        this.disconnectBtn.textContent = 'Disconnect';
        this.disconnectBtn.style.cssText = `
            background: #ed4245;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            margin-top: 8px;
            width: 100%;
            transition: background 0.2s;
            display: none;
            font-weight: 600;
        `;
        this.disconnectBtn.addEventListener('mouseover', () => {
            this.disconnectBtn.style.background = '#c23e41';
        });
        this.disconnectBtn.addEventListener('mouseout', () => {
            this.disconnectBtn.style.background = '#ed4245';
        });
        this.disconnectBtn.addEventListener('click', () => this.logout());

        // User info display
        this.userInfo = document.createElement('div');
        this.userInfo.style.cssText = `
            display: none;
            margin-bottom: 8px;
        `;

        // Server status display
        this.serverStatus = document.createElement('div');
        this.serverStatus.style.cssText = `
            display: none;
            margin-top: 8px;
            padding: 6px;
            border-radius: 4px;
            font-size: 11px;
            text-align: center;
            font-weight: 600;
        `;

        // Assemble UI
        this.authContainer.appendChild(this.userInfo);
        this.authContainer.appendChild(this.connectBtn);
        this.authContainer.appendChild(this.serverStatus);
        this.authContainer.appendChild(this.disconnectBtn);

        // Add to page
        document.body.appendChild(this.authContainer);

        console.log('🔐 Discord auth UI created');
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/auth/discord/status', {
                credentials: 'include',
                cache: 'no-cache'
            });

            if (response.ok) {
                const data = await response.json();

                if (data.authenticated && data.user) {
                    this.setUser(data.user);
                    this.setAuthenticated(true);
                    console.log('✅ User authenticated:', data.user.username, 'Server member:', data.user.is_in_server);
                } else {
                    this.setUser(null);
                    this.setAuthenticated(false);
                    console.log('ℹ️ User not authenticated');
                }
            } else {
                this.setUser(null);
                this.setAuthenticated(false);
                console.log('❌ Auth status check failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Error checking auth status:', error);
            this.setUser(null);
            this.setAuthenticated(false);
        }
    }

    async login() {
        try {
            this.connectBtn.textContent = 'Connecting...';
            this.connectBtn.disabled = true;
            this.connectBtn.style.background = '#6b7280';

            // Get Discord OAuth2 URL
            const response = await fetch('/auth/discord/login');
            if (!response.ok) {
                throw new Error('Failed to get Discord login URL');
            }

            const data = await response.json();

            // Open Discord OAuth2 in popup
            const popup = window.open(
                data.auth_url,
                'discord-oauth',
                'width=500,height=700,scrollbars=yes,resizable=yes'
            );

            if (!popup) {
                throw new Error('Popup blocked. Please allow popups for this site.');
            }

            // Monitor popup for completion
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    this.connectBtn.textContent = 'Connect with Discord';
                    this.connectBtn.disabled = false;
                    this.connectBtn.style.background = '#5865F2';

                    // Check if authentication was successful
                    setTimeout(() => this.checkAuthStatus(), 1000);
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Discord login failed:', error);
            this.connectBtn.textContent = 'Connect with Discord';
            this.connectBtn.disabled = false;
            this.connectBtn.style.background = '#5865F2';
            alert('Discord login failed: ' + error.message);
        }
    }

    async logout() {
        try {
            this.disconnectBtn.textContent = 'Logging out...';
            this.disconnectBtn.disabled = true;

            const response = await fetch('/auth/discord/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                this.setUser(null);
                this.setAuthenticated(false);
                console.log('✅ Logged out successfully');
            } else {
                console.error('❌ Logout failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
        } finally {
            this.disconnectBtn.textContent = 'Disconnect';
            this.disconnectBtn.disabled = false;
        }
    }

    setUser(user) {
        this.user = user;
        this.notifyAuthStatusChange();
    }

    setAuthenticated(isAuth) {
        this.isAuthenticated = isAuth;
        this.notifyAuthStatusChange();
    }

    onAuthStatusChange(callback) {
        this.authStatusCallbacks.push(callback);
    }

    notifyAuthStatusChange() {
        this.authStatusCallbacks.forEach(callback => {
            try {
                callback(this.isAuthenticated, this.user);
            } catch (error) {
                console.error('❌ Auth callback error:', error);
            }
        });
    }

    updateUI(isAuthenticated, user) {
        if (isAuthenticated && user) {
            // Show user info
            this.userInfo.style.display = 'block';
            const avatarUrl = user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`
                : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;

            this.userInfo.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="${avatarUrl}" style="width: 24px; height: 24px; border-radius: 50%; border: 1px solid #5865F2;" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png';">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: bold; color: #5865F2; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.username}</div>
                        ${user.server_nickname ? `<div style="font-size: 10px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">aka ${user.server_nickname}</div>` : ''}
                    </div>
                </div>
            `;

            // Show server status
            this.serverStatus.style.display = 'block';
            if (user.is_in_server) {
                this.serverStatus.style.background = '#3ba55c';
                this.serverStatus.textContent = '✅ Server Member';
                this.serverStatus.title = 'You are a member of the required Discord server';
            } else {
                this.serverStatus.style.background = '#ed4245';
                this.serverStatus.textContent = '❌ Not in Server';
                this.serverStatus.title = 'You need to join the Discord server to access all features';
            }

            // Hide connect button, show disconnect
            this.connectBtn.style.display = 'none';
            this.disconnectBtn.style.display = 'block';

        } else {
            // Show connect button, hide user info
            this.userInfo.style.display = 'none';
            this.serverStatus.style.display = 'none';
            this.connectBtn.style.display = 'block';
            this.disconnectBtn.style.display = 'none';
            this.connectBtn.textContent = 'Connect with Discord';
            this.connectBtn.disabled = false;
            this.connectBtn.style.background = '#5865F2';
        }
    }

    // Public API
    getUser() {
        return this.user;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    isUserInServer() {
        return this.user && this.user.is_in_server;
    }

    getUserId() {
        return this.user ? this.user.id : null;
    }

    getUsername() {
        return this.user ? this.user.username : null;
    }
}

// Initialize Discord auth when page loads
let discordAuth;
document.addEventListener('DOMContentLoaded', () => {
    discordAuth = new DiscordAuth();
    console.log('🔐 Discord authentication initialized');

    // Make globally available
    window.discordAuth = discordAuth;
});

// Also make the class globally available
window.DiscordAuth = DiscordAuth;
"""