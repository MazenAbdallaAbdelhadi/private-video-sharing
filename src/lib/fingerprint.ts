export async function generateDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "server-fingerprint";

  const components = [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ];

  const fingerprintString = components.join("|||");

  // Hash using Web Crypto API
  const msgBuffer = new TextEncoder().encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}
