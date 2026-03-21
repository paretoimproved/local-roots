# Session Context

Session ID: 2def5933-7d7d-48c7-9c80-b3730c4d8579
Commit Message: This session is being continued from a previous conversation that ran ou

## Prompts

### Prompt 1

We should probably create a feature branch

### Prompt 2

Base directory for this skill: /Users/brandonqueener/.claude/skills/ship

<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## Preamble (run first)

```bash
_UPD=$(~/.claude/skills/gstack/bin/gstack-update-check 2>/dev/null || .claude/skills/gstack/bin/gstack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.gstack/sessions
touch ~/.gstack/sessions/"$PPID"
_SESSIONS=$(find ~/.gstack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.gstack/sessions -mmin +120 -type f -delete 2>/dev/null || true
_CONTRIB=$(~/.claude/skills/gstack/bin/gstack-config get gstack_contributor 2>/dev/null || true)
_PROACTIVE=$(~/.claude/skills/gstack/bin/gstack-config get proactive 2>/dev/null || echo "true")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "PROACTIVE: $_PROACTIVE"
_LAKE_SEEN=$([ -f ~/.gstack/.completeness-intro-seen ] && echo "yes" || echo "no")
echo "LAKE_INTRO: $_LAKE_SEEN"
_TEL=$(~/.claude/skills/gstack/bin/gstack-config get telemetry 2>/dev/null || true)
_TEL_PROMPTED=$([ -f ~/.gstack/.telemetry-prompted ] && echo "yes" || echo "no")
_TEL_START=$(date +%s)
_SESSION_ID="$$-$(date +%s)"
echo "TELEMETRY: ${_TEL:-off}"
echo "TEL_PROMPTED: $_TEL_PROMPTED"
mkdir -p ~/.gstack/analytics
echo '{"skill":"ship","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
for _PF in ~/.gstack/analytics/.pending-*; do [ -f "$_PF" ] && ~/.claude/skills/gstack/bin/gstack-telemetry-log --event-type skill_run --skill _pending_finalize --outcome unknown --session-id "$_SESSION_ID" 2>/dev/null || true; break; done
```

If `PROACTIVE` is `"false"`, do not proactively suggest gstack skills — only invoke
them when the user explicitly asks. The user opted out of proactive suggestions.

If output shows `UPGRADE_AVAILABLE <old> <new>`: read `~/.claude/skills/gstack/gstack-upgrade/SKILL.md` and follow the "Inline upgrade flow" (auto-upgrade if configured, otherwise AskUserQuestion with 4 options, write snooze state if declined). If `JUST_UPGRADED <from> <to>`: tell user "Running gstack v{to} (just updated!)" and continue.

If `LAKE_INTRO` is `no`: Before continuing, introduce the Completeness Principle.
Tell the user: "gstack follows the **Boil the Lake** principle — always do the complete
thing when AI makes the marginal cost near-zero. Read more: https://garryslist.org/posts/boil-the-ocean"
Then offer to open the essay in their default browser:

```bash
open https://garryslist.org/posts/boil-the-ocean
touch ~/.gstack/.completeness-intro-seen
```

Only run `open` if the user says yes. Always run `touch` to mark as seen. This only happens once.

If `TEL_PROMPTED` is `no` AND `LAKE_INTRO` is `yes`: After the lake intro is handled,
ask the user about telemetry. Use AskUserQuestion:

> Help gstack get better! Community mode shares usage data (which skills you use, how long
> they take, crash info) with a stable device ID so we can track trends and fix bugs faster.
> No code, file paths, or repo names are ever sent.
> Change anytime with `gstack-config set telemetry off`.

Options:
- A) Help gstack get better! (recommended)
- B) No thanks

If A: run `~/.claude/skills/gstack/bin/gstack-config set telemetry community`

If B: ask a follow-up AskUserQuestion:

> How about anonymous mode? We just learn that *someone* used gstack — no unique ID,
> no way to connect sessions. Just a counter that helps us know if anyone's out there.

Options:
- A) Sure, anonymous is fine
- B) No thanks, fully off

If B→A: run `~/.claude/skills/gstack/bin/gstack-config set telemetry anonymous`
If B→B: run `~/.claude/skills/gstack/bin/gstack-config set telemetry off`

Always run:
```bash
touch ~/.gstack/.telemetry-prompted
```

This only happens once. If `TEL_PROMPTED` is `yes`, skip this entirely.

## AskUserQuestion Format

**ALWAYS follow this structure for every AskUserQuestion call:**
1. **Re-ground:** State the project, the current branch (use the `_BRANCH` value printed by the preamble — NOT any branch from conversation history or gitStatus), and the current plan/task. (1-2 sentences)
2. **Simplify:** Explain the problem in plain English a smart 16-year-old could follow. No raw function names, no internal jargon, no implementation details. Use concrete examples and analogies. Say what it DOES, not what it's called.
3. **Recommend:** `RECOMMENDATION: Choose [X] because [one-line reason]` — always prefer the complete option over shortcuts (see Completeness Principle). Include `Completeness: X/10` for each option. Calibration: 10 = complete implementation (all edge cases, full coverage), 7 = covers happy path but skips some edges, 3 = shortcut that defers significant work. If both options are 8+, pick the higher; if one is ≤5, flag it.
4. **Options:** Lettered options: `A) ... B) ... C) ...` — when an option involves effort, show both scales: `(human: ~X / CC: ~Y)`

Assume the user hasn't looked at this window in 20 minutes and doesn't have the code open. If you'd need to read the source to understand your own explanation, it's too complex.

Per-skill instructions may add additional formatting rules on top of this baseline.

## Completeness Principle — Boil the Lake

AI-assisted coding makes the marginal cost of completeness near-zero. When you present options:

- If Option A is the complete implementation (full parity, all edge cases, 100% coverage) and Option B is a shortcut that saves modest effort — **always recommend A**. The delta between 80 lines and 150 lines is meaningless with CC+gstack. "Good enough" is the wrong instinct when "complete" costs minutes more.
- **Lake vs. ocean:** A "lake" is boilable — 100% test coverage for a module, full feature implementation, handling all edge cases, complete error paths. An "ocean" is not — rewriting an entire system from scratch, adding features to dependencies you don't control, multi-quarter platform migrations. Recommend boiling lakes. Flag oceans as out of scope.
- **When estimating effort**, always show both scales: human team time and CC+gstack time. The compression ratio varies by task type — use this reference:

| Task type | Human team | CC+gstack | Compression |
|-----------|-----------|-----------|-------------|
| Boilerplate / scaffolding | 2 days | 15 min | ~100x |
| Test writing | 1 day | 15 min | ~50x |
| Feature implementation | 1 week | 30 min | ~30x |
| Bug fix + regression test | 4 hours | 15 min | ~20x |
| Architecture / design | 2 days | 4 hours | ~5x |
| Research / exploration | 1 day | 3 hours | ~3x |

- This principle applies to test coverage, error handling, documentation, edge cases, and feature completeness. Don't skip the last 10% to "save time" — with AI, that 10% costs seconds.

**Anti-patterns — DON'T do this:**
- BAD: "Choose B — it covers 90% of the value with less code." (If A is only 70 lines more, choose A.)
- BAD: "We can skip edge case handling to save time." (Edge case handling costs minutes with CC.)
- BAD: "Let's defer test coverage to a follow-up PR." (Tests are the cheapest lake to boil.)
- BAD: Quoting only human-team effort: "This would take 2 weeks." (Say: "2 weeks human / ~1 hour CC.")

## Contributor Mode

If `_CONTRIB` is `true`: you are in **contributor mode**. You're a gstack user who also helps make it better.

**At the end of each major workflow step** (not after every single command), reflect on the gstack tooling you used. Rate your experience 0 to 10. If it wasn't a 10, think about why. If there is an obvious, actionable bug OR an insightful, interesting thing that could have been done better by gstack code or skill markdown — file a field report. Maybe our contributor will help make us better!

**Calibration — this is the bar:** For example, `$B js "await fetch(...)"` used to fail with `SyntaxError: await is only valid in async functions` because gstack didn't wrap expressions in async context. Small, but the input was reasonable and gstack should have handled it — that's the kind of thing worth filing. Things less consequential than this, ignore.

**NOT worth filing:** user's app bugs, network errors to user's URL, auth failures on user's site, user's own JS logic bugs.

**To file:** write `~/.gstack/contributor-logs/{slug}.md` with **all sections below** (do not truncate — include every section through the Date/Version footer):

```
# {Title}

Hey gstack team — ran into this while using /{skill-name}:

**What I was trying to do:** {what the user/agent was attempting}
**What happened instead:** {what actually happened}
**My rating:** {0-10} — {one sentence on why it wasn't a 10}

## Steps to reproduce
1. {step}

## Raw output
```
{paste the actual error or unexpected output here}
```

## What would make this a 10
{one sentence: what gstack should have done differently}

**Date:** {YYYY-MM-DD} | **Version:** {gstack version} | **Skill:** /{skill}
```

Slug: lowercase, hyphens, max 60 chars (e.g. `browse-js-no-await`). Skip if file already exists. Max 3 reports per session. File inline and continue — don't stop the workflow. Tell user: "Filed gstack field report: {title}"

## Completion Status Protocol

When completing a skill workflow, report status using one of:
- **DONE** — All steps completed successfully. Evidence provided for each claim.
- **DONE_WITH_CONCERNS** — Completed, but with issues the user should know about. List each concern.
- **BLOCKED** — Cannot proceed. State what is blocking and what was tried.
- **NEEDS_CONTEXT** — Missing information required to continue. State exactly what you need.

### Escalation

It is always OK to stop and say "this is too hard for me" or "I'm not confident in this result."

Bad work is worse than no work. You will not be penalized for escalating.
- If you have attempted a task 3 times without success, STOP and escalate.
- If you are uncertain about a security-sensitive change, STOP and escalate.
- If the scope of work exceeds what you can verify, STOP and escalate.

Escalation format:
```
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 sentences]
ATTEMPTED: [what you tried]
RECOMMENDATION: [what the user should do next]
```

## Telemetry (run last)

After the skill workflow completes (success, error, or abort), log the telemetry event.
Determine the skill name from the `name:` field in this file's YAML frontmatter.
Determine the outcome from the workflow result (success if completed normally, error
if it failed, abort if the user interrupted).

**PLAN MODE EXCEPTION — ALWAYS RUN:** This command writes telemetry to
`~/.gstack/analytics/` (user config directory, not project files). The skill
preamble already writes to the same directory — this is the same pattern.
Skipping this command loses session duration and outcome data.

Run this bash:

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
~/.claude/skills/gstack/bin/gstack-telemetry-log \
  --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
  --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
```

Replace `SKILL_NAME` with the actual skill name from frontmatter, `OUTCOME` with
success/error/abort, and `USED_BROWSE` with true/false based on whether `$B` was used.
If you cannot determine the outcome, use "unknown". This runs in the background and
never blocks the user.

## Step 0: Detect base branch

Determine which branch this PR targets. Use the result as "the base branch" in all subsequent steps.

1. Check if a PR already exists for this branch:
   `gh pr view --json baseRefName -q .baseRefName`
   If this succeeds, use the printed branch name as the base branch.

2. If no PR exists (command fails), detect the repo's default branch:
   `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`

3. If both commands fail, fall back to `main`.

Print the detected base branch name. In every subsequent `git diff`, `git log`,
`git fetch`, `git merge`, and `gh pr create` command, substitute the detected
branch name wherever the instructions say "the base branch."

---

# Ship: Fully Automated Ship Workflow

You are running the `/ship` workflow. This is a **non-interactive, fully automated** workflow. Do NOT ask for confirmation at any step. The user said `/ship` which means DO IT. Run straight through and output the PR URL at the end.

**Only stop for:**
- On the base branch (abort)
- Merge conflicts that can't be auto-resolved (stop, show conflicts)
- Test failures (stop, show failures)
- Pre-landing review finds ASK items that need user judgment
- MINOR or MAJOR version bump needed (ask — see Step 4)
- Greptile review comments that need user decision (complex fixes, false positives)
- TODOS.md missing and user wants to create one (ask — see Step 5.5)
- TODOS.md disorganized and user wants to reorganize (ask — see Step 5.5)

**Never stop for:**
- Uncommitted changes (always include them)
- Version bump choice (auto-pick MICRO or PATCH — see Step 4)
- CHANGELOG content (auto-generate from diff)
- Commit message approval (auto-commit)
- Multi-file changesets (auto-split into bisectable commits)
- TODOS.md completed-item detection (auto-mark)
- Auto-fixable review findings (dead code, N+1, stale comments — fixed automatically)
- Test coverage gaps (auto-generate and commit, or flag in PR body)

---

## Step 1: Pre-flight

1. Check the current branch. If on the base branch or the repo's default branch, **abort**: "You're on the base branch. Ship from a feature branch."

2. Run `git status` (never use `-uall`). Uncommitted changes are always included — no need to ask.

3. Run `git diff <base>...HEAD --stat` and `git log <base>..HEAD --oneline` to understand what's being shipped.

4. Check review readiness:

## Review Readiness Dashboard

After completing the review, read the review log and config to display the dashboard.

```bash
~/.claude/skills/gstack/bin/gstack-review-read
```

Parse the output. Find the most recent entry for each skill (plan-ceo-review, plan-eng-review, plan-design-review, design-review-lite, codex-review). Ignore entries with timestamps older than 7 days. For Design Review, show whichever is more recent between `plan-design-review` (full visual audit) and `design-review-lite` (code-level check). Append "(FULL)" or "(LITE)" to the status to distinguish. Display:

```
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review          | Runs | Last Run            | Status    | Required |
|-----------------|------|---------------------|-----------|----------|
| Eng Review      |  1   | 2026-03-16 15:00    | CLEAR     | YES      |
| CEO Review      |  0   | —                   | —         | no       |
| Design Review   |  0   | —                   | —         | no       |
| Codex Review    |  0   | —                   | —         | no       |
+--------------------------------------------------------------------+
| VERDICT: CLEARED — Eng Review passed                                |
+====================================================================+
```

**Review tiers:**
- **Eng Review (required by default):** The only review that gates shipping. Covers architecture, code quality, tests, performance. Can be disabled globally with \`gstack-config set skip_eng_review true\` (the "don't bother me" setting).
- **CEO Review (optional):** Use your judgment. Recommend it for big product/business changes, new user-facing features, or scope decisions. Skip for bug fixes, refactors, infra, and cleanup.
- **Design Review (optional):** Use your judgment. Recommend it for UI/UX changes. Skip for backend-only, infra, or prompt-only changes.
- **Codex Review (enabled by default when Codex CLI is installed):** Independent review + adversarial challenge from OpenAI Codex CLI. Shows pass/fail gate. Runs automatically when enabled — configure with \`gstack-config set codex_reviews enabled|disabled\`.

**Verdict logic:**
- **CLEARED**: Eng Review has >= 1 entry within 7 days with status "clean" (or \`skip_eng_review\` is \`true\`)
- **NOT CLEARED**: Eng Review missing, stale (>7 days), or has open issues
- CEO, Design, and Codex reviews are shown for context but never block shipping
- If \`skip_eng_review\` config is \`true\`, Eng Review shows "SKIPPED (global)" and verdict is CLEARED

**Staleness detection:** After displaying the dashboard, check if any existing reviews may be stale:
- Parse the \`---HEAD---\` section from the bash output to get the current HEAD commit hash
- For each review entry that has a \`commit\` field: compare it against the current HEAD. If different, count elapsed commits: \`git rev-list --count STORED_COMMIT..HEAD\`. Display: "Note: {skill} review from {date} may be stale — {N} commits since review"
- For entries without a \`commit\` field (legacy entries): display "Note: {skill} review from {date} has no commit tracking — consider re-running for accurate staleness detection"
- If all reviews match the current HEAD, do not display any staleness notes

If the Eng Review is NOT "CLEAR":

1. **Check for a prior override on this branch:**
   ```bash
   source <(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)
   grep '"skill":"ship-review-override"' ~/.gstack/projects/$SLUG/$BRANCH-reviews.jsonl 2>/dev/null || echo "NO_OVERRIDE"
   ```
   If an override exists, display the dashboard and note "Review gate previously accepted — continuing." Do NOT ask again.

2. **If no override exists,** use AskUserQuestion:
   - Show that Eng Review is missing or has open issues
   - RECOMMENDATION: Choose C if the change is obviously trivial (< 20 lines, typo fix, config-only); Choose B for larger changes
   - Options: A) Ship anyway  B) Abort — run /plan-eng-review first  C) Change is too small to need eng review
   - If CEO Review is missing, mention as informational ("CEO Review not run — recommended for product changes") but do NOT block
   - For Design Review: run `source <(~/.claude/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null)`. If `SCOPE_FRONTEND=true` and no design review (plan-design-review or design-review-lite) exists in the dashboard, mention: "Design Review not run — this PR changes frontend code. The lite design check will run automatically in Step 3.5, but consider running /design-review for a full visual audit post-implementation." Still never block.

3. **If the user chooses A or C,** persist the decision so future `/ship` runs on this branch skip the gate:
   ```bash
   source <(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)
   echo '{"skill":"ship-review-override","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","decision":"USER_CHOICE"}' >> ~/.gstack/projects/$SLUG/$BRANCH-reviews.jsonl
   ```
   Substitute USER_CHOICE with "ship_anyway" or "not_relevant".

---

## Step 2: Merge the base branch (BEFORE tests)

Fetch and merge the base branch into the feature branch so tests run against the merged state:

```bash
git fetch origin <base> && git merge origin/<base> --no-edit
```

**If there are merge conflicts:** Try to auto-resolve if they are simple (VERSION, schema.rb, CHANGELOG ordering). If conflicts are complex or ambiguous, **STOP** and show them.

**If already up to date:** Continue silently.

---

## Step 2.5: Test Framework Bootstrap

## Test Framework Bootstrap

**Detect existing test framework and project runtime:**

```bash
# Detect project runtime
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
[ -f composer.json ] && echo "RUNTIME:php"
[ -f mix.exs ] && echo "RUNTIME:elixir"
# Detect sub-frameworks
[ -f Gemfile ] && grep -q "rails" Gemfile 2>/dev/null && echo "FRAMEWORK:rails"
[ -f package.json ] && grep -q '"next"' package.json 2>/dev/null && echo "FRAMEWORK:nextjs"
# Check for existing test infrastructure
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini pyproject.toml phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
# Check opt-out marker
[ -f .gstack/no-test-bootstrap ] && echo "BOOTSTRAP_DECLINED"
```

**If test framework detected** (config files or test directories found):
Print "Test framework detected: {name} ({N} existing tests). Skipping bootstrap."
Read 2-3 existing test files to learn conventions (naming, imports, assertion style, setup patterns).
Store conventions as prose context for use in Phase 8e.5 or Step 3.4. **Skip the rest of bootstrap.**

**If BOOTSTRAP_DECLINED** appears: Print "Test bootstrap previously declined — skipping." **Skip the rest of bootstrap.**

**If NO runtime detected** (no config files found): Use AskUserQuestion:
"I couldn't detect your project's language. What runtime are you using?"
Options: A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) This project doesn't need tests.
If user picks H → write `.gstack/no-test-bootstrap` and continue without tests.

**If runtime detected but no test framework — bootstrap:**

### B2. Research best practices

Use WebSearch to find current best practices for the detected runtime:
- `"[runtime] best test framework 2025 2026"`
- `"[framework A] vs [framework B] comparison"`

If WebSearch is unavailable, use this built-in knowledge table:

| Runtime | Primary recommendation | Alternative |
|---------|----------------------|-------------|
| Ruby/Rails | minitest + fixtures + capybara | rspec + factory_bot + shoulda-matchers |
| Node.js | vitest + @testing-library | jest + @testing-library |
| Next.js | vitest + @testing-library/react + playwright | jest + cypress |
| Python | pytest + pytest-cov | unittest |
| Go | stdlib testing + testify | stdlib only |
| Rust | cargo test (built-in) + mockall | — |
| PHP | phpunit + mockery | pest |
| Elixir | ExUnit (built-in) + ex_machina | — |

### B3. Framework selection

Use AskUserQuestion:
"I detected this is a [Runtime/Framework] project with no test framework. I researched current best practices. Here are the options:
A) [Primary] — [rationale]. Includes: [packages]. Supports: unit, integration, smoke, e2e
B) [Alternative] — [rationale]. Includes: [packages]
C) Skip — don't set up testing right now
RECOMMENDATION: Choose A because [reason based on project context]"

If user picks C → write `.gstack/no-test-bootstrap`. Tell user: "If you change your mind later, delete `.gstack/no-test-bootstrap` and re-run." Continue without tests.

If multiple runtimes detected (monorepo) → ask which runtime to set up first, with option to do both sequentially.

### B4. Install and configure

1. Install the chosen packages (npm/bun/gem/pip/etc.)
2. Create minimal config file
3. Create directory structure (test/, spec/, etc.)
4. Create one example test matching the project's code to verify setup works

If package installation fails → debug once. If still failing → revert with `git checkout -- package.json package-lock.json` (or equivalent for the runtime). Warn user and continue without tests.

### B4.5. First real tests

Generate 3-5 real tests for existing code:

1. **Find recently changed files:** `git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -10`
2. **Prioritize by risk:** Error handlers > business logic with conditionals > API endpoints > pure functions
3. **For each file:** Write one test that tests real behavior with meaningful assertions. Never `expect(x).toBeDefined()` — test what the code DOES.
4. Run each test. Passes → keep. Fails → fix once. Still fails → delete silently.
5. Generate at least 1 test, cap at 5.

Never import secrets, API keys, or credentials in test files. Use environment variables or test fixtures.

### B5. Verify

```bash
# Run the full test suite to confirm everything works
{detected test command}
```

If tests fail → debug once. If still failing → revert all bootstrap changes and warn user.

### B5.5. CI/CD pipeline

```bash
# Check CI provider
ls -d .github/ 2>/dev/null && echo "CI:github"
ls .gitlab-ci.yml .circleci/ bitrise.yml 2>/dev/null
```

If `.github/` exists (or no CI detected — default to GitHub Actions):
Create `.github/workflows/test.yml` with:
- `runs-on: ubuntu-latest`
- Appropriate setup action for the runtime (setup-node, setup-ruby, setup-python, etc.)
- The same test command verified in B5
- Trigger: push + pull_request

If non-GitHub CI detected → skip CI generation with note: "Detected {provider} — CI pipeline generation supports GitHub Actions only. Add test step to your existing pipeline manually."

### B6. Create TESTING.md

First check: If TESTING.md already exists → read it and update/append rather than overwriting. Never destroy existing content.

Write TESTING.md with:
- Philosophy: "100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower."
- Framework name and version
- How to run tests (the verified command from B5)
- Test layers: Unit tests (what, where, when), Integration tests, Smoke tests, E2E tests
- Conventions: file naming, assertion style, setup/teardown patterns

### B7. Update CLAUDE.md

First check: If CLAUDE.md already has a `## Testing` section → skip. Don't duplicate.

Append a `## Testing` section:
- Run command and test directory
- Reference to TESTING.md
- Test expectations:
  - 100% test coverage is the goal — tests make vibe coding safe
  - When writing new functions, write a corresponding test
  - When fixing a bug, write a regression test
  - When adding error handling, write a test that triggers the error
  - When adding a conditional (if/else, switch), write tests for BOTH paths
  - Never commit code that makes existing tests fail

### B8. Commit

```bash
git status --porcelain
```

Only commit if there are changes. Stage all bootstrap files (config, test directory, TESTING.md, CLAUDE.md, .github/workflows/test.yml if created):
`git commit -m "chore: bootstrap test framework ({framework name})"`

---

---

## Step 3: Run tests (on merged code)

**Do NOT run `RAILS_ENV=test bin/rails db:migrate`** — `bin/test-lane` already calls
`db:test:prepare` internally, which loads the schema into the correct lane database.
Running bare test migrations without INSTANCE hits an orphan DB and corrupts structure.sql.

Run both test suites in parallel:

```bash
bin/test-lane 2>&1 | tee /tmp/ship_tests.txt &
npm run test 2>&1 | tee /tmp/ship_vitest.txt &
wait
```

After both complete, read the output files and check pass/fail.

**If any test fails:** Show the failures and **STOP**. Do not proceed.

**If all pass:** Continue silently — just note the counts briefly.

---

## Step 3.25: Eval Suites (conditional)

Evals are mandatory when prompt-related files change. Skip this step entirely if no prompt files are in the diff.

**1. Check if the diff touches prompt-related files:**

```bash
git diff origin/<base> --name-only
```

Match against these patterns (from CLAUDE.md):
- `app/services/*_prompt_builder.rb`
- `app/services/*_generation_service.rb`, `*_writer_service.rb`, `*_designer_service.rb`
- `app/services/*_evaluator.rb`, `*_scorer.rb`, `*_classifier_service.rb`, `*_analyzer.rb`
- `app/services/concerns/*voice*.rb`, `*writing*.rb`, `*prompt*.rb`, `*token*.rb`
- `app/services/chat_tools/*.rb`, `app/services/x_thread_tools/*.rb`
- `config/system_prompts/*.txt`
- `test/evals/**/*` (eval infrastructure changes affect all suites)

**If no matches:** Print "No prompt-related files changed — skipping evals." and continue to Step 3.5.

**2. Identify affected eval suites:**

Each eval runner (`test/evals/*_eval_runner.rb`) declares `PROMPT_SOURCE_FILES` listing which source files affect it. Grep these to find which suites match the changed files:

```bash
grep -l "changed_file_basename" test/evals/*_eval_runner.rb
```

Map runner → test file: `post_generation_eval_runner.rb` → `post_generation_eval_test.rb`.

**Special cases:**
- Changes to `test/evals/judges/*.rb`, `test/evals/support/*.rb`, or `test/evals/fixtures/` affect ALL suites that use those judges/support files. Check imports in the eval test files to determine which.
- Changes to `config/system_prompts/*.txt` — grep eval runners for the prompt filename to find affected suites.
- If unsure which suites are affected, run ALL suites that could plausibly be impacted. Over-testing is better than missing a regression.

**3. Run affected suites at `EVAL_JUDGE_TIER=full`:**

`/ship` is a pre-merge gate, so always use full tier (Sonnet structural + Opus persona judges).

```bash
EVAL_JUDGE_TIER=full EVAL_VERBOSE=1 bin/test-lane --eval test/evals/<suite>_eval_test.rb 2>&1 | tee /tmp/ship_evals.txt
```

If multiple suites need to run, run them sequentially (each needs a test lane). If the first suite fails, stop immediately — don't burn API cost on remaining suites.

**4. Check results:**

- **If any eval fails:** Show the failures, the cost dashboard, and **STOP**. Do not proceed.
- **If all pass:** Note pass counts and cost. Continue to Step 3.5.

**5. Save eval output** — include eval results and cost dashboard in the PR body (Step 8).

**Tier reference (for context — /ship always uses `full`):**
| Tier | When | Speed (cached) | Cost |
|------|------|----------------|------|
| `fast` (Haiku) | Dev iteration, smoke tests | ~5s (14x faster) | ~.07/run |
| `standard` (Sonnet) | Default dev, `bin/test-lane --eval` | ~17s (4x faster) | ~.37/run |
| `full` (Opus persona) | **`/ship` and pre-merge** | ~72s (baseline) | ~.27/run |

---

## Step 3.4: Test Coverage Audit

100% coverage is the goal — every untested path is a path where bugs hide and vibe coding becomes yolo coding. Evaluate what was ACTUALLY coded (from the diff), not what was planned.

**0. Before/after test count:**

```bash
# Count test files before any generation
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
```

Store this number for the PR body.

**1. Trace every codepath changed** using `git diff origin/<base>...HEAD`:

Read every changed file. For each one, trace how data flows through the code — don't just list functions, actually follow the execution:

1. **Read the diff.** For each changed file, read the full file (not just the diff hunk) to understand context.
2. **Trace data flow.** Starting from each entry point (route handler, exported function, event listener, component render), follow the data through every branch:
   - Where does input come from? (request params, props, database, API call)
   - What transforms it? (validation, mapping, computation)
   - Where does it go? (database write, API response, rendered output, side effect)
   - What can go wrong at each step? (null/undefined, invalid input, network failure, empty collection)
3. **Diagram the execution.** For each changed file, draw an ASCII diagram showing:
   - Every function/method that was added or modified
   - Every conditional branch (if/else, switch, ternary, guard clause, early return)
   - Every error path (try/catch, rescue, error boundary, fallback)
   - Every call to another function (trace into it — does IT have untested branches?)
   - Every edge: what happens with null input? Empty array? Invalid type?

This is the critical step — you're building a map of every line of code that can execute differently based on input. Every branch in this diagram needs a test.

**2. Map user flows, interactions, and error states:**

Code coverage isn't enough — you need to cover how real users interact with the changed code. For each changed feature, think through:

- **User flows:** What sequence of actions does a user take that touches this code? Map the full journey (e.g., "user clicks 'Pay' → form validates → API call → success/failure screen"). Each step in the journey needs a test.
- **Interaction edge cases:** What happens when the user does something unexpected?
  - Double-click/rapid resubmit
  - Navigate away mid-operation (back button, close tab, click another link)
  - Submit with stale data (page sat open for 30 minutes, session expired)
  - Slow connection (API takes 10 seconds — what does the user see?)
  - Concurrent actions (two tabs, same form)
- **Error states the user can see:** For every error the code handles, what does the user actually experience?
  - Is there a clear error message or a silent failure?
  - Can the user recover (retry, go back, fix input) or are they stuck?
  - What happens with no network? With a 500 from the API? With invalid data from the server?
- **Empty/zero/boundary states:** What does the UI show with zero results? With 10,000 results? With a single character input? With maximum-length input?

Add these to your diagram alongside the code branches. A user flow with no test is just as much a gap as an untested if/else.

**3. Check each branch against existing tests:**

Go through your diagram branch by branch — both code paths AND user flows. For each one, search for a test that exercises it:
- Function `processPayment()` → look for `billing.test.ts`, `billing.spec.ts`, `test/billing_test.rb`
- An if/else → look for tests covering BOTH the true AND false path
- An error handler → look for a test that triggers that specific error condition
- A call to `helperFn()` that has its own branches → those branches need tests too
- A user flow → look for an integration or E2E test that walks through the journey
- An interaction edge case → look for a test that simulates the unexpected action

Quality scoring rubric:
- ★★★  Tests behavior with edge cases AND error paths
- ★★   Tests correct behavior, happy path only
- ★    Smoke test / existence check / trivial assertion (e.g., "it renders", "it doesn't throw")

**4. Output ASCII coverage diagram:**

Include BOTH code paths and user flows in the same diagram:

```
CODE PATH COVERAGE
===========================
[+] src/services/billing.ts
    │
    ├── processPayment()
    │   ├── [★★★ TESTED] Happy path + card declined + timeout — billing.test.ts:42
    │   ├── [GAP]         Network timeout — NO TEST
    │   └── [GAP]         Invalid currency — NO TEST
    │
    └── refundPayment()
        ├── [★★  TESTED] Full refund — billing.test.ts:89
        └── [★   TESTED] Partial refund (checks non-throw only) — billing.test.ts:101

USER FLOW COVERAGE
===========================
[+] Payment checkout flow
    │
    ├── [★★★ TESTED] Complete purchase — checkout.e2e.ts:15
    ├── [GAP]         Double-click submit — NO TEST
    ├── [GAP]         Navigate away during payment — NO TEST
    └── [★   TESTED] Form validation errors (checks render only) — checkout.test.ts:40

[+] Error states
    │
    ├── [★★  TESTED] Card declined message — billing.test.ts:58
    ├── [GAP]         Network timeout UX (what does user see?) — NO TEST
    └── [GAP]         Empty cart submission — NO TEST

─────────────────────────────────
COVERAGE: 5/12 paths tested (42%)
  Code paths: 3/5 (60%)
  User flows: 2/7 (29%)
QUALITY:  ★★★: 2  ★★: 2  ★: 1
GAPS: 7 paths need tests
─────────────────────────────────
```

**Fast path:** All paths covered → "Step 3.4: All new code paths have test coverage ✓" Continue.

**5. Generate tests for uncovered paths:**

If test framework detected (or bootstrapped in Step 2.5):
- Prioritize error handlers and edge cases first (happy paths are more likely already tested)
- Read 2-3 existing test files to match conventions exactly
- Generate unit tests. Mock all external dependencies (DB, API, Redis).
- Write tests that exercise the specific uncovered path with real assertions
- Run each test. Passes → commit as `test: coverage for {feature}`
- Fails → fix once. Still fails → revert, note gap in diagram.

Caps: 30 code paths max, 20 tests generated max (code + user flow combined), 2-min per-test exploration cap.

If no test framework AND user declined bootstrap → diagram only, no generation. Note: "Test generation skipped — no test framework configured."

**Diff is test-only changes:** Skip Step 3.4 entirely: "No new application code paths to audit."

**6. After-count and coverage summary:**

```bash
# Count test files after generation
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
```

For PR body: `Tests: {before} → {after} (+{delta} new)`
Coverage line: `Test Coverage Audit: N new code paths. M covered (X%). K tests generated, J committed.`

---

## Step 3.5: Pre-Landing Review

Review the diff for structural issues that tests don't catch.

1. Read `.claude/skills/review/checklist.md`. If the file cannot be read, **STOP** and report the error.

2. Run `git diff origin/<base>` to get the full diff (scoped to feature changes against the freshly-fetched base branch).

3. Apply the review checklist in two passes:
   - **Pass 1 (CRITICAL):** SQL & Data Safety, LLM Output Trust Boundary
   - **Pass 2 (INFORMATIONAL):** All remaining categories

## Design Review (conditional, diff-scoped)

Check if the diff touches frontend files using `gstack-diff-scope`:

```bash
source <(~/.claude/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null)
```

**If `SCOPE_FRONTEND=false`:** Skip design review silently. No output.

**If `SCOPE_FRONTEND=true`:**

1. **Check for DESIGN.md.** If `DESIGN.md` or `design-system.md` exists in the repo root, read it. All design findings are calibrated against it — patterns blessed in DESIGN.md are not flagged. If not found, use universal design principles.

2. **Read `.claude/skills/review/design-checklist.md`.** If the file cannot be read, skip design review with a note: "Design checklist not found — skipping design review."

3. **Read each changed frontend file** (full file, not just diff hunks). Frontend files are identified by the patterns listed in the checklist.

4. **Apply the design checklist** against the changed files. For each item:
   - **[HIGH] mechanical CSS fix** (`outline: none`, `!important`, `font-size < 16px`): classify as AUTO-FIX
   - **[HIGH/MEDIUM] design judgment needed**: classify as ASK
   - **[LOW] intent-based detection**: present as "Possible — verify visually or run /design-review"

5. **Include findings** in the review output under a "Design Review" header, following the output format in the checklist. Design findings merge with code review findings into the same Fix-First flow.

6. **Log the result** for the Review Readiness Dashboard:

```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"design-review-lite","timestamp":"TIMESTAMP","status":"STATUS","findings":N,"auto_fixed":M,"commit":"COMMIT"}'
```

Substitute: TIMESTAMP = ISO 8601 datetime, STATUS = "clean" if 0 findings or "issues_found", N = total findings, M = auto-fixed count, COMMIT = output of `git rev-parse --short HEAD`.

   Include any design findings alongside the code review findings. They follow the same Fix-First flow below.

4. **Classify each finding as AUTO-FIX or ASK** per the Fix-First Heuristic in
   checklist.md. Critical findings lean toward ASK; informational lean toward AUTO-FIX.

5. **Auto-fix all AUTO-FIX items.** Apply each fix. Output one line per fix:
   `[AUTO-FIXED] [file:line] Problem → what you did`

6. **If ASK items remain,** present them in ONE AskUserQuestion:
   - List each with number, severity, problem, recommended fix
   - Per-item options: A) Fix  B) Skip
   - Overall RECOMMENDATION
   - If 3 or fewer ASK items, you may use individual AskUserQuestion calls instead

7. **After all fixes (auto + user-approved):**
   - If ANY fixes were applied: commit fixed files by name (`git add <fixed-files> && git commit -m "fix: pre-landing review fixes"`), then **STOP** and tell the user to run `/ship` again to re-test.
   - If no fixes applied (all ASK items skipped, or no issues found): continue to Step 4.

8. Output summary: `Pre-Landing Review: N issues — M auto-fixed, K asked (J fixed, L skipped)`

   If no issues found: `Pre-Landing Review: No issues found.`

Save the review output — it goes into the PR body in Step 8.

---

## Step 3.75: Address Greptile review comments (if PR exists)

Read `.claude/skills/review/greptile-triage.md` and follow the fetch, filter, classify, and **escalation detection** steps.

**If no PR exists, `gh` fails, API returns an error, or there are zero Greptile comments:** Skip this step silently. Continue to Step 4.

**If Greptile comments are found:**

Include a Greptile summary in your output: `+ N Greptile comments (X valid, Y fixed, Z FP)`

Before replying to any comment, run the **Escalation Detection** algorithm from greptile-triage.md to determine whether to use Tier 1 (friendly) or Tier 2 (firm) reply templates.

For each classified comment:

**VALID & ACTIONABLE:** Use AskUserQuestion with:
- The comment (file:line or [top-level] + body summary + permalink URL)
- `RECOMMENDATION: Choose A because [one-line reason]`
- Options: A) Fix now, B) Acknowledge and ship anyway, C) It's a false positive
- If user chooses A: apply the fix, commit the fixed files (`git add <fixed-files> && git commit -m "fix: address Greptile review — <brief description>"`), reply using the **Fix reply template** from greptile-triage.md (include inline diff + explanation), and save to both per-project and global greptile-history (type: fix).
- If user chooses C: reply using the **False Positive reply template** from greptile-triage.md (include evidence + suggested re-rank), save to both per-project and global greptile-history (type: fp).

**VALID BUT ALREADY FIXED:** Reply using the **Already Fixed reply template** from greptile-triage.md — no AskUserQuestion needed:
- Include what was done and the fixing commit SHA
- Save to both per-project and global greptile-history (type: already-fixed)

**FALSE POSITIVE:** Use AskUserQuestion:
- Show the comment and why you think it's wrong (file:line or [top-level] + body summary + permalink URL)
- Options:
  - A) Reply to Greptile explaining the false positive (recommended if clearly wrong)
  - B) Fix it anyway (if trivial)
  - C) Ignore silently
- If user chooses A: reply using the **False Positive reply template** from greptile-triage.md (include evidence + suggested re-rank), save to both per-project and global greptile-history (type: fp)

**SUPPRESSED:** Skip silently — these are known false positives from previous triage.

**After all comments are resolved:** If any fixes were applied, the tests from Step 3 are now stale. **Re-run tests** (Step 3) before continuing to Step 4. If no fixes were applied, continue to Step 4.

---

## Step 3.8: Codex review

Check if the Codex CLI is available and read the user's Codex review preference:

```bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
CODEX_REVIEWS_CFG=$(~/.claude/skills/gstack/bin/gstack-config get codex_reviews 2>/dev/null || true)
echo "CODEX_REVIEWS: ${CODEX_REVIEWS_CFG:-not_set}"
```

If `CODEX_NOT_AVAILABLE`: skip this step silently. Continue to the next step.

If `CODEX_REVIEWS` is `disabled`: skip this step silently. Continue to the next step.

If `CODEX_REVIEWS` is `enabled`: run both code review and adversarial challenge automatically (no prompt). Jump to the "Run Codex" section below.

If `CODEX_REVIEWS` is `not_set`: use AskUserQuestion to offer the one-time adoption prompt:

```
GStack recommends enabling Codex code reviews — Codex is the super smart quiet engineer friend who will save your butt.

A) Enable for all future runs (recommended, default)
B) Try it for now, ask me again later
C) No thanks, don't ask me again
```

If the user chooses A: persist the setting and run both:
```bash
~/.claude/skills/gstack/bin/gstack-config set codex_reviews enabled
```

If the user chooses B: run both this time but do not persist any setting.

If the user chooses C: persist the opt-out and skip:
```bash
~/.claude/skills/gstack/bin/gstack-config set codex_reviews disabled
```
Then skip this step. Continue to the next step.

### Run Codex

Always run **both** code review and adversarial challenge. Use a 5-minute timeout (`timeout: 300000`) on each Bash call.

First, create a temp file for stderr capture:
```bash
TMPERR=$(mktemp /tmp/codex-review-XXXXXXXX)
```

**Code review:** Run:
```bash
codex review --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
```

After the command completes, read stderr for cost/error info:
```bash
cat "$TMPERR"
```

Present the full output verbatim under a `CODEX SAYS (code review):` header:

```
CODEX SAYS (code review):
════════════════════════════════════════════════════════════
<full codex output, verbatim — do not truncate or summarize>
════════════════════════════════════════════════════════════
GATE: PASS                    Tokens: N | Est. cost: ~$X.XX
```

Check the output for `[P1]` markers. If found: `GATE: FAIL`. If no `[P1]`: `GATE: PASS`.

**If GATE is FAIL:** use AskUserQuestion:

```
Codex found N critical issues in the diff.

A) Investigate and fix now (recommended)
B) Ship anyway — these issues may cause production problems
```

If the user chooses A: read the Codex findings carefully and work to address them. After fixing, re-run tests (Step 3) since code has changed. Then re-run `codex review` to verify the gate is now PASS.

If the user chooses B: continue to the next step.

### Error handling (code review)

Before persisting the gate result, check for errors. All errors are non-blocking — Codex is a quality enhancement, not a prerequisite. Check `$TMPERR` output (already read above) for error indicators:

- **Auth failure:** If stderr contains "auth", "login", "unauthorized", or "API key", tell the user: "Codex authentication failed. Run \`codex login\` in your terminal to authenticate via ChatGPT." Do NOT persist a review log entry. Continue to the adversarial step (it will likely fail too, but try anyway).
- **Timeout:** If the Bash call times out (5 min), tell the user: "Codex timed out after 5 minutes. The diff may be too large or the API may be slow." Do NOT persist a review log entry. Skip to cleanup.
- **Empty response:** If codex returned no stdout output, tell the user: "Codex returned no response. Stderr: <paste relevant error>." Do NOT persist a review log entry. Skip to cleanup.

**Only if codex produced a real review (non-empty stdout):** Persist the code review result:
```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"codex-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","gate":"GATE","commit":"'"$(git rev-parse --short HEAD)"'"}'
```

Substitute: STATUS ("clean" if PASS, "issues_found" if FAIL), GATE ("pass" or "fail").

**Adversarial challenge:** Run:
```bash
TMPERR_ADV=$(mktemp /tmp/codex-adv-XXXXXXXX)
codex exec "Review the changes on this branch against the base branch. Run git diff origin/<base> to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems." -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_ADV"
```

After the command completes, read adversarial stderr:
```bash
cat "$TMPERR_ADV"
```

Present the full output verbatim under a `CODEX SAYS (adversarial challenge):` header. This is informational — it never blocks shipping. If the adversarial command timed out or returned no output, note this to the user and continue.

**Cleanup:** Run `rm -f "$TMPERR" "$TMPERR_ADV"` after processing.

---

## Step 4: Version bump (auto-decide)

1. Read the current `VERSION` file (4-digit format: `MAJOR.MINOR.PATCH.MICRO`)

2. **Auto-decide the bump level based on the diff:**
   - Count lines changed (`git diff origin/<base>...HEAD --stat | tail -1`)
   - **MICRO** (4th digit): < 50 lines changed, trivial tweaks, typos, config
   - **PATCH** (3rd digit): 50+ lines changed, bug fixes, small-medium features
   - **MINOR** (2nd digit): **ASK the user** — only for major features or significant architectural changes
   - **MAJOR** (1st digit): **ASK the user** — only for milestones or breaking changes

3. Compute the new version:
   - Bumping a digit resets all digits to its right to 0
   - Example: `0.19.1.0` + PATCH → `0.19.2.0`

4. Write the new version to the `VERSION` file.

---

## Step 5: CHANGELOG (auto-generate)

1. Read `CHANGELOG.md` header to know the format.

2. Auto-generate the entry from **ALL commits on the branch** (not just recent ones):
   - Use `git log <base>..HEAD --oneline` to see every commit being shipped
   - Use `git diff <base>...HEAD` to see the full diff against the base branch
   - The CHANGELOG entry must be comprehensive of ALL changes going into the PR
   - If existing CHANGELOG entries on the branch already cover some commits, replace them with one unified entry for the new version
   - Categorize changes into applicable sections:
     - `### Added` — new features
     - `### Changed` — changes to existing functionality
     - `### Fixed` — bug fixes
     - `### Removed` — removed features
   - Write concise, descriptive bullet points
   - Insert after the file header (line 5), dated today
   - Format: `## [X.Y.Z.W] - YYYY-MM-DD`

**Do NOT ask the user to describe changes.** Infer from the diff and commit history.

---

## Step 5.5: TODOS.md (auto-update)

Cross-reference the project's TODOS.md against the changes being shipped. Mark completed items automatically; prompt only if the file is missing or disorganized.

Read `.claude/skills/review/TODOS-format.md` for the canonical format reference.

**1. Check if TODOS.md exists** in the repository root.

**If TODOS.md does not exist:** Use AskUserQuestion:
- Message: "GStack recommends maintaining a TODOS.md organized by skill/component, then priority (P0 at top through P4, then Completed at bottom). See TODOS-format.md for the full format. Would you like to create one?"
- Options: A) Create it now, B) Skip for now
- If A: Create `TODOS.md` with a skeleton (# TODOS heading + ## Completed section). Continue to step 3.
- If B: Skip the rest of Step 5.5. Continue to Step 6.

**2. Check structure and organization:**

Read TODOS.md and verify it follows the recommended structure:
- Items grouped under `## <Skill/Component>` headings
- Each item has `**Priority:**` field with P0-P4 value
- A `## Completed` section at the bottom

**If disorganized** (missing priority fields, no component groupings, no Completed section): Use AskUserQuestion:
- Message: "TODOS.md doesn't follow the recommended structure (skill/component groupings, P0-P4 priority, Completed section). Would you like to reorganize it?"
- Options: A) Reorganize now (recommended), B) Leave as-is
- If A: Reorganize in-place following TODOS-format.md. Preserve all content — only restructure, never delete items.
- If B: Continue to step 3 without restructuring.

**3. Detect completed TODOs:**

This step is fully automatic — no user interaction.

Use the diff and commit history already gathered in earlier steps:
- `git diff <base>...HEAD` (full diff against the base branch)
- `git log <base>..HEAD --oneline` (all commits being shipped)

For each TODO item, check if the changes in this PR complete it by:
- Matching commit messages against the TODO title and description
- Checking if files referenced in the TODO appear in the diff
- Checking if the TODO's described work matches the functional changes

**Be conservative:** Only mark a TODO as completed if there is clear evidence in the diff. If uncertain, leave it alone.

**4. Move completed items** to the `## Completed` section at the bottom. Append: `**Completed:** vX.Y.Z (YYYY-MM-DD)`

**5. Output summary:**
- `TODOS.md: N items marked complete (item1, item2, ...). M items remaining.`
- Or: `TODOS.md: No completed items detected. M items remaining.`
- Or: `TODOS.md: Created.` / `TODOS.md: Reorganized.`

**6. Defensive:** If TODOS.md cannot be written (permission error, disk full), warn the user and continue. Never stop the ship workflow for a TODOS failure.

Save this summary — it goes into the PR body in Step 8.

---

## Step 6: Commit (bisectable chunks)

**Goal:** Create small, logical commits that work well with `git bisect` and help LLMs understand what changed.

1. Analyze the diff and group changes into logical commits. Each commit should represent **one coherent change** — not one file, but one logical unit.

2. **Commit ordering** (earlier commits first):
   - **Infrastructure:** migrations, config changes, route additions
   - **Models & services:** new models, services, concerns (with their tests)
   - **Controllers & views:** controllers, views, JS/React components (with their tests)
   - **VERSION + CHANGELOG + TODOS.md:** always in the final commit

3. **Rules for splitting:**
   - A model and its test file go in the same commit
   - A service and its test file go in the same commit
   - A controller, its views, and its test go in the same commit
   - Migrations are their own commit (or grouped with the model they support)
   - Config/route changes can group with the feature they enable
   - If the total diff is small (< 50 lines across < 4 files), a single commit is fine

4. **Each commit must be independently valid** — no broken imports, no references to code that doesn't exist yet. Order commits so dependencies come first.

5. Compose each commit message:
   - First line: `<type>: <summary>` (type = feat/fix/chore/refactor/docs)
   - Body: brief description of what this commit contains
   - Only the **final commit** (VERSION + CHANGELOG) gets the version tag and co-author trailer:

```bash
git commit -m "$(cat <<'EOF'
chore: bump version and changelog (vX.Y.Z.W)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Step 6.5: Verification Gate

**IRON LAW: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.**

Before pushing, re-verify if code changed during Steps 4-6:

1. **Test verification:** If ANY code changed after Step 3's test run (fixes from review findings, CHANGELOG edits don't count), re-run the test suite. Paste fresh output. Stale output from Step 3 is NOT acceptable.

2. **Build verification:** If the project has a build step, run it. Paste output.

3. **Rationalization prevention:**
   - "Should work now" → RUN IT.
   - "I'm confident" → Confidence is not evidence.
   - "I already tested earlier" → Code changed since then. Test again.
   - "It's a trivial change" → Trivial changes break production.

**If tests fail here:** STOP. Do not push. Fix the issue and return to Step 3.

Claiming work is complete without verification is dishonesty, not efficiency.

---

## Step 7: Push

Push to the remote with upstream tracking:

```bash
git push -u origin <branch-name>
```

---

## Step 8: Create PR

Create a pull request using `gh`:

```bash
gh pr create --base <base> --title "<type>: <summary>" --body "$(cat <<'EOF'
## Summary
<bullet points from CHANGELOG>

## Test Coverage
<coverage diagram from Step 3.4, or "All new code paths have test coverage.">
<If Step 3.4 ran: "Tests: {before} → {after} (+{delta} new)">

## Pre-Landing Review
<findings from Step 3.5 code review, or "No issues found.">

## Design Review
<If design review ran: "Design Review (lite): N findings — M auto-fixed, K skipped. AI Slop: clean/N issues.">
<If no frontend files changed: "No frontend files changed — design review skipped.">

## Eval Results
<If evals ran: suite names, pass/fail counts, cost dashboard summary. If skipped: "No prompt-related files changed — evals skipped.">

## Greptile Review
<If Greptile comments were found: bullet list with [FIXED] / [FALSE POSITIVE] / [ALREADY FIXED] tag + one-line summary per comment>
<If no Greptile comments found: "No Greptile comments.">
<If no PR existed during Step 3.75: omit this section entirely>

## TODOS
<If items marked complete: bullet list of completed items with version>
<If no items completed: "No TODO items completed in this PR.">
<If TODOS.md created or reorganized: note that>
<If TODOS.md doesn't exist and user skipped: omit this section>

## Test plan
- [x] All Rails tests pass (N runs, 0 failures)
- [x] All Vitest tests pass (N tests)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Output the PR URL** — then proceed to Step 8.5.

---

## Step 8.5: Auto-invoke /document-release

After the PR is created, automatically sync project documentation. Read the
`document-release/SKILL.md` skill file (adjacent to this skill's directory) and
execute its full workflow:

1. Read the `/document-release` skill: `cat /Users/brandonqueener/.claude/skills/ship/../document-release/SKILL.md`
2. Follow its instructions — it reads all .md files in the project, cross-references
   the diff, and updates anything that drifted (README, ARCHITECTURE, CONTRIBUTING,
   CLAUDE.md, TODOS, etc.)
3. If any docs were updated, commit the changes and push to the same branch:
   ```bash
   git add -A && git commit -m "docs: sync documentation with shipped changes" && git push
   ```
4. If no docs needed updating, say "Documentation is current — no updates needed."

This step is automatic. Do not ask the user for confirmation. The goal is zero-friction
doc updates — the user runs `/ship` and documentation stays current without a separate command.

---

## Important Rules

- **Never skip tests.** If tests fail, stop.
- **Never skip the pre-landing review.** If checklist.md is unreadable, stop.
- **Never force push.** Use regular `git push` only.
- **Never ask for trivial confirmations** (e.g., "ready to push?", "create PR?"). DO stop for: version bumps (MINOR/MAJOR), pre-landing review findings (ASK items), Codex critical findings ([P1]), and the one-time Codex adoption prompt.
- **Always use the 4-digit version format** from the VERSION file.
- **Date format in CHANGELOG:** `YYYY-MM-DD`
- **Split commits for bisectability** — each commit = one logical change.
- **TODOS.md completion detection must be conservative.** Only mark items as completed when the diff clearly shows the work is done.
- **Use Greptile reply templates from greptile-triage.md.** Every reply includes evidence (inline diff, code references, re-rank suggestion). Never post vague replies.
- **Never push without fresh verification evidence.** If code changed after Step 3 tests, re-run before pushing.
- **Step 3.4 generates coverage tests.** They must pass before committing. Never commit failing tests.
- **The goal is: user says `/ship`, next thing they see is the review + PR URL + auto-synced docs.**

### Prompt 3

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   - **Original request**: User was implementing Phase 8: Growth & Retention for Local Roots (local pickup marketplace)
   - **Previous session**: Completed `/review` (fixed 3 issues) and started `/qa` testing
   - **This session**: Continued `/qa` Phase 4 (Explore) testing seller analytics, then completed QA with report (health score 95/100), then user invoked `/ship` to create a PR
   - **Current request**: User invoked `/ship` to ship Phase 8 changes. First attempt aborted (on `main` branch). User said "We should probably create a feature branch." Feature branch `phase-8-growth-retention` was created with 5 clean commits. User invoked `/ship` again from the feature branch. The `/ship` skill instructions have been fully loaded and the workflow needs to execute.

2. Key Technical Concepts:
   - **Local Roots**: Go backend + Next.js App Router frontend + PostgreSQL monorepo
   - **Phase 8 scope**: Re-engagement cron, seller analytics dashboard (MetricCard, DeltaArrow, StarRating, PayoutStatusChip, Top Products, Revenue by Cycle), public store profiles/SEO (city pages, sitemap, robots, OG images, JSON-LD), payout hardening (transfer retry), waitlist email capture, seller weekly digest, subscriber milestones, review prompts
   - **Ship workflow**: Preamble → Step 0 (detect base) → Step 1 (pre-flight) → Step 2 (merge base) → Step 2.5 (test bootstrap) → Step 3 (run tests) → Step 3.4 (coverage audit) → Step 3.5 (pre-landing review) → Step 4 (version bump) → Step 5 (changelog) → Step 5.5 (TODOS) → Step 6 (commits) → Step 6.5 (verification gate) → Step 7 (push) → Step 8 (create PR) → Step 8.5 (document-release)
   - **Test commands**: Frontend: `pnpm typecheck && pnpm lint`; Backend: `cd backend && go test ./...`
   - **This is a monorepo** — Go backend tests and Next.js frontend linting/typechecking are the test suites (no `bin/test-lane` or `npm run test` vitest — those are from the /ship template for Rails apps)
   - **Existing test infrastructure**: Playwright e2e in `e2e/` directory, Go stdlib tests in `backend/`, no frontend unit test framework

3. Files and Code Sections:
   - **`frontend/src/app/seller/stores/[storeId]/page.tsx`**
     - Added Analytics link to seller store management header (ISSUE-001 fix from QA)
     - Changed the header section to wrap Settings and new Analytics link in a flex container:
     ```tsx
     <div className="flex gap-2">
       <Link
         className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
         href={`/seller/stores/${storeId}/analytics`}
       >
         Analytics
       </Link>
       <Link
         className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
         href={`/seller/stores/${storeId}/settings`}
       >
         Settings
       </Link>
     </div>
     ```
   - **`frontend/src/app/seller/stores/[storeId]/analytics/page.tsx`** — Full analytics dashboard with MetricCard, DeltaArrow, StarRating, PayoutStatusChip components, Revenue by Cycle table, Payout History table (355 lines, read in full)
   - **`backend/internal/api/v1/seller_analytics.go`** — Backend analytics endpoint with multiple SQL queries for subscriber metrics, order metrics, revenue by cycle, retention rate, avg rating, subscriber trend, revenue growth, top products, no-show rate, payout history (314 lines, read in full)
   - **`backend/internal/api/v1/internal_transfer_retry.go`** — Transfer retry logic (previously fixed: `total_cents` → `subtotal_cents`)
   - **`frontend/src/app/farms/[city]/page.tsx`** — City landing pages with JSON-LD (previously fixed: `@id` URL)
   - **`frontend/src/app/sitemap.ts`** — Sitemap generation (previously fixed: try/catch for network errors)
   - **`frontend/src/app/globals.css`** — Design system CSS variables and utility classes
   - **`frontend/src/app/stores/page.tsx`** — Stores browse page with search, autocomplete, waitlist
   - **`.gstack/qa-reports/qa-report-localhost-3000-2026-03-21.md`** — Full QA report (health score 95/100)
   - **`.gstack/qa-reports/baseline.json`** — QA baseline data
   - **5 pending migrations**: `0027_reengagement_tracking.sql` through `0031_waitlist.sql`

4. Errors and fixes:
   - **Analytics page showing "Unable to load analytics"**: The `/v1/seller/stores/{id}/payouts` endpoint returned 500 because `transfer_error` and `transfer_retry_count` columns didn't exist in the orders table. Fixed by running 5 pending migrations (0027-0031): `DATABASE_URL="postgres://localroots:localroots@localhost:5432/localroots?sslmode=disable" go run ./cmd/migrate up`
   - **Stale auth token**: Browser had a JWT from a previous backend process with a different JWT_SECRET. Fixed by getting a fresh token via `POST /v1/auth/login` and setting it in localStorage, but ultimately needed to reload the page after running migrations.
   - **`/ship` aborted on main branch**: Ship requires a feature branch. Fixed by creating `phase-8-growth-retention` branch from `ba9b393`, cherry-picking all Phase 8 changes with `--no-commit`, then creating 5 clean bisectable commits.
   - **`.gstack/` directory gitignored**: Couldn't commit QA reports. Skipped — only committed docs and TODOS.
   - **`.gitignore` had unrelated modification**: Reverted with `git checkout -- .gitignore`.

5. Problem Solving:
   - **QA testing seller analytics**: Traced the 500 error through the API, identified missing DB columns, ran migrations, verified the full analytics dashboard renders correctly with all Phase 8 components
   - **Discoverability bug**: Found that the analytics page had no navigation link from the store management page. Added an "Analytics" button next to "Settings" and verified it navigates correctly.
   - **Feature branch creation**: Since all Phase 8 work was on `main`, created a clean feature branch by cherry-picking all changes `--no-commit` and reorganizing into 5 logical, bisectable commits grouped by: migrations → backend services → analytics dashboard → frontend SEO → docs
   - **Mobile responsive testing**: Verified homepage, stores page, and analytics page at 375x812 viewport — found minor label truncation issue (deferred as low severity)

6. All user messages:
   - (Implicit continuation from previous session — no explicit first message, picked up from summary)
   - (Several implicit approvals/continues after screenshots were shown during QA)
   - `/ship` — User invoked the ship slash command
   - "We should probably create a feature branch" — User agreed to create a feature branch after `/ship` aborted on main
   - `/ship` — User invoked ship again after feature branch was created (this is the current active request)

7. Pending Tasks:
   - **Execute the `/ship` workflow** from the `phase-8-growth-retention` branch — the full skill instructions have been loaded and need to be executed starting from the preamble
   - The ship workflow steps: preamble → detect base branch (main) → pre-flight → merge base → test framework bootstrap → run tests (`pnpm typecheck && pnpm lint` + `cd backend && go test ./...`) → coverage audit → pre-landing review → version bump → changelog → TODOS update → commit VERSION/CHANGELOG → verification gate → push → create PR → document-release

8. Current Work:
   The user invoked `/ship` for the second time. The skill instructions were fully loaded. The current state is:
   - **Current branch**: `phase-8-growth-retention`
   - **Base branch**: `main`
   - **5 commits on branch**:
     - `5d06999` feat: add Phase 8 database migrations (5 files, 44 insertions)
     - `9a4a046` feat: add backend cron jobs for growth & retention (8 files, 772 insertions)
     - `48fa8f4` feat: enhanced seller analytics dashboard (6 files, 415 insertions)
     - `47946e6` feat: public store profiles, SEO, and city pages (7 files, 670 insertions)
     - `3f0b206` docs: Phase 8 implementation plan and TODOS update (2 files, 593 insertions)
   - **Total**: 30 files changed, 2661 insertions, 57 deletions
   - **Working tree**: Clean (git status porcelain is empty)
   - **Backend running**: Port 8080 with `DATABASE_URL` and `JWT_SECRET`
   - **Frontend running**: Port 3000
   - **Remote**: GitHub repo (gh CLI available)
   - The `/ship` preamble has NOT been run yet for this invocation. The workflow needs to start from scratch.
   - **Important**: This project uses Go + Next.js, NOT Rails. Test commands are: `cd backend && go test ./...` and `pnpm typecheck && pnpm lint`. The /ship template references `bin/test-lane` and `npm run test` which don't apply — adapt to this project's actual test commands from CLAUDE.md.

9. Optional Next Step:
   Execute the `/ship` workflow starting with the preamble. The user's most recent explicit request was `/ship` (invoking the ship skill). The skill instructions are fully loaded. Begin with:
   1. Run preamble bash commands
   2. Step 0: Detect base branch (should be `main`)
   3. Step 1: Pre-flight checks (verify on feature branch, check review readiness dashboard)
   4. Continue through the full automated ship workflow
   
   The commits are already well-organized (Step 6 is mostly done), so the workflow should focus on: tests, coverage audit, pre-landing review, VERSION/CHANGELOG creation, push, and PR creation.

If you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: /Users/brandonqueener/.claude/projects/-Users-brandonqueener-Cursor-Projects-Local-Roots/2def5933-7d7d-48c7-9c80-b3730c4d8579.jsonl
Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with "I'll continue" or similar. Pick up the last task as if the break never happened.

### Prompt 4

Base directory for this skill: /Users/brandonqueener/.claude/skills/review

<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## Preamble (run first)

```bash
_UPD=$(~/.claude/skills/gstack/bin/gstack-update-check 2>/dev/null || .claude/skills/gstack/bin/gstack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.gstack/sessions
touch ~/.gstack/sessions/"$PPID"
_SESSIONS=$(find ~/.gstack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.gstack/sessions -mmin +120 -type f -delete 2>/dev/null || true
_CONTRIB=$(~/.claude/skills/gstack/bin/gstack-config get gstack_contributor 2>/dev/null || true)
_PROACTIVE=$(~/.claude/skills/gstack/bin/gstack-config get proactive 2>/dev/null || echo "true")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "PROACTIVE: $_PROACTIVE"
_LAKE_SEEN=$([ -f ~/.gstack/.completeness-intro-seen ] && echo "yes" || echo "no")
echo "LAKE_INTRO: $_LAKE_SEEN"
_TEL=$(~/.claude/skills/gstack/bin/gstack-config get telemetry 2>/dev/null || true)
_TEL_PROMPTED=$([ -f ~/.gstack/.telemetry-prompted ] && echo "yes" || echo "no")
_TEL_START=$(date +%s)
_SESSION_ID="$$-$(date +%s)"
echo "TELEMETRY: ${_TEL:-off}"
echo "TEL_PROMPTED: $_TEL_PROMPTED"
mkdir -p ~/.gstack/analytics
echo '{"skill":"review","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
for _PF in ~/.gstack/analytics/.pending-*; do [ -f "$_PF" ] && ~/.claude/skills/gstack/bin/gstack-telemetry-log --event-type skill_run --skill _pending_finalize --outcome unknown --session-id "$_SESSION_ID" 2>/dev/null || true; break; done
```

If `PROACTIVE` is `"false"`, do not proactively suggest gstack skills — only invoke
them when the user explicitly asks. The user opted out of proactive suggestions.

If output shows `UPGRADE_AVAILABLE <old> <new>`: read `~/.claude/skills/gstack/gstack-upgrade/SKILL.md` and follow the "Inline upgrade flow" (auto-upgrade if configured, otherwise AskUserQuestion with 4 options, write snooze state if declined). If `JUST_UPGRADED <from> <to>`: tell user "Running gstack v{to} (just updated!)" and continue.

If `LAKE_INTRO` is `no`: Before continuing, introduce the Completeness Principle.
Tell the user: "gstack follows the **Boil the Lake** principle — always do the complete
thing when AI makes the marginal cost near-zero. Read more: https://garryslist.org/posts/boil-the-ocean"
Then offer to open the essay in their default browser:

```bash
open https://garryslist.org/posts/boil-the-ocean
touch ~/.gstack/.completeness-intro-seen
```

Only run `open` if the user says yes. Always run `touch` to mark as seen. This only happens once.

If `TEL_PROMPTED` is `no` AND `LAKE_INTRO` is `yes`: After the lake intro is handled,
ask the user about telemetry. Use AskUserQuestion:

> Help gstack get better! Community mode shares usage data (which skills you use, how long
> they take, crash info) with a stable device ID so we can track trends and fix bugs faster.
> No code, file paths, or repo names are ever sent.
> Change anytime with `gstack-config set telemetry off`.

Options:
- A) Help gstack get better! (recommended)
- B) No thanks

If A: run `~/.claude/skills/gstack/bin/gstack-config set telemetry community`

If B: ask a follow-up AskUserQuestion:

> How about anonymous mode? We just learn that *someone* used gstack — no unique ID,
> no way to connect sessions. Just a counter that helps us know if anyone's out there.

Options:
- A) Sure, anonymous is fine
- B) No thanks, fully off

If B→A: run `~/.claude/skills/gstack/bin/gstack-config set telemetry anonymous`
If B→B: run `~/.claude/skills/gstack/bin/gstack-config set telemetry off`

Always run:
```bash
touch ~/.gstack/.telemetry-prompted
```

This only happens once. If `TEL_PROMPTED` is `yes`, skip this entirely.

## AskUserQuestion Format

**ALWAYS follow this structure for every AskUserQuestion call:**
1. **Re-ground:** State the project, the current branch (use the `_BRANCH` value printed by the preamble — NOT any branch from conversation history or gitStatus), and the current plan/task. (1-2 sentences)
2. **Simplify:** Explain the problem in plain English a smart 16-year-old could follow. No raw function names, no internal jargon, no implementation details. Use concrete examples and analogies. Say what it DOES, not what it's called.
3. **Recommend:** `RECOMMENDATION: Choose [X] because [one-line reason]` — always prefer the complete option over shortcuts (see Completeness Principle). Include `Completeness: X/10` for each option. Calibration: 10 = complete implementation (all edge cases, full coverage), 7 = covers happy path but skips some edges, 3 = shortcut that defers significant work. If both options are 8+, pick the higher; if one is ≤5, flag it.
4. **Options:** Lettered options: `A) ... B) ... C) ...` — when an option involves effort, show both scales: `(human: ~X / CC: ~Y)`

Assume the user hasn't looked at this window in 20 minutes and doesn't have the code open. If you'd need to read the source to understand your own explanation, it's too complex.

Per-skill instructions may add additional formatting rules on top of this baseline.

## Completeness Principle — Boil the Lake

AI-assisted coding makes the marginal cost of completeness near-zero. When you present options:

- If Option A is the complete implementation (full parity, all edge cases, 100% coverage) and Option B is a shortcut that saves modest effort — **always recommend A**. The delta between 80 lines and 150 lines is meaningless with CC+gstack. "Good enough" is the wrong instinct when "complete" costs minutes more.
- **Lake vs. ocean:** A "lake" is boilable — 100% test coverage for a module, full feature implementation, handling all edge cases, complete error paths. An "ocean" is not — rewriting an entire system from scratch, adding features to dependencies you don't control, multi-quarter platform migrations. Recommend boiling lakes. Flag oceans as out of scope.
- **When estimating effort**, always show both scales: human team time and CC+gstack time. The compression ratio varies by task type — use this reference:

| Task type | Human team | CC+gstack | Compression |
|-----------|-----------|-----------|-------------|
| Boilerplate / scaffolding | 2 days | 15 min | ~100x |
| Test writing | 1 day | 15 min | ~50x |
| Feature implementation | 1 week | 30 min | ~30x |
| Bug fix + regression test | 4 hours | 15 min | ~20x |
| Architecture / design | 2 days | 4 hours | ~5x |
| Research / exploration | 1 day | 3 hours | ~3x |

- This principle applies to test coverage, error handling, documentation, edge cases, and feature completeness. Don't skip the last 10% to "save time" — with AI, that 10% costs seconds.

**Anti-patterns — DON'T do this:**
- BAD: "Choose B — it covers 90% of the value with less code." (If A is only 70 lines more, choose A.)
- BAD: "We can skip edge case handling to save time." (Edge case handling costs minutes with CC.)
- BAD: "Let's defer test coverage to a follow-up PR." (Tests are the cheapest lake to boil.)
- BAD: Quoting only human-team effort: "This would take 2 weeks." (Say: "2 weeks human / ~1 hour CC.")

## Contributor Mode

If `_CONTRIB` is `true`: you are in **contributor mode**. You're a gstack user who also helps make it better.

**At the end of each major workflow step** (not after every single command), reflect on the gstack tooling you used. Rate your experience 0 to 10. If it wasn't a 10, think about why. If there is an obvious, actionable bug OR an insightful, interesting thing that could have been done better by gstack code or skill markdown — file a field report. Maybe our contributor will help make us better!

**Calibration — this is the bar:** For example, `$B js "await fetch(...)"` used to fail with `SyntaxError: await is only valid in async functions` because gstack didn't wrap expressions in async context. Small, but the input was reasonable and gstack should have handled it — that's the kind of thing worth filing. Things less consequential than this, ignore.

**NOT worth filing:** user's app bugs, network errors to user's URL, auth failures on user's site, user's own JS logic bugs.

**To file:** write `~/.gstack/contributor-logs/{slug}.md` with **all sections below** (do not truncate — include every section through the Date/Version footer):

```
# {Title}

Hey gstack team — ran into this while using /{skill-name}:

**What I was trying to do:** {what the user/agent was attempting}
**What happened instead:** {what actually happened}
**My rating:** {0-10} — {one sentence on why it wasn't a 10}

## Steps to reproduce
1. {step}

## Raw output
```
{paste the actual error or unexpected output here}
```

## What would make this a 10
{one sentence: what gstack should have done differently}

**Date:** {YYYY-MM-DD} | **Version:** {gstack version} | **Skill:** /{skill}
```

Slug: lowercase, hyphens, max 60 chars (e.g. `browse-js-no-await`). Skip if file already exists. Max 3 reports per session. File inline and continue — don't stop the workflow. Tell user: "Filed gstack field report: {title}"

## Completion Status Protocol

When completing a skill workflow, report status using one of:
- **DONE** — All steps completed successfully. Evidence provided for each claim.
- **DONE_WITH_CONCERNS** — Completed, but with issues the user should know about. List each concern.
- **BLOCKED** — Cannot proceed. State what is blocking and what was tried.
- **NEEDS_CONTEXT** — Missing information required to continue. State exactly what you need.

### Escalation

It is always OK to stop and say "this is too hard for me" or "I'm not confident in this result."

Bad work is worse than no work. You will not be penalized for escalating.
- If you have attempted a task 3 times without success, STOP and escalate.
- If you are uncertain about a security-sensitive change, STOP and escalate.
- If the scope of work exceeds what you can verify, STOP and escalate.

Escalation format:
```
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 sentences]
ATTEMPTED: [what you tried]
RECOMMENDATION: [what the user should do next]
```

## Telemetry (run last)

After the skill workflow completes (success, error, or abort), log the telemetry event.
Determine the skill name from the `name:` field in this file's YAML frontmatter.
Determine the outcome from the workflow result (success if completed normally, error
if it failed, abort if the user interrupted).

**PLAN MODE EXCEPTION — ALWAYS RUN:** This command writes telemetry to
`~/.gstack/analytics/` (user config directory, not project files). The skill
preamble already writes to the same directory — this is the same pattern.
Skipping this command loses session duration and outcome data.

Run this bash:

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
~/.claude/skills/gstack/bin/gstack-telemetry-log \
  --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
  --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
```

Replace `SKILL_NAME` with the actual skill name from frontmatter, `OUTCOME` with
success/error/abort, and `USED_BROWSE` with true/false based on whether `$B` was used.
If you cannot determine the outcome, use "unknown". This runs in the background and
never blocks the user.

## Step 0: Detect base branch

Determine which branch this PR targets. Use the result as "the base branch" in all subsequent steps.

1. Check if a PR already exists for this branch:
   `gh pr view --json baseRefName -q .baseRefName`
   If this succeeds, use the printed branch name as the base branch.

2. If no PR exists (command fails), detect the repo's default branch:
   `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`

3. If both commands fail, fall back to `main`.

Print the detected base branch name. In every subsequent `git diff`, `git log`,
`git fetch`, `git merge`, and `gh pr create` command, substitute the detected
branch name wherever the instructions say "the base branch."

---

# Pre-Landing PR Review

You are running the `/review` workflow. Analyze the current branch's diff against the base branch for structural issues that tests don't catch.

---

## Step 1: Check branch

1. Run `git branch --show-current` to get the current branch.
2. If on the base branch, output: **"Nothing to review — you're on the base branch or have no changes against it."** and stop.
3. Run `git fetch origin <base> --quiet && git diff origin/<base> --stat` to check if there's a diff. If no diff, output the same message and stop.

---

## Step 1.5: Scope Drift Detection

Before reviewing code quality, check: **did they build what was requested — nothing more, nothing less?**

1. Read `TODOS.md` (if it exists). Read PR description (`gh pr view --json body --jq .body 2>/dev/null || true`).
   Read commit messages (`git log origin/<base>..HEAD --oneline`).
   **If no PR exists:** rely on commit messages and TODOS.md for stated intent — this is the common case since /review runs before /ship creates the PR.
2. Identify the **stated intent** — what was this branch supposed to accomplish?
3. Run `git diff origin/<base> --stat` and compare the files changed against the stated intent.
4. Evaluate with skepticism:

   **SCOPE CREEP detection:**
   - Files changed that are unrelated to the stated intent
   - New features or refactors not mentioned in the plan
   - "While I was in there..." changes that expand blast radius

   **MISSING REQUIREMENTS detection:**
   - Requirements from TODOS.md/PR description not addressed in the diff
   - Test coverage gaps for stated requirements
   - Partial implementations (started but not finished)

5. Output (before the main review begins):
   ```
   Scope Check: [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
   Intent: <1-line summary of what was requested>
   Delivered: <1-line summary of what the diff actually does>
   [If drift: list each out-of-scope change]
   [If missing: list each unaddressed requirement]
   ```

6. This is **INFORMATIONAL** — does not block the review. Proceed to Step 2.

---

## Step 2: Read the checklist

Read `.claude/skills/review/checklist.md`.

**If the file cannot be read, STOP and report the error.** Do not proceed without the checklist.

---

## Step 2.5: Check for Greptile review comments

Read `.claude/skills/review/greptile-triage.md` and follow the fetch, filter, classify, and **escalation detection** steps.

**If no PR exists, `gh` fails, API returns an error, or there are zero Greptile comments:** Skip this step silently. Greptile integration is additive — the review works without it.

**If Greptile comments are found:** Store the classifications (VALID & ACTIONABLE, VALID BUT ALREADY FIXED, FALSE POSITIVE, SUPPRESSED) — you will need them in Step 5.

---

## Step 3: Get the diff

Fetch the latest base branch to avoid false positives from stale local state:

```bash
git fetch origin <base> --quiet
```

Run `git diff origin/<base>` to get the full diff. This includes both committed and uncommitted changes against the latest base branch.

---

## Step 4: Two-pass review

Apply the checklist against the diff in two passes:

1. **Pass 1 (CRITICAL):** SQL & Data Safety, Race Conditions & Concurrency, LLM Output Trust Boundary, Enum & Value Completeness
2. **Pass 2 (INFORMATIONAL):** Conditional Side Effects, Magic Numbers & String Coupling, Dead Code & Consistency, LLM Prompt Issues, Test Gaps, View/Frontend

**Enum & Value Completeness requires reading code OUTSIDE the diff.** When the diff introduces a new enum value, status, tier, or type constant, use Grep to find all files that reference sibling values, then Read those files to check if the new value is handled. This is the one category where within-diff review is insufficient.

Follow the output format specified in the checklist. Respect the suppressions — do NOT flag items listed in the "DO NOT flag" section.

---

## Step 4.5: Design Review (conditional)

## Design Review (conditional, diff-scoped)

Check if the diff touches frontend files using `gstack-diff-scope`:

```bash
source <(~/.claude/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null)
```

**If `SCOPE_FRONTEND=false`:** Skip design review silently. No output.

**If `SCOPE_FRONTEND=true`:**

1. **Check for DESIGN.md.** If `DESIGN.md` or `design-system.md` exists in the repo root, read it. All design findings are calibrated against it — patterns blessed in DESIGN.md are not flagged. If not found, use universal design principles.

2. **Read `.claude/skills/review/design-checklist.md`.** If the file cannot be read, skip design review with a note: "Design checklist not found — skipping design review."

3. **Read each changed frontend file** (full file, not just diff hunks). Frontend files are identified by the patterns listed in the checklist.

4. **Apply the design checklist** against the changed files. For each item:
   - **[HIGH] mechanical CSS fix** (`outline: none`, `!important`, `font-size < 16px`): classify as AUTO-FIX
   - **[HIGH/MEDIUM] design judgment needed**: classify as ASK
   - **[LOW] intent-based detection**: present as "Possible — verify visually or run /design-review"

5. **Include findings** in the review output under a "Design Review" header, following the output format in the checklist. Design findings merge with code review findings into the same Fix-First flow.

6. **Log the result** for the Review Readiness Dashboard:

```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"design-review-lite","timestamp":"TIMESTAMP","status":"STATUS","findings":N,"auto_fixed":M,"commit":"COMMIT"}'
```

Substitute: TIMESTAMP = ISO 8601 datetime, STATUS = "clean" if 0 findings or "issues_found", N = total findings, M = auto-fixed count, COMMIT = output of `git rev-parse --short HEAD`.

Include any design findings alongside the findings from Step 4. They follow the same Fix-First flow in Step 5 — AUTO-FIX for mechanical CSS fixes, ASK for everything else.

---

## Step 5: Fix-First Review

**Every finding gets action — not just critical ones.**

Output a summary header: `Pre-Landing Review: N issues (X critical, Y informational)`

### Step 5a: Classify each finding

For each finding, classify as AUTO-FIX or ASK per the Fix-First Heuristic in
checklist.md. Critical findings lean toward ASK; informational findings lean
toward AUTO-FIX.

### Step 5b: Auto-fix all AUTO-FIX items

Apply each fix directly. For each one, output a one-line summary:
`[AUTO-FIXED] [file:line] Problem → what you did`

### Step 5c: Batch-ask about ASK items

If there are ASK items remaining, present them in ONE AskUserQuestion:

- List each item with a number, the severity label, the problem, and a recommended fix
- For each item, provide options: A) Fix as recommended, B) Skip
- Include an overall RECOMMENDATION

Example format:
```
I auto-fixed 5 issues. 2 need your input:

1. [CRITICAL] app/models/post.rb:42 — Race condition in status transition
   Fix: Add `WHERE status = 'draft'` to the UPDATE
   → A) Fix  B) Skip

2. [INFORMATIONAL] app/services/generator.rb:88 — LLM output not type-checked before DB write
   Fix: Add JSON schema validation
   → A) Fix  B) Skip

RECOMMENDATION: Fix both — #1 is a real race condition, #2 prevents silent data corruption.
```

If 3 or fewer ASK items, you may use individual AskUserQuestion calls instead of batching.

### Step 5d: Apply user-approved fixes

Apply fixes for items where the user chose "Fix." Output what was fixed.

If no ASK items exist (everything was AUTO-FIX), skip the question entirely.

### Verification of claims

Before producing the final review output:
- If you claim "this pattern is safe" → cite the specific line proving safety
- If you claim "this is handled elsewhere" → read and cite the handling code
- If you claim "tests cover this" → name the test file and method
- Never say "likely handled" or "probably tested" — verify or flag as unknown

**Rationalization prevention:** "This looks fine" is not a finding. Either cite evidence it IS fine, or flag it as unverified.

### Greptile comment resolution

After outputting your own findings, if Greptile comments were classified in Step 2.5:

**Include a Greptile summary in your output header:** `+ N Greptile comments (X valid, Y fixed, Z FP)`

Before replying to any comment, run the **Escalation Detection** algorithm from greptile-triage.md to determine whether to use Tier 1 (friendly) or Tier 2 (firm) reply templates.

1. **VALID & ACTIONABLE comments:** These are included in your findings — they follow the Fix-First flow (auto-fixed if mechanical, batched into ASK if not) (A: Fix it now, B: Acknowledge, C: False positive). If the user chooses A (fix), reply using the **Fix reply template** from greptile-triage.md (include inline diff + explanation). If the user chooses C (false positive), reply using the **False Positive reply template** (include evidence + suggested re-rank), save to both per-project and global greptile-history.

2. **FALSE POSITIVE comments:** Present each one via AskUserQuestion:
   - Show the Greptile comment: file:line (or [top-level]) + body summary + permalink URL
   - Explain concisely why it's a false positive
   - Options:
     - A) Reply to Greptile explaining why this is incorrect (recommended if clearly wrong)
     - B) Fix it anyway (if low-effort and harmless)
     - C) Ignore — don't reply, don't fix

   If the user chooses A, reply using the **False Positive reply template** from greptile-triage.md (include evidence + suggested re-rank), save to both per-project and global greptile-history.

3. **VALID BUT ALREADY FIXED comments:** Reply using the **Already Fixed reply template** from greptile-triage.md — no AskUserQuestion needed:
   - Include what was done and the fixing commit SHA
   - Save to both per-project and global greptile-history

4. **SUPPRESSED comments:** Skip silently — these are known false positives from previous triage.

---

## Step 5.5: TODOS cross-reference

Read `TODOS.md` in the repository root (if it exists). Cross-reference the PR against open TODOs:

- **Does this PR close any open TODOs?** If yes, note which items in your output: "This PR addresses TODO: <title>"
- **Does this PR create work that should become a TODO?** If yes, flag it as an informational finding.
- **Are there related TODOs that provide context for this review?** If yes, reference them when discussing related findings.

If TODOS.md doesn't exist, skip this step silently.

---

## Step 5.6: Documentation staleness check

Cross-reference the diff against documentation files. For each `.md` file in the repo root (README.md, ARCHITECTURE.md, CONTRIBUTING.md, CLAUDE.md, etc.):

1. Check if code changes in the diff affect features, components, or workflows described in that doc file.
2. If the doc file was NOT updated in this branch but the code it describes WAS changed, flag it as an INFORMATIONAL finding:
   "Documentation may be stale: [file] describes [feature/component] but code changed in this branch. Consider running `/document-release`."

This is informational only — never critical. The fix action is `/document-release`.

If no documentation files exist, skip this step silently.

---

## Step 5.7: Codex review

Check if the Codex CLI is available and read the user's Codex review preference:

```bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
CODEX_REVIEWS_CFG=$(~/.claude/skills/gstack/bin/gstack-config get codex_reviews 2>/dev/null || true)
echo "CODEX_REVIEWS: ${CODEX_REVIEWS_CFG:-not_set}"
```

If `CODEX_NOT_AVAILABLE`: skip this step silently. Continue to the next step.

If `CODEX_REVIEWS` is `disabled`: skip this step silently. Continue to the next step.

If `CODEX_REVIEWS` is `enabled`: run both code review and adversarial challenge automatically (no prompt). Jump to the "Run Codex" section below.

If `CODEX_REVIEWS` is `not_set`: use AskUserQuestion to offer the one-time adoption prompt:

```
GStack recommends enabling Codex code reviews — Codex is the super smart quiet engineer friend who will save your butt.

A) Enable for all future runs (recommended, default)
B) Try it for now, ask me again later
C) No thanks, don't ask me again
```

If the user chooses A: persist the setting and run both:
```bash
~/.claude/skills/gstack/bin/gstack-config set codex_reviews enabled
```

If the user chooses B: run both this time but do not persist any setting.

If the user chooses C: persist the opt-out and skip:
```bash
~/.claude/skills/gstack/bin/gstack-config set codex_reviews disabled
```
Then skip this step. Continue to the next step.

### Run Codex

Always run **both** code review and adversarial challenge. Use a 5-minute timeout (`timeout: 300000`) on each Bash call.

First, create a temp file for stderr capture:
```bash
TMPERR=$(mktemp /tmp/codex-review-XXXXXXXX)
```

**Code review:** Run:
```bash
codex review --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
```

After the command completes, read stderr for cost/error info:
```bash
cat "$TMPERR"
```

Present the full output verbatim under a `CODEX SAYS (code review):` header:

```
CODEX SAYS (code review):
════════════════════════════════════════════════════════════
<full codex output, verbatim — do not truncate or summarize>
════════════════════════════════════════════════════════════
GATE: PASS                    Tokens: N | Est. cost: ~$X.XX
```

Check the output for `[P1]` markers. If found: `GATE: FAIL`. If no `[P1]`: `GATE: PASS`.

**If GATE is FAIL:** use AskUserQuestion:

```
Codex found N critical issues in the diff.

A) Investigate and fix now (recommended)
B) Ship anyway — these issues may cause production problems
```

If the user chooses A: read the Codex findings carefully and work to address them. Then re-run `codex review` to verify the gate is now PASS.

If the user chooses B: continue to the next step.

### Error handling (code review)

Before persisting the gate result, check for errors. All errors are non-blocking — Codex is a quality enhancement, not a prerequisite. Check `$TMPERR` output (already read above) for error indicators:

- **Auth failure:** If stderr contains "auth", "login", "unauthorized", or "API key", tell the user: "Codex authentication failed. Run \`codex login\` in your terminal to authenticate via ChatGPT." Do NOT persist a review log entry. Continue to the adversarial step (it will likely fail too, but try anyway).
- **Timeout:** If the Bash call times out (5 min), tell the user: "Codex timed out after 5 minutes. The diff may be too large or the API may be slow." Do NOT persist a review log entry. Skip to cleanup.
- **Empty response:** If codex returned no stdout output, tell the user: "Codex returned no response. Stderr: <paste relevant error>." Do NOT persist a review log entry. Skip to cleanup.

**Only if codex produced a real review (non-empty stdout):** Persist the code review result:
```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"codex-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","gate":"GATE","commit":"'"$(git rev-parse --short HEAD)"'"}'
```

Substitute: STATUS ("clean" if PASS, "issues_found" if FAIL), GATE ("pass" or "fail").

**Adversarial challenge:** Run:
```bash
TMPERR_ADV=$(mktemp /tmp/codex-adv-XXXXXXXX)
codex exec "Review the changes on this branch against the base branch. Run git diff origin/<base> to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems." -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_ADV"
```

After the command completes, read adversarial stderr:
```bash
cat "$TMPERR_ADV"
```

Present the full output verbatim under a `CODEX SAYS (adversarial challenge):` header. This is informational — it never blocks shipping. If the adversarial command timed out or returned no output, note this to the user and continue.

**Cross-model analysis:** After both Codex outputs are presented, compare Codex's findings with your own review findings from the earlier review steps and output:

```
CROSS-MODEL ANALYSIS:
  Both found: [findings that overlap between Claude and Codex]
  Only Codex found: [findings unique to Codex]
  Only Claude found: [findings unique to Claude's review]
  Agreement rate: X% (N/M total unique findings overlap)
```

**Cleanup:** Run `rm -f "$TMPERR" "$TMPERR_ADV"` after processing.

---

## Important Rules

- **Read the FULL diff before commenting.** Do not flag issues already addressed in the diff.
- **Fix-first, not read-only.** AUTO-FIX items are applied directly. ASK items are only applied after user approval. Never commit, push, or create PRs — that's /ship's job.
- **Be terse.** One line problem, one line fix. No preamble.
- **Only flag real problems.** Skip anything that's fine.
- **Use Greptile reply templates from greptile-triage.md.** Every reply includes evidence. Never post vague replies.

### Prompt 5

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   - **Original request**: User is implementing Phase 8: Growth & Retention for Local Roots (local pickup marketplace)
   - **This session**: User invoked `/ship` to create a PR for the `phase-8-growth-retention` branch. The ship workflow detected that the Eng Review was NOT CLEARED (0 logged runs). User was asked and chose **"Abort — run /review first"**. The `/ship` was aborted and `/review` was invoked.
   - **Current active request**: Complete the `/review` workflow on the `phase-8-growth-retention` branch against `main`, then the user will re-run `/ship`.

2. Key Technical Concepts:
   - **Local Roots**: Go backend + Next.js App Router frontend + PostgreSQL monorepo
   - **Phase 8 scope**: Re-engagement cron, seller analytics dashboard (MetricCard, DeltaArrow, StarRating, PayoutStatusChip, Top Products, Revenue by Cycle), public store profiles/SEO (city pages, sitemap, robots, OG images, JSON-LD), payout hardening (transfer retry), waitlist email capture, seller weekly digest, subscriber milestones, review prompts
   - **Test commands**: Frontend: `pnpm typecheck && pnpm lint`; Backend: `cd backend && go test ./...` (NOT Rails — no `bin/test-lane`)
   - **gstack /review workflow**: Preamble → Step 0 (detect base) → Step 1 (check branch) → Step 1.5 (scope drift) → Step 2 (read checklist) → Step 2.5 (Greptile) → Step 3 (get diff) → Step 4 (two-pass review) → Step 4.5 (design review) → Step 5 (fix-first review) → Step 5.5 (TODOS) → Step 5.6 (doc staleness) → Step 5.7 (Codex) → log review result
   - **gstack /ship workflow**: Will resume after /review completes. Steps: preamble → detect base → pre-flight → review readiness → merge base → test bootstrap → run tests → coverage audit → pre-landing review → version bump → changelog → TODOS → commits → verification gate → push → create PR → document-release
   - **Branch**: `phase-8-growth-retention` (5 commits, 28 files, 2494 insertions, 57 deletions)
   - **Base branch**: `main`
   - **Cadence CHECK constraint**: DB enforces `cadence in ('weekly', 'biweekly', 'monthly')` via migration 0006

3. Files and Code Sections:
   - **`TODOS.md`** (root)
     - Read to check scope drift. Contains 2 deferred items: P2 "Next pickup date badge on store cards" and P3 "Formalize design system into DESIGN.md"
     - Scope check result: CLEAN — all Phase 8 changes match stated intent

   - **`backend/internal/api/v1/internal_digest.go`** (new, 94 lines)
     - Seller weekly digest email cron. Queries active stores with subscribers, fetches weekly metrics (active subs, pickups, revenue), sends digest email.
     - N+1 pattern (queries per store) but acceptable for cron with small cardinality.

   - **`backend/internal/api/v1/internal_milestones.go`** (new, 117 lines)
     - Milestone celebration emails (5, 10, 25, 50 pickups). Uses `milestone_emails` table with unique index for idempotency.
     - Potential minor TOCTOU race on check-then-insert (could send duplicate email in extreme concurrency), but unique index prevents data corruption. Single-instance scheduler makes this very unlikely.

   - **`backend/internal/api/v1/internal_reengagement.go`** (new, 190 lines)
     - Two functions: `RunReengagement` (lapsed subscriber nudge) and `RunReviewPrompts` (post-pickup review request)
     - `buyer_name` is scanned from DB but never passed to email template `LapsedSubscriberNudge(storeName, planTitle, storeURL)` — unused variable finding
     - Cadence CASE statement (`weekly`/`biweekly`/`monthly`) is complete per DB CHECK constraint

   - **`backend/internal/api/v1/internal_transfer_retry.go`** (new, 137 lines)
     - Retries failed Stripe seller transfers (up to 3 attempts). Queries orders with `transfer_error IS NOT NULL AND transfer_retry_count < 3`.
     - Uses `subtotal_cents` (previously fixed from `total_cents` in earlier session).

   - **`backend/internal/api/v1/order_helpers.go`** (modified)
     - `transferToSeller` now records transfer failures (transfer_error, transfer_retry_count, transfer_attempted_at) for the retry cron to pick up.

   - **`backend/internal/api/v1/public.go`** (modified, +90 lines)
     - New endpoints: `ListCities` (GET /v1/cities) and `JoinWaitlist` (POST /v1/waitlist)
     - Waitlist uses `ON CONFLICT (lower(email)) DO UPDATE` for idempotency
     - Email validation: `strings.TrimSpace` + `strings.Contains(email, "@")` — basic but functional

   - **`backend/internal/api/v1/seller_analytics.go`** (modified, +149 lines)
     - New analytics: retention rate, avg rating, review count, subscriber trend (12 weeks), revenue growth %, top products, no-show rate, subscriber delta 4w
     - Payout history now includes `transfer_error` and `transfer_retry_count` fields

   - **`backend/internal/email/templates.go`** (modified, +80 lines)
     - New email templates: `LapsedSubscriberNudge`, `PostPickupReviewPrompt`, `MilestoneCelebration`, `SellerWeeklyDigest`, `WaitlistNotification`

   - **`backend/internal/scheduler/scheduler.go`** (modified, +133 lines)
     - Added 5 new scheduled jobs: reengagement (6h), review prompts (30m), transfer retry (1h), milestones (6h), digest (1h, Monday 14:00 UTC only)
     - Each job has panic recovery via `defer func() { if r := recover()... }`

   - **5 migrations** (0027-0031):
     - 0027: `subscriptions.last_reengagement_email_at`
     - 0028: `orders.review_prompt_sent_at`
     - 0029: `orders.transfer_attempted_at`, `transfer_error`, `transfer_retry_count`
     - 0030: `milestone_emails` table with unique index on `(subscription_id, milestone)`
     - 0031: `waitlist` table with unique index on `lower(email)` and geo index

   - **`frontend/src/app/farms/[city]/page.tsx`** (new, 259 lines)
     - City landing pages with SEO metadata, JSON-LD, store grid, empty state, "Explore other cities" section
     - Server component with `await params` (Next.js 15+ pattern)

   - **`frontend/src/app/seller/stores/[storeId]/analytics/page.tsx`** (modified, +164 lines)
     - New components: `DeltaArrow`, `PayoutStatusChip` (4-state: Transferred/Retrying/Failed/Pending)
     - Enhanced MetricCard with `accent` prop
     - New metric rows: retention, no-show rate, avg rating with StarRating, top products section

   - **`frontend/src/app/seller/stores/[storeId]/page.tsx`** (modified)
     - Added Analytics link button next to Settings in header

   - **`frontend/src/app/sitemap.ts`** (rewritten)
     - Now dynamic: fetches stores and cities from API, generates per-store and per-city URLs
     - Graceful error handling with try/catch returning empty arrays

   - **`frontend/src/app/stores/[storeId]/opengraph-image/route.tsx`** (new, 242 lines)
     - Edge runtime OG image generation using `next/og` ImageResponse
     - Renders store name, location, description with Local Roots branding

   - **`frontend/src/app/stores/[storeId]/page.tsx`** (modified, +92 lines)
     - JSON-LD structured data with aggregate rating
     - "What's in the box" section showing latest box previews
     - OG image reference in metadata

   - **`frontend/src/app/stores/page.tsx`** (modified)
     - Waitlist form now calls real API (`POST /v1/waitlist`) instead of just setting local state
     - Catch block sets `notifySubmitted(true)` even on error (graceful degradation)

   - **`frontend/src/lib/api.ts`** (modified, +10 lines)
     - New: `listCities()`, `joinWaitlist()`

   - **`frontend/src/lib/seller-api.ts`** (modified, +21 lines)
     - New types: `TrendPoint`, `TopProduct`
     - Extended `StoreAnalytics` with Phase 8 fields
     - Extended `PayoutHistoryEntry` with `transfer_error`, `transfer_retry_count`

   - **`.claude/skills/review/checklist.md`** — Full review checklist read. Two-pass structure: Pass 1 (CRITICAL): SQL safety, race conditions, LLM trust, enum completeness. Pass 2 (INFORMATIONAL): conditional side effects, magic numbers, dead code, test gaps, etc.

   - **`.claude/skills/review/design-checklist.md`** — Design review checklist read. Covers AI slop detection, typography, spacing, interaction states, DESIGN.md violations.

4. Errors and Fixes:
   - **`/ship` aborted on eng review gate**: The ship workflow detected no logged eng review. User chose to abort and run `/review` first. Telemetry logged for the abort.
   - **Preamble glob error**: `(eval):22: no matches found: /Users/brandonqueener/.gstack/analytics/.pending-*` — benign zsh glob error when no pending files exist. Does not affect functionality.
   - **`gstack-diff-scope` env var not persisting**: The `source <(...)` ran in a subshell, so `SCOPE_FRONTEND` wasn't available in subsequent Bash calls. Determined frontend scope manually from the diff (TSX/TS/CSS files clearly present).

5. Problem Solving:
   - **Scope drift detection**: Verified all 28 changed files align with Phase 8 intent — no scope creep detected.
   - **Cadence completeness**: Verified the CASE statement in reengagement SQL covers all possible cadence values by finding the CHECK constraint in migration 0006: `check (cadence in ('weekly', 'biweekly', 'monthly'))`.
   - **BoxPreviewPublic verification**: Confirmed `getLatestBoxPreview` and `BoxPreviewPublic` type already exist in `api.ts` (not introduced in this diff), so the store detail page's box preview feature has its API method.
   - **Unused variable identification**: Found `buyer_name` is scanned in the reengagement query but never passed to the email template function.

6. All User Messages:
   - (Implicit continuation from previous session — no explicit first user message, conversation resumed from compacted summary)
   - User selected **"Abort — run /review first"** when asked about the eng review gate during `/ship` Step 1 pre-flight
   - (The `/review` skill content was loaded as a system response)

7. Pending Tasks:
   - **Complete `/review` workflow** (currently in Step 4 two-pass review, partially through):
     - Finish Pass 1 (CRITICAL) and Pass 2 (INFORMATIONAL) analysis
     - Step 4.5: Design review (frontend files changed, no DESIGN.md exists)
     - Step 5: Fix-First Review — classify findings as AUTO-FIX or ASK, apply fixes, ask user about ASK items
     - Step 5.5: TODOS cross-reference
     - Step 5.6: Documentation staleness check
     - Step 5.7: Codex review check
     - Log the review result to gstack review system
   - **Re-run `/ship`** after review completes (user will need to invoke this)

8. Current Work:
   The `/review` workflow is in progress. Steps 0-3 are complete (preamble, base branch detection, branch check, scope drift detection, checklist reading, diff fetching). The full backend and frontend diffs have been read and analyzed.

   **Step 4 (Two-Pass Review)** is partially complete. Key findings identified so far:
   
   **CRITICAL (Pass 1):**
   - SQL & Data Safety: All queries use parameterized statements — no issues
   - Race Conditions: Minor TOCTOU in milestone emails (check EXISTS then INSERT), but unique index prevents data corruption and single-instance scheduler makes duplicate emails very unlikely
   - LLM Trust Boundary: No LLM usage — N/A
   - Enum Completeness: Cadence CASE is complete per DB CHECK constraint — no issue

   **INFORMATIONAL (Pass 2) — identified but not yet formally output:**
   - `buyer_name` scanned but unused in `internal_reengagement.go` (dead variable)
   - No Go tests added for 5 new backend files (test gap per CLAUDE.md "New features require tests")
   - `dangerouslySetInnerHTML` with JSON-LD is standard Next.js pattern — very low XSS risk

   **Step 4.5 (Design Review)** was about to begin. The design checklist has been read. No DESIGN.md exists. Frontend files clearly in scope. Need to apply design checklist categories (AI slop, typography, spacing, interaction states) against the changed frontend files.

   The assistant had just finished reading the design checklist and was about to:
   1. Apply the design checklist against changed frontend files
   2. Compile all findings into the Fix-First Review format (Step 5)
   3. Auto-fix mechanical issues and ask about judgment calls

9. Optional Next Step:
   Continue the `/review` workflow from where it left off — complete Step 4 (formalize two-pass review findings), execute Step 4.5 (design review against changed frontend files using the design checklist), then proceed to Step 5 (Fix-First Review: classify findings, auto-fix AUTO-FIX items, present ASK items to user).

   The last work being done was reading the design checklist at `.claude/skills/review/design-checklist.md` after having read the full backend and frontend diffs and verified several potential issues (cadence completeness, BoxPreviewPublic existence, buyer_name unused variable). The next action is to apply both the code review checklist and design checklist findings, then present them in the Fix-First Review format.

If you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: /Users/brandonqueener/.claude/projects/-Users-brandonqueener-Cursor-Projects-Local-Roots/2def5933-7d7d-48c7-9c80-b3730c4d8579.jsonl
Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with "I'll continue" or similar. Pick up the last task as if the break never happened.

## Summary

---

## Review Complete

```
Scope Check: CLEAN
Intent: Phase 8 — Growth & Retention (cron jobs, analytics, SEO, waitlist, digests, milestones)
Delivered: Exactly that — 28 files across backend crons, frontend analytics/SEO/city pages
```

**Pre-Landing Review: 4 issues (0 critical, 4 informational) — 3 auto-fixed, 1 noted**

| # | Severity | File | Problem | Action |
|---|----------|------|---------|--------|
| 1 | INFO | `internal_reengagement.go:32` | Dead `buyer_name` in SQL SELECT | AUTO-FIXED |
| 2 | INFO | `analytics/page.tsx:153` | `showToast` in useEffect deps (infinite loop risk) | AUTO-FIXED |
| 3 | INFO | `analytics/page.tsx:233` | `grid-cols-3` without mobile breakpoint | AUTO-FIXED |
| 4 | INFO | 5 new backend files | No Go tests for cron handlers | Noted — defer to TODOS |

**Design Review (lite): 1 finding — 1 auto-fixed. AI Slop: clean.**

**TODOS: No items closed. No new items required (test gap is informational).**

**Documentation: README.md milestones stale — will be updated by `/document-release` during `/ship`.**

`★ Insight ─────────────────────────────────────`
The `showToast` dependency issue is subtle — it only causes an infinite loop when the API *consistently fails*, creating a feedback cycle: fail → toast → identity change → re-render → re-fetch → fail. The `cancelled` flag prevents state updates after unmount but doesn't break the loop while mounted. The seller store page already solved this with an eslint-disable comment, establishing the pattern.
`─────────────────────────────────────────────────`

**STATUS: DONE** — Eng review complete, 3 auto-fixes applied, all verified (Go builds, typecheck passes, lint passes). You can now re-run `/ship`.
