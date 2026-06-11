import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../permissions/decorators';
import { ZodValidationPipe } from '../http/zod-validation.pipe';
import { PasswordAuthService } from './password-auth.service';

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});
const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * First-party auth endpoints (doc 08 §6). Returns a session token the staff web app stores and
 * replays as cookie `vela_session` or `Authorization: Bearer`.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: PasswordAuthService) {}

  @Post('sign-up')
  @Public()
  async signUp(
    @Body(new ZodValidationPipe(SignUpSchema)) body: z.infer<typeof SignUpSchema>,
  ): Promise<{ userId: string; token: string }> {
    return this.auth.signUp(body);
  }

  @Post('sign-in')
  @Public()
  async signIn(
    @Body(new ZodValidationPipe(SignInSchema)) body: z.infer<typeof SignInSchema>,
  ): Promise<{ userId: string; token: string }> {
    return this.auth.signIn(body);
  }
}
