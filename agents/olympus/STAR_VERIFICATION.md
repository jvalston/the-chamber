# STAR_VERIFICATION

## Manual Trigger
Star Verification
-> Trigger: Olympus Cycle (manual)
-> Mode: controlled_intake
-> Limit: 1 signal
-> Trace: full

## Expected Flow
1. Olympus evaluates sources and applies SIGNAL-3 gate.
2. Olympus emits one signal_packet.
3. Sentinel logs cycle_start and confirms output exists.
4. Hermes processes packet and adds system relevance.
5. Persephone translates the meaning.
6. Lumen structures final output.
7. Elior archives if flagged.
8. Sentinel logs cycle_complete.

## Failure Signals
- Olympus produces nothing -> filter too strict or source issue.
- Hermes does not trigger -> routing issue.
- No archive -> Elior not wired in chain.
- Sentinel timeout -> execution gap.

## Calibration
Use max_signals_per_cycle: 1 on first runs to test continuity before volume.
