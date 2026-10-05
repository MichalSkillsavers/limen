# Team 4 · Severity triggers (CCIR / SEV) with MECE labels and an after-action close

Method: Commander's Critical Information Requirements (CCIR: a written list of facts that the commander must know at once), incident severity levels (SEV1 to SEV3 in incident practice), MECE labels (mutually exclusive, collectively exhaustive), and the after-action review (AAR) as a short day close.

Hypothesis: F763 team-2 showed that severity inflation breaks the skim. Fix it at the source: a short written trigger list decides 🔴 (for example: trust boundary, data loss, a landed behavior that a person relies on, a decision for the owner). A fixed MECE label set (about 5 labels) names the kind of fact. Each day can end with one AAR line (planned vs happened, or next). Test on real Alice data whether the trigger list keeps 🔴 rare (target 0 to 3 per day) and whether the fixed labels make a day easier to skim than free labels.

Simplicity check: the trigger list fits in 5 lines. The label set fits in one legend line. The build checks only that the label is one of the set. It never judges the severity.

Same brief rules: Playwright on `file://`, `/tmp` Alice copy, `00-baseline.png` first, shared screenshots, read the other teams before each cut, a screenshot path for each claim, commits only on your job branch, no landing, no live picture edits.
