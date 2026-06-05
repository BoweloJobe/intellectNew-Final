export function apiAdapterNotImplemented(methodName: string): never {
  throw new Error(`API adapter method not implemented: ${methodName}`);
}