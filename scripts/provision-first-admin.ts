import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { provisionFirstAdmin } from '../src/server/first-admin-provisioning';

function promptHidden(label: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Perintah provisioning harus dijalankan dari terminal interaktif.'));
  }

  return new Promise((resolve, reject) => {
    const wasRaw = stdin.isRaw;
    let value = '';
    stdout.write(label);
    stdin.setRawMode(true);
    stdin.resume();

    const finish = (error?: Error) => {
      stdin.off('data', onData);
      stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
      stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') {
          finish(new Error('Provisioning dibatalkan.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          finish();
          return;
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error('DATABASE_URL belum dikonfigurasi.');

  const prompt = createInterface({ input: stdin, output: stdout });
  const name = (await prompt.question('Nama administrator: ')).trim();
  const email = (await prompt.question('Email administrator: ')).trim().toLowerCase();
  const phoneNumber = (await prompt.question('Nomor HP (opsional): ')).trim();
  prompt.close();

  if (name.length < 2 || name.length > 100) throw new Error('Nama harus 2–100 karakter.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Format email tidak valid.');

  const password = await promptHidden('Password baru (min. 12 karakter): ');
  const confirmation = await promptHidden('Ulangi password: ');
  if (password.length < 12 || password.length > 128) {
    throw new Error('Password harus 12–128 karakter.');
  }
  if (password !== confirmation) throw new Error('Konfirmasi password tidak cocok.');

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const admin = await provisionFirstAdmin(pool, {
      name,
      email,
      phoneNumber: phoneNumber || null,
      passwordHash: await bcrypt.hash(password, 12),
    });
    console.log(`Administrator awal dibuat untuk ${admin.email}. Jalankan perintah ini hanya sekali.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Provisioning administrator gagal.');
  process.exitCode = 1;
});
