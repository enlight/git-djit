/**
 * An assortment of useful type operators that aren't part of TypeScript core.
 */

/**
 * Usage: type T1 = Diff<"a" | "b" | "c", "c" | "d">; // -> "a" | "b"
 *
 * Source: https://github.com/Microsoft/TypeScript/issues/12215#issuecomment-307871458
 */
export type Diff<T extends string, U extends string> = ({ [P in T]: P } &
  { [P in U]: never } & { [x: string]: never })[T];
/**
 * Usage:
 *   type T1 = { a: string, b: number, c: boolean };
 *   type T2 = Omit<T1, "a">; // -> { b: number, c: boolean }
 *
 * Source: https://github.com/Microsoft/TypeScript/issues/12215#issuecomment-311923766
 */
export type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;
