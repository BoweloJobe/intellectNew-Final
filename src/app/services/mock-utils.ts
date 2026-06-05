export async function withMockDelay<T>(value: T, delayMs = 150): Promise<T> {
  await new Promise<void>((resolve) => {
    window.setTimeout(() => {
      resolve();
    }, delayMs);
  });

  return JSON.parse(JSON.stringify(value)) as T;
}
