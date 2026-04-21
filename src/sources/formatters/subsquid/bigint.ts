/**
 * Helper function to get minimum of two big ints
 * @param a - lhs
 * @param b - rhs
 * @returns - Return smallest of a and b
 */
function minBigInt (a: bigint, b: bigint) {
  return a < b ? a : b
}

export { minBigInt }
