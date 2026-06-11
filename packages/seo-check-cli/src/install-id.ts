import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function configPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
  return join(xdg, 'seo-check-cli', 'install-id');
}

export async function ensureInstallId(): Promise<string> {
  const path = configPath();
  try {
    const buf = await readFile(path, 'utf8');
    const trimmed = buf.trim();
    if (UUID_V4_REGEX.test(trimmed)) return trimmed;
  } catch {
    // file missing or unreadable — fall through to create
  }
  const fresh = randomUUID();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, fresh, 'utf8');
  await chmod(path, 0o600);
  return fresh;
}
