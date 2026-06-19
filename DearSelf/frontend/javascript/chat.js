/**
 * Dear Self - Chat Widget
 * Unified chat component for all pages with real-time support
 */

const CHAT_API_URL = 'http://localhost:3000/api';

// Real-time subscription manager
class RealtimeChatManager {
    constructor() {
        this.subscriptions = new Map();
        this.eventSource = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    // Use Server-Sent Events for real-time updates (simpler than WebSockets)
    connect(userId, onMessage) {
        if (this.eventSource) {
            this.disconnect();
        }

        try {
            // Create EventSource connection for real-time updates
            this.eventSource = new EventSource(`${CHAT_API_URL}/chat/stream?user_id=${userId}`);

            this.eventSource.onopen = () => {
                this.connected = true;
                this.reconnectAttempts = 0;
                console.log('Chat real-time connection established');
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessage(data);
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('EventSource error:', error);
                this.connected = false;
                this.handleReconnect(userId, onMessage);
            };
        } catch (error) {
            console.error('Failed to connect to real-time chat:', error);
            this.handleReconnect(userId, onMessage);
        }
    }

    handleReconnect(userId, onMessage) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(userId, onMessage), delay);
        }
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.connected = false;
        this.subscriptions.clear();
    }

    subscribe(roomId, callback) {
        this.subscriptions.set(roomId, callback);
    }

    unsubscribe(roomId) {
        this.subscriptions.delete(roomId);
    }
}

class ChatWidget {
    constructor(options = {}) {
        this.currentUser = options.user || JSON.parse(localStorage.getItem('dearself_user') || '{}');
        this.isOpen = false;
        this.currentRoom = null;
        this.rooms = [];
        this.messages = [];
        this.pollInterval = null;
        this.container = null;
        this.realtimeManager = new RealtimeChatManager();
        this.lastMessageId = null;
        this.typingUsers = new Set();
        this.typingTimeout = null;

        this.init();
    }

    init() {
        if (!this.currentUser || !this.currentUser.id) {
            console.warn('Chat widget requires a logged-in user');
            return;
        }

        this.createWidget();
        this.loadRooms();
        this.setupRealtime();
        this.startPolling();
    }

    setupRealtime() {
        // Connect to real-time updates
        this.realtimeManager.connect(this.currentUser.id, (data) => {
            this.handleRealtimeEvent(data);
        });
    }

    handleRealtimeEvent(data) {
        switch (data.type) {
            case 'connected':
                console.log('Chat real-time connected');
                break;

            case 'message':
                const msg = data.data;
                // Check if message belongs to current room
                if (this.currentRoom === msg.room_id) {
                    this.messages.push(msg);
                    this.renderMessages();
                    this.scrollToBottom();
                    this.markAsRead(msg.id);
                }
                this.loadUnreadCounts();
                // Show notification if not in the room
                if (this.currentRoom !== msg.room_id && msg.sender_id !== this.currentUser.id) {
                    this.showNotification(msg);
                }
                break;

            case 'typing':
                const typingData = data.data;
                if (Array.isArray(typingData)) {
                    typingData.forEach(t => {
                        if (t.room_id === this.currentRoom && t.user_id !== this.currentUser.id) {
                            if (t.is_typing) {
                                this.typingUsers.add(t.user_name || 'Someone');
                            } else {
                                this.typingUsers.delete(t.user_name || 'Someone');
                            }
                        }
                    });
                    this.updateTypingIndicator();
                }
                break;

            case 'message_read':
                // Update read status in UI if needed
                break;

            case 'room_updated':
                this.loadRooms();
                break;
        }
    }

    showNotification(message) {
        // Create browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`New message from ${message.sender?.name || 'Unknown'}`, {
                body: message.message?.substring(0, 100),
                icon: '/favicon.ico'
            });
        }
    }

    handleTypingIndicator(data) {
        if (data.room_id === this.currentRoom && data.user_id !== this.currentUser.id) {
            if (data.is_typing) {
                this.typingUsers.add(data.user_name || 'Someone');
            } else {
                this.typingUsers.delete(data.user_name || 'Someone');
            }
            this.updateTypingIndicator();
        }
    }

    updateTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (!indicator) return;

        if (this.typingUsers.size > 0) {
            const users = Array.from(this.typingUsers);
            const text = users.length === 1
                ? `${users[0]} is typing...`
                : `${users.slice(0, 2).join(' and ')} are typing...`;
            indicator.textContent = text;
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    }

    createWidget() {
        // Create widget container
        const html = `
            <div id="chat-widget-container" class="chat-widget">
                <!-- Chat Toggle Button -->
                <button id="chat-toggle-btn" class="chat-toggle-btn" onclick="chatWidget.toggle()">
                    <i class="fas fa-comments"></i>
                    <span class="chat-notification-badge" id="chat-badge" style="display: none;">0</span>
                </button>

                <!-- Chat Window -->
                <div id="chat-window" class="chat-window">
                    <!-- Chat Header -->
                    <div class="chat-header">
                        <div class="chat-header-title">
                            <i class="fas fa-comments"></i>
                            <span id="chat-current-room">Messages</span>
                            <span class="chat-online-indicator" id="chat-online" style="display: none;">
                                <i class="fas fa-circle"></i>
                            </span>
                        </div>
                        <div class="chat-header-actions">
                            <button onclick="chatWidget.showRooms()" title="All Rooms">
                                <i class="fas fa-list"></i>
                            </button>
                            <button onclick="chatWidget.minimize()" title="Minimize">
                                <i class="fas fa-minus"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Rooms View -->
                    <div id="chat-rooms-view" class="chat-rooms-view">
                        <div class="chat-rooms-list" id="chat-rooms-list">
                            <!-- Rooms loaded dynamically -->
                        </div>
                    </div>

                    <!-- Messages View -->
                    <div id="chat-messages-view" class="chat-messages-view" style="display: none;">
                        <button class="chat-back-btn" onclick="chatWidget.showRooms()">
                            <i class="fas fa-arrow-left"></i> Back to Rooms
                        </button>
                        <div class="chat-messages-container" id="chat-messages">
                            <!-- Messages loaded dynamically -->
                        </div>
                        <div id="typing-indicator" class="typing-indicator"></div>
                        <div class="chat-input-container">
                            <input type="text" id="chat-input" placeholder="Type a message..." onkeypress="chatWidget.handleKeyPress(event)">
                            <button id="chat-send-btn" onclick="chatWidget.sendMessage()">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Append to body
        document.body.insertAdjacentHTML('beforeend', html);
        this.container = document.getElementById('chat-widget-container');
    }

    async loadRooms() {
        try {
            const response = await fetch(`${CHAT_API_URL}/chat/rooms?user_role=${this.currentUser.role}`);
            const rooms = await response.json();

            this.rooms = rooms;
            this.renderRooms();
            this.loadUnreadCounts();
        } catch (error) {
            console.error('Failed to load rooms:', error);
        }
    }

    renderRooms() {
        const roomsList = document.getElementById('chat-rooms-list');
        if (!roomsList) return;

        if (!this.rooms.length) {
            roomsList.innerHTML = `
                <div class="chat-empty">
                    <i class="fas fa-comments"></i>
                    <p>No chat rooms available</p>
                </div>
            `;
            return;
        }

        roomsList.innerHTML = this.rooms.map(room => `
            <div class="chat-room-item" onclick="chatWidget.openRoom('${room.id}', '${room.name}')">
                <div class="chat-room-icon">
                    <i class="fas ${this.getRoomIcon(room.room_type)}"></i>
                </div>
                <div class="chat-room-info">
                    <div class="chat-room-name">${room.name}</div>
                    <div class="chat-room-desc">${room.description || room.room_type}</div>
                </div>
                <span class="chat-room-unread" id="room-unread-${room.id}" style="display: none;">0</span>
            </div>
        `).join('');

        // Load unread counts for each room
        this.loadUnreadCounts();
    }

    getRoomIcon(roomType) {
        switch (roomType) {
            case 'admin': return 'fa-lock';
            case 'staff': return 'fa-users';
            case 'support': return 'fa-headset';
            default: return 'fa-hashtag';
        }
    }

    async loadUnreadCounts() {
        try {
            const response = await fetch(`${CHAT_API_URL}/chat/unread?user_id=${this.currentUser.id}`);
            const counts = await response.json();

            counts.forEach(item => {
                const badge = document.getElementById(`room-unread-${item.room_id}`);
                if (badge) {
                    if (item.unread > 0) {
                        badge.textContent = item.unread > 99 ? '99+' : item.unread;
                        badge.style.display = 'inline';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            });

            // Update main badge
            const totalUnread = counts.reduce((sum, item) => sum + item.unread, 0);
            this.updateBadge(totalUnread);
        } catch (error) {
            console.error('Failed to load unread counts:', error);
        }
    }

    updateBadge(count) {
        const badge = document.getElementById('chat-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    async openRoom(roomId, roomName) {
        this.currentRoom = roomId;
        document.getElementById('chat-current-room').textContent = roomName;

        // Hide rooms, show messages
        document.getElementById('chat-rooms-view').style.display = 'none';
        document.getElementById('chat-messages-view').style.display = 'flex';

        await this.loadMessages(roomId);
    }

    async loadMessages(roomId) {
        try {
            const response = await fetch(`${CHAT_API_URL}/chat/rooms/${roomId}/messages`);
            const messages = await response.json();

            this.messages = messages;
            this.renderMessages();

            // Mark messages as read
            messages.forEach(msg => {
                if (msg.sender_id !== this.currentUser.id) {
                    this.markAsRead(msg.id);
                }
            });

            // Scroll to bottom
            this.scrollToBottom();
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    renderMessages() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        if (!this.messages.length) {
            messagesContainer.innerHTML = `
                <div class="chat-empty">
                    <i class="fas fa-comment-slash"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = this.messages.map(msg => {
            const isOwn = msg.sender_id === this.currentUser.id;
            const senderName = msg.sender?.name || 'Unknown';
            const time = this.formatTime(msg.created_at);

            return `
                <div class="chat-message ${isOwn ? 'own' : 'other'}">
                    <div class="chat-message-avatar">
                        ${isOwn ? this.currentUser.name?.charAt(0).toUpperCase() : senderName?.charAt(0).toUpperCase()}
                    </div>
                    <div class="chat-message-content">
                        <div class="chat-message-header">
                            <span class="chat-message-sender">${isOwn ? 'You' : senderName}</span>
                            <span class="chat-message-time">${time}</span>
                        </div>
                        <div class="chat-message-text">${this.escapeHtml(msg.message)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showRooms() {
        this.currentRoom = null;
        document.getElementById('chat-current-room').textContent = 'Messages';
        document.getElementById('chat-rooms-view').style.display = 'block';
        document.getElementById('chat-messages-view').style.display = 'none';
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message || !this.currentRoom) return;

        input.value = '';

        try {
            const response = await fetch(`${CHAT_API_URL}/chat/rooms/${this.currentRoom}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender_id: this.currentUser.id,
                    message: message
                })
            });

            const newMessage = await response.json();

            this.messages.push(newMessage);
            this.renderMessages();
            this.scrollToBottom();
        } catch (error) {
            console.error('Failed to send message:', error);
            input.value = message; // Restore message on error
        }
    }

    async markAsRead(messageId) {
        try {
            await fetch(`${CHAT_API_URL}/chat/messages/${messageId}/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: this.currentUser.id })
            });
        } catch (error) {
            // Ignore read errors
        }
    }

    handleKeyPress(event) {
        if (event.key === 'Enter') {
            this.sendMessage();
        } else {
            // Send typing indicator
            this.sendTypingIndicator(true);
        }
    }

    sendTypingIndicator(isTyping) {
        // Clear previous timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // If stopped typing, send false
        if (!isTyping) {
            this.broadcastTyping(false);
            return;
        }

        // Send typing true and set timeout to auto-stop
        this.broadcastTyping(true);
        this.typingTimeout = setTimeout(() => {
            this.broadcastTyping(false);
        }, 3000);
    }

    broadcastTyping(isTyping) {
        // This would normally be sent via WebSocket/EventSource
        // For now, we'll just manage it locally
        if (!isTyping) {
            this.typingUsers.clear();
            this.updateTypingIndicator();
        }
    }

    toggle() {
        this.isOpen = !this.isOpen;
        const chatWindow = document.getElementById('chat-window');
        const toggleBtn = document.getElementById('chat-toggle-btn');

        if (this.isOpen) {
            chatWindow.classList.add('open');
            toggleBtn.classList.add('active');
        } else {
            chatWindow.classList.remove('open');
            toggleBtn.classList.remove('active');
        }
    }

    minimize() {
        this.isOpen = false;
        document.getElementById('chat-window').classList.remove('open');
        document.getElementById('chat-toggle-btn').classList.remove('active');
    }

    scrollToBottom() {
        const container = document.getElementById('chat-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    formatTime(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        // Less than 24 hours - show time
        if (diff < 86400000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        // Less than 7 days - show day name
        if (diff < 604800000) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }
        // Otherwise show date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    startPolling() {
        // Poll for new messages every 5 seconds when a room is open
        this.pollInterval = setInterval(() => {
            if (this.currentRoom) {
                this.loadMessages(this.currentRoom);
            }
            this.loadUnreadCounts();
        }, 5000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    destroy() {
        this.stopPolling();
        if (this.container) {
            this.container.remove();
        }
    }
}

// Initialize chat widget when DOM is ready
let chatWidget = null;

function initChatWidget() {
    const user = JSON.parse(localStorage.getItem('dearself_user') || '{}');
    if (user && user.id) {
        chatWidget = new ChatWidget({ user });
    }
}

// Auto-initialize if user is logged in
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
} else {
    initChatWidget();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChatWidget, chatWidget };
}
