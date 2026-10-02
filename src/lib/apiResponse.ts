/** Read our API envelope without exposing proxy HTML or parser exceptions. */
export async function readApiResponse<T extends { success: boolean; error?: string }>(response: Response): Promise<T> {
  const invalidResponse = () => {
    if (response.status === 404) return new Error('Endpoint API tidak ditemukan. Perbarui image aplikasi.');
    if (response.status === 401) return new Error('Sesi berakhir. Silakan login kembali.');
    if (response.status === 403) return new Error('Akses API ditolak. Periksa izin akun atau proxy.');
    if (response.status >= 500) return new Error(`Server/proxy bermasalah (HTTP ${response.status}). Coba lagi.`);
    return new Error(`Respons API bukan JSON (HTTP ${response.status}). Periksa alamat backend atau perbarui image aplikasi.`);
  };
  const contentType = response.headers.get('content-type') || '';
  if (contentType && !/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(contentType)) throw invalidResponse();
  let body: unknown;
  try { body = await response.json(); } catch { throw invalidResponse(); }
  if (!body || typeof body !== 'object' || !('success' in body) || typeof body.success !== 'boolean') {
    throw new Error('Format respons API tidak sesuai. Perbarui image aplikasi.');
  }
  return body as T;
}

/** Translate legacy stored parser errors without displaying response fragments. */
export function apiErrorMessage(message: string): string {
  return /unexpected token|not valid json|unexpected end of json|json\.parse/i.test(message)
    ? 'Respons API bukan JSON. Periksa alamat backend atau perbarui image aplikasi.'
    : message;
}