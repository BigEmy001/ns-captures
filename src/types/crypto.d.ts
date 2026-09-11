declare module "ed25519-hd-key" {
  export interface DerivedKey {
    key: Uint8Array;
    chainCode: Uint8Array;
  }
  export function derivePath(path: string, seedHex: string, offset?: number): DerivedKey;
  export function getMasterKeyFromSeed(seedHex: string): DerivedKey;
}
