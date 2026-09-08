/**
 * auth.ts — JWT issue and verify helpers
 *
 * Tokens expire in 1 hour. In production, use a proper user store
 * (LDAP, IAM) instead of the hardcoded demo credentials below.
 */

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    "FATAL: JWT_SECRET must be set and at least 32 characters long"
  );
  process.exit(1);
}

export interface TokenPayload {
  sub: string;      // user id
  username: string;
  iat?: number;
  exp?: number;
}

// Demo user store — replace with a real database (LDAP, IAM) in production.
// Passwords are loaded from environment variables; the app will not start
// unless both DEMO_USER_PASSWORD and ALICE_USER_PASSWORD are set.
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD;
const ALICE_USER_PASSWORD = process.env.ALICE_USER_PASSWORD;
if (!DEMO_USER_PASSWORD || !ALICE_USER_PASSWORD) {
  console.error(
    "FATAL: DEMO_USER_PASSWORD and ALICE_USER_PASSWORD must be set as environment variables"
  );
  process.exit(1);
}

const DEMO_USERS: Record<string, { password: string; id: string }> = {
  demo:  { password: DEMO_USER_PASSWORD,  id: "user-001" },
  alice: { password: ALICE_USER_PASSWORD, id: "user-002" },
};

/**
 * Validate credentials and return a signed JWT, or null if invalid.
 */
export function issueToken(username: string, password: string): string | null {
  const user = DEMO_USERS[username];
  if (!user || user.password !== password) return null;

  const payload: TokenPayload = { sub: user.id, username };
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: "1h" });
}

/**
 * Verify a Bearer token string.
 * Returns the decoded payload or throws if invalid/expired.
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET as string) as TokenPayload;
}
