import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export interface User {
  email: string;
  role: string;
  username?: string;
}

interface UserRecord extends User {
  passwordHash: string;
}

interface EnvUserRecord extends User {
  passwordHash?: string;
  password?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return 'dev-only-secret-do-not-use-in-production';
})();
const TOKEN_EXP = '7d';

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function resolvePasswordHash(record: EnvUserRecord): string | null {
  if (typeof record.passwordHash === 'string' && record.passwordHash.trim()) {
    return record.passwordHash;
  }

  if (typeof record.password === 'string' && record.password.trim()) {
    return bcrypt.hashSync(record.password, 10);
  }

  return null;
}

function loadUsersFromEnv(): UserRecord[] {
  const usersJson = process.env.ADMIN_USERS_JSON;
  if (!usersJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(usersJson) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const records = parsed.filter((item): item is EnvUserRecord => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Partial<EnvUserRecord>;
      return (
        typeof record.email === 'string' &&
        (typeof record.passwordHash === 'string' ||
          typeof record.password === 'string')
      );
    });

    return records.reduce<UserRecord[]>((acc, record) => {
      const passwordHash = resolvePasswordHash(record);
      if (!passwordHash) {
        return acc;
      }

      acc.push({
        email: normalizeIdentifier(record.email),
        username:
          typeof record.username === 'string' && record.username.trim()
            ? normalizeIdentifier(record.username)
            : undefined,
        passwordHash,
        role: record.role || 'admin',
      });

      return acc;
    }, []);
  } catch {
    return [];
  }
}

const fallbackUser: UserRecord = {
  email: normalizeIdentifier(process.env.ADMIN_EMAIL || 'admin@example.com'),
  username:
    typeof process.env.ADMIN_USERNAME === 'string' &&
    process.env.ADMIN_USERNAME.trim()
      ? normalizeIdentifier(process.env.ADMIN_USERNAME)
      : undefined,
  passwordHash:
    process.env.ADMIN_PASSWORD_HASH ||
    (typeof process.env.ADMIN_PASSWORD === 'string' &&
    process.env.ADMIN_PASSWORD.trim()
      ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10)
      : (() => {
          if (process.env.NODE_ENV === 'production') {
            throw new Error('ADMIN_PASSWORD_HASH or ADMIN_PASSWORD env var is required in production');
          }
          return bcrypt.hashSync('password', 10);
        })()),
  role: 'admin',
};

// in-memory users list loaded from environment
const users: UserRecord[] = loadUsersFromEnv();
if (users.length === 0) {
  users.push(fallbackUser);
}

export function findUserByIdentifier(
  identifier: string,
): UserRecord | undefined {
  const normalized = normalizeIdentifier(identifier);
  return users.find(
    (u) => u.email === normalized || u.username === normalized,
  );
}

export function hashPassword(pw: string): string {
  return bcrypt.hashSync(pw, 10);
}

export function comparePassword(pw: string, hash: string): boolean {
  return bcrypt.compareSync(pw, hash);
}

export function createToken(user: User): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: TOKEN_EXP });
}

export function verifyToken(token: string): User | null {
  try {
    return jwt.verify(token, JWT_SECRET) as User;
  } catch {
    return null;
  }
}

// convenience helper used in components
export function isAuthenticated() {
  return false; // used only as placeholder, real checks via API
}
