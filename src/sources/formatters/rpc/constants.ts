/**
 * RAILGUN contract event names emitted on-chain. Used instead of bare string
 * literals so formatter switch/if chains are exhaustive and refactor-safe.
 *
 * - Shield / GeneratedCommitmentBatch: deposits into the shielded pool
 *   (GeneratedCommitmentBatch is the legacy V1 event; Shield is V2)
 * - Transact / CommitmentBatch: private transactions
 *   (CommitmentBatch is the legacy V1 event; Transact is V2)
 * - Unshield: withdrawals out of the shielded pool
 */
enum EventName {
  Shield = 'Shield',
  GeneratedCommitmentBatch = 'GeneratedCommitmentBatch',
  Transact = 'Transact',
  CommitmentBatch = 'CommitmentBatch',
  Unshield = 'Unshield'
}

/**
 * Maximum number of leaves per RAILGUN merkle tree (2^16). Once a tree is full,
 * subsequent commitments go into the next tree. Tree number is derived from a
 * global tree position as `floor(position / TREE_MAX_ITEMS)`.
 */
const TREE_MAX_ITEMS = 65536

export { EventName, TREE_MAX_ITEMS }
