export * from './taxonomy';
export * from './envelope';

/** Redis Stream key for a tenant's event transport (doc 04 §4, doc 05 §2 key prefixing). */
export function streamKey(tenantId: string): string {
  return `t:${tenantId}:events`;
}

/** Socket.IO room name scoped tenant→property→topic (doc 08 §9). */
export function realtimeRoom(tenantId: string, propertyId: string, topic: string): string {
  return `tenant:${tenantId}:property:${propertyId}:${topic}`;
}
