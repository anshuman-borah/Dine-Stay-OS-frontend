'use client';
import { useEffect, useRef } from 'react';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '@/store/auth.store';

let stompClient: Client | null = null;
let socketToken: string | null = null;

export function getStompClient(): Client {
  const { accessToken } = useAuthStore.getState();

  // If already connected with the current token, return the active client
  if (stompClient && socketToken === accessToken) return stompClient;

  // Cleanup old connection if token changed
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }

  socketToken = accessToken;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dinestay-backend-dubd.onrender.com';

  stompClient = new Client({
    webSocketFactory: () => new SockJS(`${API_URL}/ws?token=${accessToken}`),
    connectHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
    reconnectDelay: 2000,
    onConnect: () => {
      console.log('[STOMP] Connected to Spring WebSockets');
    },
    onStompError: (frame) => {
      console.error('[STOMP] Broker error:', frame.headers['message']);
    },
  });

  stompClient.activate();
  return stompClient;
}

export function useSocket(event: string, handler: (data: any) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const { branchId } = useAuthStore.getState();
    if (!branchId) return;

    const client = getStompClient();
    let subscription: StompSubscription | null = null;
    let isActive = true; // Cleanup flag

    // 🟢 MAGIC TRANSLATOR: Converts Socket.IO events to STOMP Topics
    // Example: 'order:created' -> '/topic/branch/{branchId}/order-created'
    const topicName = `/topic/branch/${branchId}/${event.replace(':', '-')}`;

    const attemptSubscription = () => {
      if (!isActive) return;
      
      if (client.connected) {
        subscription = client.subscribe(topicName, (message) => {
          if (message.body) {
            handlerRef.current(JSON.parse(message.body));
          }
        });
        console.log(`[STOMP] Subscribed to ${topicName}`);
      } else {
        // Wait 50ms and try again until connected
        setTimeout(attemptSubscription, 50);
      }
    };

    attemptSubscription();

    return () => {
      isActive = false;
      if (subscription) {
        subscription.unsubscribe();
        console.log(`[STOMP] Unsubscribed from ${topicName}`);
      }
    };
  }, [event]);

  // Handle Token Refreshes automatically
  useEffect(() => {
    return useAuthStore.subscribe((state, prev) => {
      if (state.accessToken !== prev.accessToken) {
        socketToken = null;
      }
    });
  }, []);
}

export function emitSocket(event: string, data: any) {
  // 🟢 Old Socket.IO needed 'join:branch' events to create rooms.
  // STOMP handles rooms natively via URL topics (/topic/branch/...).
  // This dummy function ensures your old React components don't crash!
  console.log('[STOMP] Ignored legacy emit (Room handled automatically):', event);
}

export function disconnectSocket() {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
    socketToken = null;
  }
}