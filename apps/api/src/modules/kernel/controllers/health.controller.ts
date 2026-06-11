import { Controller, Get } from '@nestjs/common';
import { Public } from '../permissions/decorators';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  health(): { status: string; service: string } {
    return { status: 'ok', service: 'vela-api' };
  }
}
