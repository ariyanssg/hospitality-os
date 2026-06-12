import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { ProvisioningService } from './provisioning.service';

/**
 * Platform (superadmin) administration: hotel provisioning, cross-hotel user management, platform
 * RBAC, and hotel context switching. The ONLY module allowed to reach tenant tables through the
 * admin connection (via the kernel's PlatformUnitOfWork).
 */
@Module({
  controllers: [PlatformController],
  providers: [PlatformService, ProvisioningService],
})
export class PlatformModule {}
