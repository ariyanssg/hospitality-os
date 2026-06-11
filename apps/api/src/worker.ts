import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { runOutboxRelay } from './modules/kernel';

/**
 * The worker role (doc 04 §3 "one image, three roles"). For Phase 0 it runs the outbox relay;
 * BullMQ consumers (night audit scheduling, channel sync, notifications) attach here later.
 */
async function main(): Promise<void> {
  const logger = new Logger('Worker');
  logger.log('Starting worker role');
  await runOutboxRelay();
}

main().catch((err) => {
  new Logger('Worker').error(err);
  process.exit(1);
});
