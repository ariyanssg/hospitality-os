import { Module } from '@nestjs/common';
import { GlService } from './gl.service';

@Module({
  providers: [GlService],
  exports: [GlService],
})
export class GlModule {}
