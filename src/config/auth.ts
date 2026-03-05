// ── Download authentication accounts ─────────────────────────────────────
// Passwords are stored as SHA-256 hex hashes for security.
// To update: generate a new hash via Node.js:
//   node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"

export const ALLOWED_ACCOUNTS = [
    { user: 'admin1', hash: 'ac1b6c557698b770c3a769c8f36d9c1a282c384a247afe6b9214489d11ac389f' },
    { user: 'admin2', hash: 'b770d8b45a6cff3617c80dcc6daa555e4bc4b938ef6011447bb5796ab9ae5cc3' },
    { user: 'admin3', hash: 'f5037a770dcdf8a5f77541c91a38a0c7b57fed2ca68f5adc01032c8cb91a3454' },
];

/**
 * Hash a plain-text password using SHA-256 (Web Crypto API).
 * Returns the hex digest string.
 */
export async function hashPassword(plain: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const buffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
