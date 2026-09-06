// RC-REM-P1-C — Biometric Compliance Assessment intake contract (re-export shim).
//
// ITEM 408 — the contract itself now lives at
// `_shared/intake-contracts/biometric.ts` alongside every other product's
// contract, so the record-complete gate, the coach's asked-keys semantics and
// the coverage matrix can reach it. This module stays only as the stable
// import path the quality-batch registry and existing tests already use.
//
// No shape is declared here. One source of truth.

export {
  biometricContract as biometricCheckerContract,
  BIO_TYPES,
  BIO_ORG,
  BIO_PURPOSE,
  BIO_JURS,
  BIO_TRI,
  BIO_NOTICE,
  BIO_CONSENT_ARTIFACT,
  BIO_DISCLOSURE_BASES,
  BIOMETRIC_TRIGGERS,
} from "../../../_shared/intake-contracts/biometric.ts";
