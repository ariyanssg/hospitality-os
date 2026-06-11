import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  DATABASE_URL: z.string().default('postgres://vela_app:vela_app@localhost:5432/vela'),
  DATABASE_ADMIN_URL: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  BETTER_AUTH_SECRET: z.string().default('dev-secret-change-me'),
  BETTER_AUTH_URL: z.string().default('http://localhost:4000'),
  API_PORT: z.coerce.number().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;
export function env(): Env {
  if (!cached) cached = EnvSchema.parse(process.env);
  return cached;
}
