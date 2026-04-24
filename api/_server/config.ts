const databaseEnvCandidates = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

function findServerEnv(names: readonly string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

export function getServerEnv(name: "JWT_SECRET") {
  return findServerEnv([name]);
}

export const serverConfig = {
  databaseUrl: () => findServerEnv(databaseEnvCandidates),
  useDatabaseSsl: process.env.DATABASE_SSL !== "false",
  jwtSecret: () => getServerEnv("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
