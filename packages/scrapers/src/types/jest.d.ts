// Typové definice pro Jest
declare namespace jest {
  function mock(moduleName: string, factory?: any): any;
  function requireActual(moduleName: string): any;
  function fn(): any;
  function fn<T extends (...args: any[]) => any>(
    implementation?: T,
  ): jest.MockInstance<ReturnType<T>, Parameters<T>>;
  function clearAllMocks(): void;

  interface MockInstance<T, Y extends any[]> {
    mockReturnValue(value: T): this;
    mockResolvedValue(value: T): this;
    mockRejectedValue(value: any): this;
    mockImplementation(fn: (...args: Y) => T): this;
    mockReturnThis(): this;
  }
}

// Typové definice pro testovací funkce
declare function describe(name: string, fn: () => void): void;
declare function beforeEach(fn: () => void): void;
declare function afterEach(fn: () => void): void;
declare function test(name: string, fn: () => void | Promise<void>, timeout?: number): void;
declare function expect<T>(value: T): {
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(expected: any): void;
  toHaveLength(expected: number): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toThrow(expected?: any): void;
  toThrowError(expected?: any): void;
  toMatch(expected: string | RegExp): void;
  toMatchObject(expected: any): void;
  toHaveProperty(keyPath: string, value?: any): void;
  resolves: any;
  rejects: any;
  not: any;
};
