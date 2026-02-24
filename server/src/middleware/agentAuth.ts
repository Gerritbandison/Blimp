/**
 * Agent authentication middleware.
 *
 * Devices authenticate via the `X-Blimp-Token` header carrying a token of the
 * form `blmp_<32-char-random>`.  We look up the device by the 12-character
 * prefix and then bcrypt-verify the full token against the stored hash to
 * confirm the device's identity without exposing the token.
 */

import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';

export interface AgentContext {
  deviceId: string;
  deviceName: string;
  hostname: string | null;
  platform: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      agent?: AgentContext;
    }
  }
}

export async function agentAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.headers['x-blimp-token'];
  if (typeof token !== 'string' || !token.startsWith('blmp_')) {
    res.status(401).json({ error: 'Missing or invalid X-Blimp-Token header' });
    return;
  }

  // First 12 chars = "blmp_XXXXXXX" — fast index lookup narrows to ≤1 row
  const prefix = token.slice(0, 12);

  try {
    const device = await prisma.agentDevice.findFirst({
      where: { tokenPrefix: prefix, isActive: true },
    });

    if (!device) {
      res.status(401).json({ error: 'Invalid or revoked agent token' });
      return;
    }

    const valid = await bcrypt.compare(token, device.tokenHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid agent token' });
      return;
    }

    req.agent = {
      deviceId: device.id,
      deviceName: device.name,
      hostname: device.hostname,
      platform: device.platform,
    };
    next();
  } catch {
    res.status(500).json({ error: 'Authentication error' });
  }
}
