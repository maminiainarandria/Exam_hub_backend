import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173'
};
