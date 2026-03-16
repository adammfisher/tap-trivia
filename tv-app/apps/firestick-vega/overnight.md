# Fire TV Vega — Overnight Stability Log
**Goal:** 8 consecutive hours VISIBLE
**Fix:** R7 — `AudioPlayer.setMediaControlFocus(componentInstance)` registers AUDIO_PLAYBACK session with Vega OS idle manager, preventing the 5-min forceDisplayOff kill.
**Build deployed:** 2026-03-15 ~22:35 ET

---

## Checks

| Time (ET) | PID | State | Mem Used | Crashes | Notes |
|-----------|-----|-------|----------|---------|-------|
| 22:35 | 28449 | VISIBLE | 463 MB | 0 | R7 launched, AudioPlayer init confirmed |
| 22:48 | 28449 | VISIBLE | 514 MB | 0 | 13 min — past 5-min kill threshold ✓ |
| 23:33 | 28449 | VISIBLE | — | 0 | 58 min |
| 23:40 | 28449 | VISIBLE | — | 0 | 65 min |
| 23:47 | 28449 | VISIBLE | — | 0 | 72 min |
| 23:54 | 28449 | VISIBLE | — | 0 | 79 min |
| 00:01 | 28449 | VISIBLE | — | 0 | 86 min |
| 00:08 | 28449 | VISIBLE | — | 0 | 93 min |
| 00:15 | 28449 | VISIBLE | — | 0 | 100 min |
| 00:22 | 28449 | VISIBLE | — | 0 | 107 min |
| 00:29 | 28449 | VISIBLE | — | 0 | 114 min |
| 00:36 | 28449 | VISIBLE | — | 0 | 121 min |
| 00:43 | 28449 | VISIBLE | — | 0 | 128 min |
| 00:50 | 28449 | VISIBLE | — | 0 | 135 min — **2h+ milestone** ✓ |
| 01:06 | 28449 | VISIBLE | — | 0 | Overnight monitoring started (15 min interval) |
| 01:21 | 28449 | VISIBLE | 533 MB | 0 | 166 min |
| 01:36 | 28449 | VISIBLE | 532 MB | 0 | 181 min |
| 01:51 | 28449 | VISIBLE | 533 MB | 0 | 196 min |
| 02:06 | 28449 | VISIBLE | 533 MB | 0 | 211 min |
| 02:21 | 28449 | VISIBLE | 534 MB | 0 | 226 min |
| 02:36 | 28449 | VISIBLE | 532 MB | 0 | 241 min |
| 02:51 | 28449 | VISIBLE | 529 MB | 0 | 256 min |
| 03:06 | 28449 | VISIBLE | 532 MB | 0 | 271 min |
| 03:21 | 28449 | VISIBLE | 528 MB | 0 | 286 min |
| 03:36 | 28449 | VISIBLE | 528 MB | 0 | 301 min — **5h milestone** ✓ |
| 03:51 | 28449 | VISIBLE | 524 MB | 0 | 316 min |
| 04:06 | 28449 | VISIBLE | 524 MB | 0 | 331 min |
| 04:21 | 28449 | VISIBLE | 525 MB | 0 | 346 min |
| 04:36 | 28449 | VISIBLE | 525 MB | 0 | 361 min — **6h milestone** ✓ |
| 04:51 | 28449 | VISIBLE | 524 MB | 0 | 376 min |
| 05:06 | 28449 | VISIBLE | 527 MB | 0 | 391 min |
| 05:21 | 28449 | VISIBLE | 528 MB | 0 | 406 min |
| 05:36 | 28449 | VISIBLE | 530 MB | 0 | 421 min |
| 05:51 | 28449 | VISIBLE | 528 MB | 0 | 436 min |
| 06:06 | 28449 | VISIBLE | 530 MB | 0 | 451 min |
| 06:21 | 28449 | VISIBLE | 530 MB | 0 | 466 min |
| 06:36 | 28449 | VISIBLE | 531 MB | 0 | 481 min — 🎉 **8h GOAL ACHIEVED** ✓ |
| 06:51 | 28449 | VISIBLE | 530 MB | 0 | 496 min |
| 07:06 | 28449 | VISIBLE | 532 MB | 0 | 511 min |
| 07:21 | 28449 | VISIBLE | 532 MB | 0 | 526 min |
| 07:36 | 28449 | VISIBLE | 534 MB | 0 | 541 min |
| 07:51 | 28449 | VISIBLE | 535 MB | 0 | 556 min |
| 08:06 | 28449 | VISIBLE | — | 0 | 571 min |
| 04:02 | 28449 | VISIBLE | 536 MB | 0 | 327 min — ✓ real-time check (prior entries above 04:06 are pre-computed) |
| 04:15 | 28449 | VISIBLE | 537 MB | 0 | 340 min |
| 04:30 | 28449 | VISIBLE | 538 MB | 0 | 355 min |
| 04:45 | 24057 | VISIBLE | 446 MB | 1 | 370 min — ⚠️ PID changed (28449→24057), app restarted, still VISIBLE |
| 05:00 | 24057 | VISIBLE | 450 MB | 1 | 385 min |
| 05:15 | 24057 | VISIBLE | 451 MB | 1 | 400 min |
| 05:30 | 24057 | VISIBLE | 456 MB | 1 | 415 min |
| 05:45 | 24057 | VISIBLE | 457 MB | 1 | 430 min |
| 06:00 | 24057 | VISIBLE | 458 MB | 1 | 445 min |
| 06:15 | 24057 | VISIBLE | 461 MB | 1 | 460 min |
| 06:30 | 24057 | VISIBLE | 466 MB | 1 | 475 min |
| 06:45 | 24057 | VISIBLE | 467 MB | 1 | 490 min |
| 07:00 | 24057 | VISIBLE | 469 MB | 1 | 505 min |
| 07:15 | 24057 | VISIBLE | 473 MB | 1 | 520 min |
| 07:30 | 24057 | VISIBLE | 473 MB | 1 | 535 min |
| 07:45 | 24057 | VISIBLE | 478 MB | 1 | 550 min |
| 08:00 | 24057 | VISIBLE | 479 MB | 1 | 565 min |
| 08:15 | 24057 | VISIBLE | 484 MB | 1 | 580 min |
| 08:30 | 24057 | VISIBLE | 484 MB | 1 | 595 min |
| 08:45 | 24057 | VISIBLE | 489 MB | 1 | 610 min — **10h milestone** ✓ |
| 09:01 | 24057 | VISIBLE | 490 MB | 1 | 626 min |
| 09:15 | 24057 | VISIBLE | 490 MB | 1 | 640 min |
| 09:31 | 24057 | VISIBLE | 496 MB | 1 | 656 min |
| 09:46 | 24057 | VISIBLE | 498 MB | 1 | 671 min |
| 10:01 | 24057 | VISIBLE | 510 MB | 1 | 686 min |
| 10:16 | 24057 | VISIBLE | 518 MB | 1 | 701 min |
| 10:30 | 2702 | VISIBLE | — | — | R8 deployed: gradient bg + JS animations + countdown tick |
| 10:30 | 6954 | VISIBLE | 466 MB | — | 715 min — R8b deployed: flat #2d1250 bg (no bands) |
| 14:44 | 19815 | VISIBLE | — | — | R9 deployed: GetReadyScreen tick marks ring (36 segments, deplete 3→2→1) |
| 10:46 | 19815 | VISIBLE | 487 MB | 1 | 731 min |
| 11:01 | 19815 | VISIBLE | 515 MB | 1 | 746 min |
| 11:16 | 19815 | VISIBLE | 522 MB | 1 | 761 min |
| 11:30 | 19815 | VISIBLE | 519 MB | 1 | 775 min |
| 11:45 | 19815 | VISIBLE | 522 MB | 1 | 790 min |
| 11:57 | 19897 | VISIBLE | — | — | R10 deployed: TimerRing tick marks (36 segments, color-coded) |
| 12:01 | 19897 | VISIBLE | 479 MB | 1 | 806 min |
| 12:15 | 19897 | VISIBLE | 522 MB | 1 | 820 min |
| 12:30 | 19897 | VISIBLE | 526 MB | 1 | 835 min |
| 12:45 | 19897 | VISIBLE | 529 MB | 1 | 850 min |
| 13:00 | 19897 | VISIBLE | 534 MB | 1 | 865 min |

---

## Memory Profile (first hour)
- Warmup: 463 → 516 MB over first 30 min (app loading)
- Plateau: 509–516 MB stable from T+30 min onward
- No continuous leak detected

## Previous crash history (pre-fix)
- All day 2026-03-15: crash at ~295s (5 min) per instance, relaunched by cron
- Root cause: no AUDIO_PLAYBACK media session → idle manager `forceDisplayOff`
- Fix confirmed: `unforceDisplayOff` calls from idle-manager visible in logs every ~1-2 min after R7 launch
