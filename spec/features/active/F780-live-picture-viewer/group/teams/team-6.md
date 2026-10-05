# Team 6 · Cold-reader polish and contrast

Route: Opus (`anthropic/claude-opus-5-5`). On a 429, switch to Sol and publish it.

Hypothesis: Adam does not read code. The page is good when a cold reader understands each row from its words alone, can read every text at full contrast, and never sees the layout crowd or jump at 1440, 1240, or 900 px.

Start here:

1. Read the reference page and the F775 shots as Adam would. Write down every word that only an engineer understands.
2. Review each published candidate and the lead's integration build: wording, contrast (WCAG AA at least), padding on one spacing scale, narrow widths, motion. Take shots at 1440×900, 1240×900, and 900×900.
3. File each fix to its owner as a concrete patch or an exact replacement text with `limen group publish --team team-N`. Do not commit in files you do not own.
4. Write `group/teams/team-6-result.md` with the before and after shots and the fixes that owners took.

Done when: the integration build passes your review at three widths, or every remaining issue is filed with its owner and named in the result.
