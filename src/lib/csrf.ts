const TOKEN_KEY = "ns_csrf_token";

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getCsrfToken(): string {
  let token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = generateToken();
    sessionStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function setCsrfMeta(): void {
  const token = getCsrfToken();
  let meta = document.querySelector('meta[name="csrf-token"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "csrf-token");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", token);
}

export function validateCsrfToken(token: string | null): boolean {
  if (!token) return false;
  const stored = sessionStorage.getItem(TOKEN_KEY);
  return !!stored && stored === token;
}
