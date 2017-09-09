// Copyright (c) GitHub, Inc.
// MIT License, see LICENSE file for full terms.

/** Throw an error. */
export function fatalError(msg: string): never {
  throw new Error(msg);
}

/**
 * Utility function used to achieve exhaustive type checks at compile time.
 *
 * If the type system is bypassed or this method will throw an exception
 * using the second parameter as the message.
 *
 * @param _ Placeholder parameter in order to leverage the type system.
 *          Pass the variable which has been type narrowed in an exhaustive check.
 * @param message The message to be used in the runtime exception.
 *
 */
export function assertNever(_: never, message: string): never {
  throw new Error(message);
}
