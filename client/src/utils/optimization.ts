/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode } from "react";

/**
 * Type predicate to check if two values are equal
 */
type EqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Type for properties that will be skipped during equality checks
 */
type SkipProperties<T> = Partial<Record<keyof T, boolean>>;

/**
 * Default shallow equality checker for object comparison
 * @param a First object
 * @param b Second object
 * @returns Whether objects are shallowly equal
 */
export function shallowEqual<T extends Record<string, any>>(
  a: T,
  b: T
): boolean {
  if (a === b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  if (typeof a !== "object" || typeof b !== "object") {
    return a === b;
  }

  const keysA = Object.keys(a) as Array<keyof T>;
  const keysB = Object.keys(b) as Array<keyof T>;

  if (keysA.length !== keysB.length) {
    return false;
  }

  return keysA.every(
    (key) => Object.prototype.hasOwnProperty.call(b, key) && a[key] === b[key]
  );
}

/**
 * Create custom arePropsEqual function for React.memo with property skipping
 * @param skipProps Properties to ignore during comparison
 * @returns Equality checker function
 */
export function createPropsEqual<T extends Record<string, any>>(
  skipProps: SkipProperties<T>
): EqualityFn<T> {
  return (prevProps, nextProps) => {
    if (prevProps === nextProps) {
      return true;
    }

    const keys = Object.keys(prevProps) as Array<keyof T>;

    return keys.every((key) => {
      // Skip properties marked for skipping
      if (skipProps[key]) {
        return true;
      }

      return prevProps[key] === nextProps[key];
    });
  };
}

/**
 * Logs render and re-render reasons for a component (development only)
 * @param componentName Name of the component to track
 * @param prevProps Previous props
 * @param nextProps Next props
 * @param info Additional information
 */
export function logRenderReason<T extends Record<string, any>>(
  componentName: string,
  prevProps: T,
  nextProps: T,
  info?: string
): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.group(
    `%c${componentName} render ${info ? `(${info})` : ""}`,
    "color: #2f8cff;"
  );

  const allKeys = new Set([
    ...Object.keys(prevProps || {}),
    ...Object.keys(nextProps || {}),
  ]);

  const changedProps: Record<string, { prev: any; next: any }> = {};
  let hasChanges = false;

  allKeys.forEach((key) => {
    const typedKey = key as keyof T;
    if (prevProps?.[typedKey] !== nextProps?.[typedKey]) {
      changedProps[key] = {
        prev: prevProps?.[typedKey],
        next: nextProps?.[typedKey],
      };
      hasChanges = true;
    }
  });

  if (hasChanges) {
    console.log("Changed props:", changedProps);
  } else {
    console.log("No props changed, but component still rendered");
  }

  console.groupEnd();
}

/**
 * Check if a value is an empty React node
 * @param node React node to check
 * @returns Whether the node is empty
 */
export function isEmptyReactNode(node: ReactNode): boolean {
  return node === null || node === undefined || node === false || node === "";
}
