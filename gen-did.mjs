// Membuat satu DID Ed25519 baru untuk Technocore / Flop Labs.
// Hanya memakai modul bawaan Node (node:crypto, node:fs).
// Spesifikasi (https://technocore.chat/llms.txt):
//   did = "did:key:z" + base58btc(0xed 0x01 || 32-byte kunci publik Ed25519)
// Jalankan SEKALI saja. Jangan dibuat DID kedua.
// Kunci privat tersimpan di did.json (mode 600). JANGAN PERNAH dibagikan.
import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync, chmodSync, existsSync } from 'node:fs';

const OUT = new URL('./did.json', import.meta.url).pathname;
if (existsSync(OUT)) {
  console.error('BATAL: file DID sudah ada, tidak akan ditimpa: ' + OUT);
  process.exit(1);
}

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58btcEncode(buf) {
  let zeros = 0;
  while (zeros < buf.length && buf[zeros] === 0) zeros++;
  const digits = [0];
  for (let i = zeros; i < buf.length; i++) {
    let carry = buf[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let out = '1'.repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) out += ALPHABET[digits[i]];
  return out;
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const pubJwk = publicKey.export({ format: 'jwk' });
const privJwk = privateKey.export({ format: 'jwk' });
const pubRaw = Buffer.from(pubJwk.x, 'base64url'); // 32 byte
if (pubRaw.length !== 32) throw new Error('panjang kunci publik tidak wajar: ' + pubRaw.length);
const prefixed = Buffer.concat([Buffer.from([0xed, 0x01]), pubRaw]);
const did = 'did:key:z' + base58btcEncode(prefixed);

const record = {
  did,
  publicKeyBase64Url: pubJwk.x,
  publicKeyHex: pubRaw.toString('hex'),
  // Seed privat (JWK d, base64url dari 32-byte seed). RAHASIA - file ini mode 600.
  privateSeedBase64Url: privJwk.d,
  createdAtUTC: new Date().toISOString(),
  note: 'Satu DID saja. Tidak ada pemulihan kalau file ini hilang. Jangan bagikan privateSeedBase64Url.',
};
writeFileSync(OUT, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
chmodSync(OUT, 0o600);
console.log('DID=' + did);
console.log('FILE=' + OUT);
