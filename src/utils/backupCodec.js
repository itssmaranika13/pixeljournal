function rotate13(value) {
  return value.replace(/[A-Za-z]/g, character => {
    const code = character.charCodeAt(0);
    const offset = code <= 90 ? 65 : 97;
    return String.fromCharCode(((code - offset + 13) % 26) + offset);
  });
}

export function encodeBackup(json) {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });

  return rotate13(btoa(binary));
}

export function decodeBackup(encodedBackup) {
  const binary = atob(rotate13(encodedBackup));
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}