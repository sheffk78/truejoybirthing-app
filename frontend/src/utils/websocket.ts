// WebSocket utility for real-time messaging

type MessageHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private token: string | null = null;
  private baseUrl: string;

  constructor() {
    // Convert HTTP URL to WebSocket URL
    const apiUrl = process.env.EXPO_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || '';
    this.baseUrl = apiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
  }

  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.token = token;
    const wsUrl = `${this.baseUrl}/ws/messages/${token}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyHandlers(data.type, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code);
        this.stopPingInterval();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.token) {
      console.log('Max reconnect attempts reached or no token');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
    
    setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  disconnect() {
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.token = null;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  subscribe(eventType: string, handler: MessageHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  private notifyHandlers(eventType: string, data: any) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
    
    // Also notify 'all' handlers
    const allHandlers = this.handlers.get('all');
    if (allHandlers) {
      allHandlers.forEach(handler => handler(data));
    }
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();
export default wsClient;
