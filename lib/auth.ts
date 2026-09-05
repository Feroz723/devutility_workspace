/**
 * Authentication — Owner Token
 * =============================
 * Simple shared-secret authentication for single-owner system.
 * Protects sensitive API routes server-side.
 */

import { NextRequest, NextResponse } from "next/server";

const OWNER_TOKEN_KEY = "OWNER_TOKEN";

export function getOwnerToken(): string | undefined {
  return process.env[OWNER_TOKEN_KEY];
}

/**
 * Check if the request has a valid owner token.
 * Token can be in:
 *   - X-Owner-Token header
 *   - Authorization: Bearer <token>
 */
export function extractToken(request: NextRequest): string | null {
  const headerToken = request.headers.get("x-owner-token");
  if (headerToken) return headerToken;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

export function isAuthenticated(request: NextRequest): boolean {
  const ownerToken = getOwnerToken();

  // If no token is configured, auth is disabled (development mode)
  if (!ownerToken) return true;

  const provided = extractToken(request);
  if (!provided) return false;

  // Constant-time comparison to prevent timing attacks
  if (provided.length !== ownerToken.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ ownerToken.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Require authentication for a route handler.
 * Returns a 401 response if not authenticated.
 */
export function requireAuth(
  request: NextRequest
): NextResponse | null {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Valid owner token required." },
      { status: 401 }
    );
  }
  return null;
}
