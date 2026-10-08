// JSON.stringify alone loses attachment Blob bytes. Encode them explicitly.
export async function encodeBackupValue(value: unknown): Promise<unknown> {
  if (value instanceof Blob) {
    const bytes = new Uint8Array(await value.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    return { __gtaskerType: 'Blob', mimeType: value.type, base64: btoa(binary) };
  }
  if (Array.isArray(value)) return Promise.all(value.map(encodeBackupValue));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) =>
      [key, await encodeBackupValue(item)],
    )));
  }
  return value;
}
