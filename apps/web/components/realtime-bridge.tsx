'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { BASE_URL } from '@/lib/sdk';
import { useSession } from '@/lib/store';

interface DomainEvent {
  id: string;
  type: string;
  propertyId: string | null;
  aggregateType: string;
  aggregateId: string;
}

function keysFor(event: DomainEvent): unknown[][] {
  if (
    event.type.startsWith('reservation.') ||
    event.type.startsWith('group.') ||
    event.type === 'room.assigned' ||
    event.type === 'room.moved'
  ) {
    return [
      ['arrivals'],
      ['departures'],
      ['in-house'],
      ['room-rack'],
      ['available-rooms'],
      ['reservation'],
      ['group-blocks'],
      ['manager-flash'],
    ];
  }
  if (event.type.startsWith('housekeeping.') || event.type === 'room.status_changed') {
    return [['hk-board'], ['hk-tasks'], ['arrivals'], ['available-rooms'], ['room-rack']];
  }
  if (
    event.type.startsWith('folio.') ||
    event.type.startsWith('payment.') ||
    event.type.startsWith('deposit.') ||
    event.type.startsWith('cashier.') ||
    event.type.startsWith('pos.')
  ) {
    return [
      ['folio'],
      ['folios'],
      ['deposits'],
      ['arrivals'],
      ['departures'],
      ['in-house'],
      ['manager-flash'],
    ];
  }
  if (event.type.startsWith('availability.') || event.type.startsWith('rate.')) {
    return [['availability'], ['available-rooms'], ['room-rack'], ['manager-flash']];
  }
  return [['manager-flash']];
}

/**
 * Event-driven cache invalidation for the Desk. Socket.IO is the primary transport (docs 04/08);
 * SSE remains as a compatibility fallback while deployments roll forward.
 */
export function RealtimeBridge() {
  const queryClient = useQueryClient();
  const token = useSession((s) => s.token);
  const propertyId = useSession((s) => s.activePropertyId);

  useEffect(() => {
    if (!token || !propertyId) return;
    let source: EventSource | undefined;
    const socket: Socket = io(`${BASE_URL}/realtime`, {
      auth: { token, propertyId },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    let fallbackStarted = false;

    const onDomainEvent = (event: DomainEvent) => {
      if (event.propertyId && event.propertyId !== propertyId) return;
      for (const queryKey of keysFor(event)) {
        queryClient.invalidateQueries({ queryKey });
      }
    };

    const startFallback = () => {
      if (fallbackStarted || socket.connected) return;
      fallbackStarted = true;
      const url = new URL(`${BASE_URL}/v1/realtime/events`);
      url.searchParams.set('token', token);
      url.searchParams.set('propertyId', propertyId);
      source = new EventSource(url.toString(), { withCredentials: true });
      source.addEventListener('domain-event', (message: MessageEvent<string>) => {
        onDomainEvent(JSON.parse(message.data) as DomainEvent);
      });
    };

    socket.on('domain-event', onDomainEvent);
    socket.on('connect', () => source?.close());
    socket.on('connect_error', startFallback);
    const fallbackTimer = window.setTimeout(startFallback, 1500);

    return () => {
      window.clearTimeout(fallbackTimer);
      source?.close();
      socket?.off('domain-event', onDomainEvent);
      socket?.off('connect_error', startFallback);
      socket?.disconnect();
    };
  }, [propertyId, queryClient, token]);

  return null;
}
