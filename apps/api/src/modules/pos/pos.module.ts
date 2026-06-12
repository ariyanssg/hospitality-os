import { Module } from '@nestjs/common';
import { FolioModule } from '../folio';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  imports: [FolioModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
