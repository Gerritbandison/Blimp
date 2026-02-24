/**
 * Global test setup — runs before every test file.
 *
 * Sets environment variables required by config.ts before any module is
 * imported, so the server boots in test mode without requiring a real DB or
 * production-strength secrets.
 */

// Must be set before config.ts is imported
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-ok!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/blimp_test';
process.env.CORS_ORIGIN = 'http://localhost:3000';
