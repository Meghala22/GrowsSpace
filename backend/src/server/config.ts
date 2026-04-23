const requiredServerEnv = ["DATABASE_URL", "JWT_SECRET"] as const;

export function getServerEnv(name: (typeof requiredServerEnv)[number]) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const serverConfig = {
  databaseUrl: () => getServerEnv("DATABASE_URL"),
  useDatabaseSsl: process.env.DATABASE_SSL !== "false",
  jwtSecret: () => getServerEnv("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
