import Redis from 'ioredis';
import { WebSocket } from 'ws';
import { logger } from '../utils/logger';

export interface CollaboratorInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  cursor?: { x: number; y: number };
  selection?: string[];
  color: string;
}

export interface CollaborationRoom {
  id: string;
  workflowId: string;
  participants: Map<string, CollaboratorInfo>;
  lastActivity: Date;
}

export interface CollaborationEvent {
  type: 'join' | 'leave' | 'cursor' | 'selection' | 'change';
  userId: string;
  roomId: string;
  data?: any;
  timestamp: number;
}

export class CollaborationService {
  private redis: Redis;
  private pubClient: Redis;
  private subClient: Redis;
  private rooms: Map<string, CollaborationRoom>;
  private connections: Map<string, WebSocket>;
  private userColors: string[] = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  ];

  constructor(redis: Redis) {
    this.redis = redis;
    this.pubClient = redis.duplicate();
    this.subClient = redis.duplicate();
    this.rooms = new Map();
    this.connections = new Map();
  }

  async initialize(): Promise<void> {
    // Subscribe to collaboration events
    await this.subClient.subscribe('collaboration:events');
    
    this.subClient.on('message', (channel, message) => {
      if (channel === 'collaboration:events') {
        this.handleCollaborationEvent(JSON.parse(message));
      }
    });

    logger.info('CollaborationService initialized');
  }

  handleWebSocketConnection(ws: WebSocket, request: any): void {
    const userId = this.extractUserId(request);
    if (!userId) {
      ws.close(1008, 'User ID required');
      return;
    }

    logger.info('WebSocket connection established', { userId });
    this.connections.set(userId, ws);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleWebSocketMessage(userId, message);
      } catch (error) {
        logger.error('Invalid WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(userId);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', { userId, error });
    });

    // Send initial connection success
    ws.send(JSON.stringify({
      type: 'connected',
      userId,
      timestamp: Date.now(),
    }));
  }

  private async handleWebSocketMessage(userId: string, message: any): Promise<void> {
    const { type, roomId, data } = message;

    switch (type) {
      case 'join':
        await this.joinRoom(userId, roomId, data);
        break;
      case 'leave':
        await this.leaveRoom(userId, roomId);
        break;
      case 'cursor':
        await this.updateCursor(userId, roomId, data);
        break;
      case 'selection':
        await this.updateSelection(userId, roomId, data);
        break;
      case 'change':
        await this.broadcastChange(userId, roomId, data);
        break;
      default:
        logger.warn('Unknown message type:', type);
    }
  }

  private async joinRoom(userId: string, roomId: string, userInfo: any): Promise<void> {
    let room = this.rooms.get(roomId);
    
    if (!room) {
      room = {
        id: roomId,
        workflowId: roomId, // For now, room ID is workflow ID
        participants: new Map(),
        lastActivity: new Date(),
      };
      this.rooms.set(roomId, room);
    }

    const collaborator: CollaboratorInfo = {
      id: userId,
      name: userInfo.name || 'Anonymous',
      email: userInfo.email || '',
      avatar: userInfo.avatar,
      color: this.userColors[room.participants.size % this.userColors.length],
    };

    room.participants.set(userId, collaborator);
    room.lastActivity = new Date();

    // Store in Redis for persistence
    await this.redis.hset(
      `room:${roomId}:participants`,
      userId,
      JSON.stringify(collaborator)
    );

    // Notify all participants
    const event: CollaborationEvent = {
      type: 'join',
      userId,
      roomId,
      data: collaborator,
      timestamp: Date.now(),
    };

    await this.publishEvent(event);
    
    // Send current participants to the new user
    const ws = this.connections.get(userId);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'room_state',
        roomId,
        participants: Array.from(room.participants.values()),
      }));
    }

    logger.info('User joined room', { userId, roomId, participants: room.participants.size });
  }

  private async leaveRoom(userId: string, roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.delete(userId);
    room.lastActivity = new Date();

    // Remove from Redis
    await this.redis.hdel(`room:${roomId}:participants`, userId);

    // Clean up empty rooms
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      await this.redis.del(`room:${roomId}:participants`);
    }

    // Notify remaining participants
    const event: CollaborationEvent = {
      type: 'leave',
      userId,
      roomId,
      timestamp: Date.now(),
    };

    await this.publishEvent(event);
    
    logger.info('User left room', { userId, roomId, remaining: room.participants.size });
  }

  private async updateCursor(userId: string, roomId: string, cursor: { x: number; y: number }): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(userId);
    if (participant) {
      participant.cursor = cursor;
      room.lastActivity = new Date();

      // Broadcast to other participants
      const event: CollaborationEvent = {
        type: 'cursor',
        userId,
        roomId,
        data: cursor,
        timestamp: Date.now(),
      };

      await this.publishEvent(event);
    }
  }

  private async updateSelection(userId: string, roomId: string, selection: string[]): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(userId);
    if (participant) {
      participant.selection = selection;
      room.lastActivity = new Date();

      // Broadcast to other participants
      const event: CollaborationEvent = {
        type: 'selection',
        userId,
        roomId,
        data: selection,
        timestamp: Date.now(),
      };

      await this.publishEvent(event);
    }
  }

  private async broadcastChange(userId: string, roomId: string, change: any): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.lastActivity = new Date();

    // Store change in Redis for conflict resolution
    const changeId = `${Date.now()}-${userId}`;
    await this.redis.zadd(
      `room:${roomId}:changes`,
      Date.now(),
      JSON.stringify({ id: changeId, userId, change })
    );

    // Broadcast to all participants
    const event: CollaborationEvent = {
      type: 'change',
      userId,
      roomId,
      data: change,
      timestamp: Date.now(),
    };

    await this.publishEvent(event);
    
    logger.debug('Change broadcasted', { userId, roomId, changeType: change.type });
  }

  private async publishEvent(event: CollaborationEvent): Promise<void> {
    await this.pubClient.publish('collaboration:events', JSON.stringify(event));
  }

  private handleCollaborationEvent(event: CollaborationEvent): void {
    const room = this.rooms.get(event.roomId);
    if (!room) return;

    // Send to all participants except the sender
    room.participants.forEach((participant, participantId) => {
      if (participantId !== event.userId) {
        const ws = this.connections.get(participantId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(event));
        }
      }
    });
  }

  private handleDisconnect(userId: string): void {
    logger.info('WebSocket disconnected', { userId });
    
    // Remove from all rooms
    this.rooms.forEach((room, roomId) => {
      if (room.participants.has(userId)) {
        this.leaveRoom(userId, roomId);
      }
    });

    this.connections.delete(userId);
  }

  private extractUserId(request: any): string | null {
    // Extract user ID from JWT token or session
    // This is a simplified version
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    
    try {
      // Decode JWT to get user ID
      // In production, properly verify the token
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return decoded.id;
    } catch {
      return null;
    }
  }

  async getActiveRooms(): Promise<CollaborationRoom[]> {
    return Array.from(this.rooms.values());
  }

  async getRoomParticipants(roomId: string): Promise<CollaboratorInfo[]> {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.participants.values()) : [];
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down CollaborationService');
    
    // Close all WebSocket connections
    this.connections.forEach((ws) => {
      ws.close(1000, 'Server shutting down');
    });

    // Unsubscribe from Redis
    await this.subClient.unsubscribe();
    await this.pubClient.quit();
    await this.subClient.quit();
  }
}