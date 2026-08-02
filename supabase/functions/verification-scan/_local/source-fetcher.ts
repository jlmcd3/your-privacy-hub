// ITEM 365 — single copy of the hardened fetcher now lives in
// _shared/enforcement/source-fetcher.ts so the Leg-2 refetch campaign and the
// verification sweep cannot drift apart (robots handling, UA strategy, cache
// write and degradation reasons are one implementation).
export {
  fetchSourceDocument,
  sha256,
  type FetcherResult,
} from "../../_shared/enforcement/source-fetcher.ts";
