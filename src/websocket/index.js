import { Elysia } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import env from '../utils/env.js';

// Store active connections
const connections = new Map();
const rooms = new Map();

// WebSocket message types
const MESSAGE_TYPES = {
    // Connection
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ERROR: 'error',
    PING: 'ping',
    PONG: 'pong',

    // Watch Party
    PARTY_CREATE: 'party:create',
    PARTY_JOIN: 'party:join',
    PARTY_LEAVE: 'party:leave',
    PARTY_PLAY: 'party:play',
    PARTY_PAUSE: 'party:pause',
    PARTY_SEEK: 'party:seek',
    PARTY_SYNC: 'party:sync',
    PARTY_CHAT: 'party:chat',
    PARTY_USERS: 'party:users',

    // Real-time notifications
    NOTIFICATION: 'notification',
    SUBSCRIPTION_UPDATE: 'subscription:update',
    PROFILE_UPDATE: 'profile:update'
};

// Watch Party Room class
class WatchPartyRoom {
    constructor(id, hostId) {
        this.id = id;
        this.hostId = hostId;
        this.users = new Map();
        this.playbackState = {
            isPlaying: false,
            currentTime: 0,
            playlistId: null,
            itemId: null,
            lastSync: Date.now()
        };
        this.chatHistory = [];
        this.maxChatHistory = 100;
    }

    addUser(userId, ws, userData) {
        this.users.set(userId, {
            ws,
            ...userData,
            joinedAt: Date.now()
        });

        // Send current state to new user
        this.sendToUser(userId, {
            type: MESSAGE_TYPES.PARTY_SYNC,
            data: {
                playbackState: this.playbackState,
                users: this.getUserList(),
                chatHistory: this.chatHistory.slice(-20) // Last 20 messages
            }
        });

        // Notify others
        this.broadcast({
            type: MESSAGE_TYPES.PARTY_USERS,
            data: {
                action: 'joined',
                user: userData,
                users: this.getUserList()
            }
        }, userId);
    }

    removeUser(userId) {
        const user = this.users.get(userId);
        if (!user) return;

        this.users.delete(userId);

        // Notify others
        this.broadcast({
            type: MESSAGE_TYPES.PARTY_USERS,
            data: {
                action: 'left',
                user: { id: userId, name: user.name },
                users: this.getUserList()
            }
        });

        // If host left, assign new host
        if (userId === this.hostId && this.users.size > 0) {
            this.hostId = this.users.keys().next().value;
            this.broadcast({
                type: MESSAGE_TYPES.PARTY_USERS,
                data: {
                    action: 'host_changed',
                    newHostId: this.hostId,
                    users: this.getUserList()
                }
            });
        }
    }

    updatePlayback(userId, action, data) {
        // Only host can control playback
        if (userId !== this.hostId) {
            this.sendToUser(userId, {
                type: MESSAGE_TYPES.ERROR,
                data: { message: 'Only the host can control playback' }
            });
            return;
        }

        switch (action) {
            case 'play':
                this.playbackState.isPlaying = true;
                this.playbackState.currentTime = data.currentTime || this.playbackState.currentTime;
                break;
            case 'pause':
                this.playbackState.isPlaying = false;
                this.playbackState.currentTime = data.currentTime || this.playbackState.currentTime;
                break;
            case 'seek':
                this.playbackState.currentTime = data.currentTime;
                break;
        }

        this.playbackState.lastSync = Date.now();

        // Broadcast to all users
        this.broadcast({
            type: MESSAGE_TYPES[`PARTY_${action.toUpperCase()}`],
            data: this.playbackState
        });
    }

    sendChatMessage(userId, message) {
        const user = this.users.get(userId);
        if (!user) return;

        const chatMessage = {
            id: crypto.randomUUID(),
            userId,
            userName: user.name,
            message: message.substring(0, 500), // Limit message length
            timestamp: Date.now()
        };

        this.chatHistory.push(chatMessage);

        // Keep chat history limited
        if (this.chatHistory.length > this.maxChatHistory) {
            this.chatHistory.shift();
        }

        // Broadcast to all users
        this.broadcast({
            type: MESSAGE_TYPES.PARTY_CHAT,
            data: chatMessage
        });
    }

    getUserList() {
        return Array.from(this.users.entries()).map(([id, user]) => ({
            id,
            name: user.name,
            isHost: id === this.hostId,
            joinedAt: user.joinedAt
        }));
    }

    sendToUser(userId, message) {
        const user = this.users.get(userId);
        if (user && user.ws.readyState === 1) {
            user.ws.send(JSON.stringify(message));
        }
    }

    broadcast(message, excludeUserId = null) {
        const messageStr = JSON.stringify(message);
        this.users.forEach((user, userId) => {
            if (userId !== excludeUserId && user.ws.readyState === 1) {
                user.ws.send(messageStr);
            }
        });
    }
}

// WebSocket plugin
export const websocketPlugin = new Elysia({ prefix: '/ws' })
    .use(authPlugin)
    .ws('/connect', {
        // Validate connection
        async beforeHandle({ request, set }) {
            // Extract auth token from query or headers
            const token = new URL(request.url).searchParams.get('token') ||
                request.headers.get('authorization')?.replace('Bearer ', '');

            if (!token) {
                set.status = 401;
                return 'Authentication required';
            }

            // Verify token (would use actual JWT verification)
            // const user = await verifyToken(token);
            // if (!user) {
            //   set.status = 401;
            //   return 'Invalid token';
            // }

            return true;
        },

        // Handle new connection
        open(ws) {
            const userId = ws.data.userId || crypto.randomUUID();
            const connectionId = crypto.randomUUID();

            // Store connection
            connections.set(connectionId, {
                ws,
                userId,
                connectedAt: Date.now(),
                currentRoom: null
            });

            // Send connection confirmation
            ws.send(JSON.stringify({
                type: MESSAGE_TYPES.CONNECT,
                data: {
                    connectionId,
                    userId,
                    timestamp: Date.now()
                }
            }));

            console.log(`WebSocket connected: ${connectionId} (User: ${userId})`);
        },

        // Handle messages
        message(ws, message) {
            const connection = Array.from(connections.values()).find(c => c.ws === ws);
            if (!connection) return;

            try {
                const data = JSON.parse(message);
                handleWebSocketMessage(connection, data);
            } catch (error) {
                ws.send(JSON.stringify({
                    type: MESSAGE_TYPES.ERROR,
                    data: { message: 'Invalid message format' }
                }));
            }
        },

        // Handle disconnection
        close(ws) {
            const connection = Array.from(connections.entries()).find(([, c]) => c.ws === ws);
            if (!connection) return;

            const [connectionId, conn] = connection;

            // Leave current room if in one
            if (conn.currentRoom) {
                const room = rooms.get(conn.currentRoom);
                if (room) {
                    room.removeUser(conn.userId);
                    if (room.users.size === 0) {
                        rooms.delete(conn.currentRoom);
                        console.log(`Room ${conn.currentRoom} closed (empty)`);
                    }
                }
            }

            // Remove connection
            connections.delete(connectionId);
            console.log(`WebSocket disconnected: ${connectionId}`);
        },

        // Handle errors
        error(ws, error) {
            console.error('WebSocket error:', error);
            ws.send(JSON.stringify({
                type: MESSAGE_TYPES.ERROR,
                data: { message: 'An error occurred' }
            }));
        }
    });

// Handle WebSocket messages
function handleWebSocketMessage(connection, message) {
    const { type, data } = message;

    switch (type) {
        case MESSAGE_TYPES.PING:
            connection.ws.send(JSON.stringify({ type: MESSAGE_TYPES.PONG, timestamp: Date.now() }));
            break;

        case MESSAGE_TYPES.PARTY_CREATE:
            handlePartyCreate(connection, data);
            break;

        case MESSAGE_TYPES.PARTY_JOIN:
            handlePartyJoin(connection, data);
            break;

        case MESSAGE_TYPES.PARTY_LEAVE:
            handlePartyLeave(connection);
            break;

        case MESSAGE_TYPES.PARTY_PLAY:
        case MESSAGE_TYPES.PARTY_PAUSE:
        case MESSAGE_TYPES.PARTY_SEEK:
            handlePlaybackControl(connection, type.split(':')[1], data);
            break;

        case MESSAGE_TYPES.PARTY_CHAT:
            handleChatMessage(connection, data);
            break;

        default:
            connection.ws.send(JSON.stringify({
                type: MESSAGE_TYPES.ERROR,
                data: { message: `Unknown message type: ${type}` }
            }));
    }
}

// Party handlers
function handlePartyCreate(connection, data) {
    const roomId = `party_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const room = new WatchPartyRoom(roomId, connection.userId);

    rooms.set(roomId, room);
    room.addUser(connection.userId, connection.ws, {
        id: connection.userId,
        name: data.userName || 'User'
    });

    connection.currentRoom = roomId;

    connection.ws.send(JSON.stringify({
        type: MESSAGE_TYPES.PARTY_CREATE,
        data: {
            roomId,
            isHost: true
        }
    }));

    console.log(`Party created: ${roomId} by ${connection.userId}`);
}

function handlePartyJoin(connection, data) {
    const { roomId, userName } = data;
    const room = rooms.get(roomId);

    if (!room) {
        connection.ws.send(JSON.stringify({
            type: MESSAGE_TYPES.ERROR,
            data: { message: 'Room not found' }
        }));
        return;
    }

    // Leave current room if in one
    if (connection.currentRoom && connection.currentRoom !== roomId) {
        handlePartyLeave(connection);
    }

    room.addUser(connection.userId, connection.ws, {
        id: connection.userId,
        name: userName || 'User'
    });

    connection.currentRoom = roomId;

    console.log(`User ${connection.userId} joined party ${roomId}`);
}

function handlePartyLeave(connection) {
    if (!connection.currentRoom) return;

    const room = rooms.get(connection.currentRoom);
    if (room) {
        room.removeUser(connection.userId);
        if (room.users.size === 0) {
            rooms.delete(connection.currentRoom);
            console.log(`Room ${connection.currentRoom} closed (empty)`);
        }
    }

    connection.currentRoom = null;
    connection.ws.send(JSON.stringify({
        type: MESSAGE_TYPES.PARTY_LEAVE,
        data: { success: true }
    }));
}

function handlePlaybackControl(connection, action, data) {
    if (!connection.currentRoom) {
        connection.ws.send(JSON.stringify({
            type: MESSAGE_TYPES.ERROR,
            data: { message: 'Not in a room' }
        }));
        return;
    }

    const room = rooms.get(connection.currentRoom);
    if (room) {
        room.updatePlayback(connection.userId, action, data);
    }
}

function handleChatMessage(connection, data) {
    if (!connection.currentRoom) {
        connection.ws.send(JSON.stringify({
            type: MESSAGE_TYPES.ERROR,
            data: { message: 'Not in a room' }
        }));
        return;
    }

    const room = rooms.get(connection.currentRoom);
    if (room && data.message) {
        room.sendChatMessage(connection.userId, data.message);
    }
}

// Broadcast to specific users (for notifications)
export function broadcastToUser(userId, message) {
    connections.forEach(conn => {
        if (conn.userId === userId && conn.ws.readyState === 1) {
            conn.ws.send(JSON.stringify(message));
        }
    });
}

// Broadcast to all connected users
export function broadcastToAll(message) {
    const messageStr = JSON.stringify(message);
    connections.forEach(conn => {
        if (conn.ws.readyState === 1) {
            conn.ws.send(messageStr);
        }
    });
}

// Get room statistics
export function getRoomStats() {
    return {
        totalRooms: rooms.size,
        totalConnections: connections.size,
        rooms: Array.from(rooms.entries()).map(([id, room]) => ({
            id,
            userCount: room.users.size,
            hostId: room.hostId,
            isPlaying: room.playbackState.isPlaying
        }))
    };
}

export default websocketPlugin;
