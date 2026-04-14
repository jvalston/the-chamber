# PHOENIX_DRIVE_MIGRATION_DIRECTIVE.md

## OBJECTIVE

Restructure Phoenix storage and transition system drive from current 4TB C:\ to a 2TB SSD.

Final state must be:

* New C:\ (2TB SSD) = Active system + essential data only
* Old 4TB drive = fully wiped and reassigned to Axiom as storage

---

## CURRENT STATE

* C:\ = 4TB drive
* Current usage ≈ 2.3TB
* Target reduction threshold: ≤ 1.2TB

---

## PHASE 1 — REDUCTION

Veris will:

1. Continue Active Custodian Protocol
2. Reduce C:\ usage from current (~2.3TB) to ≤ 1.2TB
3. Use defined transfer rules:

   * Move non-critical data to E:\
   * Preserve system integrity
   * Follow all protected path and reference safety rules

PHASE 1 COMPLETE when:
C:\ usage ≤ 1.2TB

---

## PHASE 2 — PRE-MIGRATION VALIDATION

Before migration begins:

* Confirm total used space on C:\ ≤ 1.2TB
* Confirm destination SSD capacity = 2TB
* Confirm system stability (no active transfer operations)
* Confirm all logs show no unresolved failures

---

## PHASE 3 — FULL DRIVE TRANSFER

Perform full system clone:

SOURCE:

* Current C:\ (4TB drive, reduced to ≤ 1.2TB used)

DESTINATION:

* New 2TB SSD

REQUIREMENTS:

* Sector-level or system-aware clone
* All system partitions included:

  * EFI / Boot
  * OS
  * Recovery (if present)
* No partial file copy — this is a full system migration

VALIDATION:

* Clone integrity must be verified
* System must be boot-tested from new SSD

---

## PHASE 4 — DRIVE ROLE SWITCH

After successful clone and boot verification:

1. Set new 2TB SSD as primary boot drive
2. Confirm:

   * OS loads correctly
   * Applications function
   * Paths resolve correctly

---

## PHASE 5 — OLD DRIVE REASSIGNMENT

ONLY AFTER successful validation:

1. Wipe original 4TB drive completely
2. Reformat for storage use
3. Assign to Axiom as additional storage

---

## SAFETY RULES

* No wipe occurs before successful boot validation
* No partial migration allowed
* If clone fails → abort and retry
* Original drive remains untouched until full confirmation

---

## FINAL STATE

* C:\ = 2TB SSD (active system, ≤ 1.2TB used)
* 4TB drive = empty, reassigned to Axiom storage
* E:\ = structured storage with organized offloaded data

---

## ACTIVATION

"Veris, complete reduction to 1.2TB, then prepare for full system migration."
