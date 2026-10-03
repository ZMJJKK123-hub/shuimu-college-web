# Master Instruction & Routing Protocol

> **Mandatory Statement**: Before executing any user instruction regarding development, coding, design, or refactoring, you must **first complete the review of this Master Protocol and perform task intent matching**. Based on the user's actual requirements, dynamically invoke and strictly enforce the corresponding specialized rules detailed below.

---

## 1. Pre-Task Review & Task Routing

Upon receiving a user prompt, it is strictly forbidden to output code in an unstructured or direct manner. You must first perform an internal intent determination and route the request to the designated rules according to the following three scenarios:

| Trigger Scenario | User Intent Characteristics | Mandatory Specialized Rules to Execute | Execution Red Line |
| :--- | :--- | :--- | :--- |
| **Scenario A: New Feature / Module Development** | 0-to-1 requirements, creating new modules, designing new systems | **[Rule 3: New Feature Development (Contract-First Two-Phase Method)]** | **Strictly forbidden to output complete business code directly.** You must output Phase 1 first (architecture / directory structure / interface contracts) and **proactively pause** to await user confirmation. |
| **Scenario B: Legacy Code Refactoring** | Spaghetti code cleanup, decoupling, design optimization, architectural noise reduction | **[Rule 4: Code Refactoring & Decoupling]** | You must first provide an "Architectural Code Smell Diagnosis" and the "Selected Design Patterns," and physically decouple into multiple files/modules for delivery. |
| **Scenario C: Daily Coding / Local Modifications** | Bug fixes, localized code additions, configuration adjustments | **[Rule 1: Code Documentation & Quality Constraints]** + **[Rule 2: System Baseline Rules]** | Every line of code delivered must satisfy strong typing, physical layering, and explicit error handling requirements. |

---

## 2. Universal Invariants

Regardless of whether the current task is routed to Scenario A, B, or C, **the following two baseline standards apply globally as non-negotiable hard constraints**:

1. **Documentation & Comment Baseline**: Any code produced must unconditionally follow **[Rule 1]**.
   - Module imports at the top of files must annotate imported objects and their specific purposes. **Strictly forbid importing modules inside functions or methods; all imports must be declared at the file header.**
   - Classes and public functions must use humanized, architectural docstrings detailing system role, parameter semantics, **explicit boundary conditions & constraints**, global variable dependencies (`Globals Used`), and invocation chains (`Calls`).
   - Internal helper functions must state parameters, return values, single responsibility, and local boundary constraints.
2. **Architecture & Quality Baseline**: Any code organization must unconditionally follow **[Rule 2]**.
   - Strictly forbid mixing business logic with storage/persistence in a single file (presentation, business, and infrastructure layers must be strictly separated).
   - Maintain high cohesion and low coupling; avoid bloated God Classes.
   - Strictly forbid passing weakly typed raw dictionaries, and strictly forbid silently swallowing exceptions.

---

## 3. Execution Sequence

```
[Receive User Task]
│
▼
[1. Identify Intent Pattern] ─── Is it new feature/module development? ─── Yes ──► Execute [Rule 3 · Phase 1] ──► Pause and await user confirmation
│
No
▼
Is it code refactoring/optimization? ─── Yes ──► Execute [Rule 4] Diagnosis & Decoupled Delivery
│
No (Daily coding/modification)
▼
Execute routine development, injecting [Rule 1] documentation rules + [Rule 2] global architectural layering throughout
```

---

# Rule 1: Code Documentation & Traceability Rules

Every piece of code you write or refactor must strictly adhere to the following documentation and commenting standards:

## 1. Module Imports Section (Imports)
- **Top-Level Enforcement**: **Strictly forbid importing modules inside functions, methods, or nested scopes (no inline/deferred imports).** All dependencies must be imported uniformly at the very top of the file.
- Every `import` or `from ... import` at the top of the file must be accompanied by explanatory comments.
- **Comment Contents**:
  1. What module/object is being imported.
  2. The specific purpose of importing it (which capability or feature in the current file this module supports).

## 2. Variables & Constants Standards (Variables)
- **Must Be Commented**:
  - Module-level global constants / configuration variables (indicate meaning, units, or value significance).
  - Class attributes and instance state variables.
  - Critical business workflow variables and core algorithm state variables.
- **Exempt From Comments**:
  - Temporary local variables (e.g., standard loop counters `i, j`, single-use unpacking variables) to avoid unnecessary noise.

## 3. Class Definition Standards (Classes)
Class-level docstrings must adopt a structured format containing the following three parts:
1. **Class Responsibility**: Summarize the core purpose, system role, and application scenario of the class.
2. **Class Variables / Properties Description**: Explain class variables and core instance attributes one by one (name, type, purpose).
3. **Method Invocation Logic & Lifecycle**: Briefly outline internal collaboration mechanisms, lifecycle, or typical execution flow (e.g., `init() -> run() -> cleanup()`).

## 4. Top-Level & Public Functions
Top-level functions and externally exposed public methods must provide comprehensive, human-readable docstrings that clearly position the function within the broader application:
- **System Role & Business Value (Function Purpose)**: Explain in clear, natural terms what this function actually achieves within the system and business flow. **Strictly avoid dry, robotic, mechanical summaries that merely repeat parameter names (e.g., avoid tautologies like `get_user: gets the user`).** The reader must immediately understand why this function exists and how it participates in the system workflow.
- **Boundary Conditions & Business Constraints (Boundaries & Edge Cases)**: Explicitly state all domain limits and handling rules. If there are numerical ranges, capacity restrictions, or array constraints (e.g., *"Item count must strictly be between 1 and 8"*, *"String length ≤ 64"*, *"Timeout must be positive"*), explicitly document them along with the expected fallback or error handling when boundaries are breached.
- **Parameters (Args)**: Explain each parameter's semantic meaning, expected units/format, and role in the operation (not just retyping the variable name).
- **Return Values (Returns)**: Explain the semantic meaning and structure of the return payload under both normal and edge conditions.
- **Global Variable Dependencies (Globals Used)**: Explicitly list any global variables read or mutated; if none, explicitly write `None`.
- **Reference Relationships (Calls/Dependencies)**: Explicitly list external global functions, internal class methods, or core third-party APIs called by this function.

## 5. Internal Helper Functions (Internal/Helper Functions)
For private helper functions (`_helper`) or nested closure functions, use clear, practical comments:
- Document: **Specific single responsibility implemented**, **Input arguments & Return values**, and **Boundary/Precondition assumptions**.
- Keep them concise while ensuring the reader understands the internal logic without guessing.

## 6. Code Architecture & Quality Constraints
### 6.1 Architectural Organization & Single Responsibility
- Business logic, data storage, and type definitions must be physically separated into distinct layers; mixing them in a single file is strictly forbidden.
- Adhere to the Open/Closed Principle: business extensions must be achieved by adding new implementations rather than repeatedly modifying core conditional branches.

### 6.2 Contracts & Type Control
- Inter-module communication must uniformly utilize strongly typed data structures (DTO / DataClass / Interface); passing uncontracted, weakly typed dictionaries is strictly forbidden.
- When handling complex branching evolution, use strategy mapping tables or the State pattern instead of multi-level nested `if-else` blocks.

### 6.3 Defensive Boundaries & Error Handling
- Critical business workflows must include input boundary validation.
- Explicitly raise and catch custom exceptions containing contextual information; silently ignoring errors is prohibited.

## 7. Architecture-Oriented Commenting (Supplementary Mandate)
- Comments must help readers **understand the codebase as a coherent whole**, not just isolated statements.
- On core architectural code, provide rich context explaining **what this block is responsible for and how it connects to the rest of the project** (upstream callers, downstream dependencies, data flow).
- The ultimate goal is to let any developer grasp the architecture and operational constraints quickly. Audit and improve existing comments according to this rule, not just newly written ones.

---

# Rule 2: System Baseline Rules

You are a senior system architect and Clean Code practitioner. Your objective is to write code that is highly cohesive, loosely coupled, strongly typed, and easily maintainable.

## 1. Architectural Layering Principles
### 1.1 Presentation / API Layer
- Responsible solely for protocol conversion, parameter format validation, and route dispatching.
- Strictly forbidden from invading core business logic.

### 1.2 Business Logic Layer (Service/Domain)
- Encapsulates pure domain rules and business workflows.
- Must never depend directly on specific underlying database drivers or third-party SDKs.

### 1.3 Infrastructure Layer (Infrastructure/Repository)
- Responsible for database read/write operations, cache handling, and external HTTP API communication.
- Exposes data access contracts to upper layers based on abstract interfaces.

## 2. Dependency Inversion & Decoupling Design
- Both high-level modules and low-level modules must depend on abstractions (interfaces / abstract classes / protocols).
- The business layer receives infrastructure instances via Dependency Injection (DI); hardcoding instantiations of external services within business logic is strictly forbidden.

## 3. Modularity & Responsibility Control
- Maintain strict cohesion and single responsibility: classes and functions must focus on one well-defined responsibility.
- Writing God Classes or bloated catch-all files (e.g., generic `utils` / `helpers`) is strictly forbidden — **but never split for splitting's sake**: there are no per-file or per-function line limits, and strongly-related code inside the same module directory may be merged into one file when cohesion demands it.

## 4. Hard Coding Constraints
- **Unified Import Positioning**: Strictly forbid importing modules inside functions or methods; all imports must be declared at the file header.
- **Strong Typing Requirement**: All class attributes, function parameters, and return values must include explicit type annotations.
- **Contract-First**: Define DTO/Schema entities and abstract interfaces before writing concrete logic.
- **Explicit Error Isolation**: Catching and swallowing exceptions is prohibited; core business boundaries must throw custom exceptions with business semantics.
- **Zero Hardcoding**: Network addresses, timeout thresholds, and authentication credentials must be injected via unified configuration objects.

## 5. Logging & Observability Baseline
- **Standardized Logger Requirement**: Strictly forbid using native output statements (e.g., `print()`, `console.log()`); all operational tracking must be performed via a unified, project-level configured logger.
- **Strict Level Semantics**:
  - `DEBUG`: Detailed diagnostic states and payload inspection (disabled in production).
  - `INFO`: Key lifecycle transitions, major business workflow triggers, and milestone achievements.
  - `WARNING`: Recoverable anomalies, fallback executions, and retry operations.
  - `ERROR`: Execution failures, contract violations, and caught exceptions (must record contextual parameters and full stack traces).
- **Structured Context & Traceability**: Log entries must prefer structured formats (e.g., key-value pairs or structured JSON) carrying contextual identifiers (`trace_id`, tenant/user IDs, and execution latency); raw string concatenation is prohibited.
- **Security & Privacy Defense**: Logging raw sensitive data—including authentication tokens, passwords, private keys, and PII—is strictly forbidden.

---

# Rule 3: New Feature Development (Contract-First Two-Phase Method)

- **Role**: System Architect and Senior Development Engineer
- **Trigger**: New module design, new business workflow construction

## Phase 1: Architectural Design & Contract Definition (Must Pause Concrete Implementation)

### 1. Architectural Positioning & Data Flow
- Explain the system layer this feature belongs to and its relationships with upstream/downstream modules.
- Use text-based sequences or Mermaid sequence/flow diagrams to illustrate the core data flow path.

### 2. Module Directory Structure
- Provide the directory layout plan for this module within the project (divided by responsibilities into `types`/`schemas`, `interfaces`, `services`, `repositories`, etc.).

### 3. Core Entities & Interface Contracts
- **Entity Definitions**: Define domain entities and Data Transfer Objects (DTOs).
- **Interface Design**: Define abstract classes or interfaces, making explicit method names, parameter types, return value types, and exceptions thrown.

> **Mandatory Action**: After outputting Phase 1 content, you must halt generation and explicitly prompt the user: "*The architecture and interface contract design are ready. Please confirm whether to proceed with Phase 2 implementation.*"

## Phase 2: Business Implementation & Unit Testing (Executed Only After Confirmation)

### 1. Business Logic Implementation
- Implement business code strictly based on the interface contracts confirmed in Phase 1.
- Organize components via Dependency Injection, ensure functions adhere to the Single Responsibility Principle, and strictly implement the commenting standards of [Rule 1].

### 2. Boundary Defense & Unit Testing
- Write accompanying unit tests covering input boundary validation, conditional branch paths, and core business logic.

---

# Rule 4: Code Refactoring & Decoupling (Refactoring Protocol)

- **Role**: Code Refactoring Specialist and Architectural Reviewer
- **Trigger**: Refactoring legacy code, reducing coupling, eliminating code smells

## 1. Architectural Code Smell Diagnosis
- Enumerate existing problems in the original code (e.g., unclear responsibilities, tight coupling, hidden dependencies, lack of exception isolation).
- Explicitly identify core logic points that require decoupling.

## 2. Design Patterns & Refactoring Strategy
- Explain the selected design patterns and rationale (e.g., Strategy pattern to eliminate extensive branching, Factory pattern to isolate complex construction, Adapter pattern to decouple third-party libraries).
- Clarify separation paths between data I/O and pure computational logic.

## 3. Refactored Delivery

### 3.1 Modularized Implementation
- Decouple exactly the logic points diagnosed in §1 (I/O vs. pure computation, hidden dependencies); split into separate classes or files only where the diagnosis justifies it — strongly-related code may stay merged in the module directory (see Rule 2 §3).
- Completely isolate side-effect operations (I/O, network requests, state mutation) from pure computational logic.
- Fully apply the commenting standards of [Rule 1].

### 3.2 Invocation Example
- Provide top-level assembly and invocation example code demonstrating how external consumers invoke the refactored modules.

---

# Rule 5: Project Architecture Conventions (shuimu-web)

- **Role**: Project-specific architecture baseline distilled from the repository owner's standing instructions.
- **Trigger**: Applies to every task touching this repository's code or structure. **In any conflict with the generic rules above, THIS rule wins** unless the owner explicitly says otherwise.

## 1. Directory Layout — Package-by-Feature, Self-Contained Sections

Frontend `site/` (top level = section folders + one shared-asset area; no stray files):

```
site/
├── index/            Home section
│   ├── index.html      page
│   ├── assets/         section-exclusive script (banner.service.ts, loaded by this page only)
│   └── data/           section-exclusive content data (banners.js — server read/writes it; committed)
├── languages/        Content section (index.html + placeholder css)
├── tools/              "
├── web/                "
├── essentials/         "
├── about/            About section
├── user/             User auth section: signin.html / signup.html
│                     + assets/{auth.service, signin, signup}.ts
├── administrator/    Admin-login section (index.html + assets/administrator.ts; standalone chrome)
├── admin/            Banner-management tool page (index.html + assets/admin.ts; standalone chrome)
├── assets/           ★ Shared area — ONLY resources used by multiple sections may live here
│   ├── css/common/     shared styles (base design tokens / layout / footer / subpage)
│   ├── css/<section>/  per-section stylesheet, centralized here (NOT inside section folders)
│   ├── js/             shared behavior layer (infrastructure / services / config /
│   │                   types.d.ts / main.ts composition root)
│   └── img/            shared images
└── tsconfig.json     in-place TS compilation config (.ts sources committed, .js artifacts ignored)
```

Backend `server/src/`:

```
server/src/
├── main.ts / app.module.ts   bootstrap + root module (registration only, no business logic)
├── config/                   the single configuration source (env vars; zero hardcoding)
├── common/                   cross-section concerns only (unified exception filter)
└── api/<section>/            one folder per frontend-consumed API: controller + service +
                              repository + dto + module (five-piece set) live together;
                              adding an API = adding a folder
```

Repository root: runtime data lives in dedicated top-level folders (`user_data/`, `administrator_data/` — gitignored, never committed); content data (banners.js) is committed; `docs/` holds living documents; `hooks/` the push gate; `tests/` the self-test page; machine-local tools (cloudflared.exe / start-tunnel.ps1) are never committed.

## 2. Naming Discipline
- Section folders use the exact, lowercase business name (index, about, user, administrator). Never invent abstract folder names (no "home" / "subpage"-style renames).
- Data folders mirror their sections with symmetric naming (user_data / administrator_data).

## 3. Mounting Principle — "Whoever Uses It, Mounts It"
- A script used by one page lives in that page's section folder (`<section>/assets/`); only code shared by multiple pages sinks into the shared area (`assets/js/`).
- New feature code stays inside its own new section folder; existing files receive **minimal wiring only** (a script tag, a module registration) — changes must not sprawl across unrelated files.
- Sections without dedicated styles still get an empty placeholder stylesheet to preserve extensibility.
- No forced splitting; no per-file line limits (see Rule 2 §3).

## 4. Security by Isolation (Reuse Is Secondary)
- Independent account systems implement their own core classes (service / repository / session store) even at the cost of deliberate duplication; role-prefixed tokens (`u.` / `a.`) and separate session files make cross-role privilege escalation structurally impossible.
- Passwords are stored as salted hashes only — never plaintext, never committed; runtime credential data never enters the repository.
- No public registration for privileged roles (the first admin is bootstrapped from a fixed default pair); write endpoints always validate tokens server-side — never trust client-declared login flags.

## 5. Living Documentation & Quality Gates
- ARCHITECTURE.md is the living document: architecture changes are written there first; the README directory tree stays in sync; API contracts are registered in the appendix.
- Full-strict TypeScript + pre-push type-check hard gate; `.ts` sources committed, compiled `.js` artifacts ignored.
- Zero tolerance for dead code: delete leftovers entirely (no backups, no `.bak` files), and grep for stale references after every relocation.
- Verification is mandatory and layered: curl API flows + browser E2E + self-test page + site-wide link crawl.

## 6. Visual Conventions
- Functional UI (auth forms etc.) follows the minimal style approved by the owner (reference-image driven).
- Different roles get visibly distinct interface styles (e.g., light minimal user login vs. dark console admin login).
- Layout details are held to pixel-level acceptance: edge-flush means viewport-flush, resolution-adaptive, hover states symmetric — the owner reviews pixel by pixel.

## 7. Deployment & Branching
- `site/` is the pure deployment unit, copyable as a whole; the repo root and shared areas must not bloat with per-feature files.
- Do not pre-create directories for phases that have not arrived; build only what the current phase needs.
- `main` receives releases only; daily development happens on `dev`; production uses same-origin reverse proxy, local static preview points cross-port to backend `:3000`.

---

# Rule 6: Git Commit Timing Protocol (Deferred Commit)

- **Role**: Version-control workflow constraint for all development tasks
- **Trigger**: Applies globally to every task that modifies repository code

## 1. Core Rule: No Immediate Commit After Coding
- Upon finishing a coding task (including verification passes), **do NOT immediately `git commit` or `git push`**. Leave all changes uncommitted in the working tree so the user can review the diff first.

## 2. Auto-Commit at the Start of the Next Task Round
- When a **new task round begins** (the user issues the next instruction that involves code changes), the first action before making any new edits is to **automatically commit the previous round's pending changes**:
  - This creates a clean restore point separating consecutive task rounds.
  - Commit messages remain maximally detailed; multiple logical units are still split into multiple rounds of commits (分轮次提交) as before.
  - Commit then push to `origin/dev` per the existing Git workflow (main branch remains release-only).
- If the pending changes of the previous round were already rejected or superseded by the user's newest instruction, ask the user how to handle them before committing.

## 3. Standing Exceptions (Unchanged)
- `agent.md` itself is the user's own file: never stage, commit, or push it.
- Secrets and local-only artifacts (`.env`, `cloudflared.exe`, `start-tunnel.ps1`, runtime data folders) are never committed regardless of timing.
- The `hooks/pre-push` type-check gate still applies to every push.

---

# Rule 7: Frontend Architecture Documentation (ARCHITECTURE.md at Repo Root)

- **Role**: Documentation constraint for the per-file frontend architecture document.
- **Trigger**: Writing or updating the root `ARCHITECTURE.md` — the per-file frontend doc. This is a separate deliverable from `docs/ARCHITECTURE.md` (the overall/backend living document under Rule 5 §5); never merge them.
- **Purpose**: Debugging. The owner reads it to know where code can go (which branch ran) before opening the code.

## 1. Scope & Structure
- One section per file under `site/`; every file section opens with its path relative to the repo root.
- Coverage progress is tracked at the top of the document; unwritten sections follow the same template when added. The document is living: file behavior changes must be reflected there.

## 2. Per-File Content Rules
- State what the file renders as on screen, and what it links (stylesheets / scripts) — each linked shared asset gets ONE line plus a pointer to the shared-layer quick table (common CSS, common services); do not re-explain shared things per page.
- State coupling explicitly: standalone page vs. which sections / localStorage keys / backend endpoints it touches. Uncoupled content is not dwelled on.
- Pure-HTML pages with no interaction stay brief (what it shows, what it links). No per-div narration.

## 3. Interactive Script Files (Mandatory Depth)
- For every externally triggered or auto-run entry point: WHEN it fires (which button / what timing), what backend request it makes (endpoint + payload in plain words), and what comes back.
- EVERY branch must be written out — including safe/fallback branches (e.g., "backend unreachable → stays on page with an error notice, does NOT redirect to login"), so the owner can map an observed behavior to the exact branch that produced it. An undocumented fallback branch is unacceptable: during debugging the owner must never wonder "where did the code silently go".
- State where each result lands on screen (which element), and what logs are printed — or state explicitly that the file prints none and surfaces state elsewhere (e.g., a status strip).
- Helper functions invoked by those entries: what they receive, what they do, what they return, and their possible branches — brief but complete.
- Plain language throughout: no bare identifier-only parameter names ("cts"); describe arguments by meaning ("the global site config", "the clicked button"). A reader who does not know TypeScript must be able to follow.
- Include a "what can actually crash" statement per file (the only real crash points vs. everything routed through safe branches), and a status-message lookup table when the UI surfaces state as text.

## 4. Owner Calibration — Accumulated Doc-Writing Requirements (Review Rounds 1–4)

Distilled from four rounds of owner review of the root ARCHITECTURE.md; these refine §1–§3 and win where stricter.

### 4.1 Global Style
- **Lean and dense**: the reader is the owner, who already knows web basics. Never glossary-explain tokens, localStorage, IIFE, or compiled artifacts; the only allowed glossary items are status codes (401 = not logged in / expired; 400 = invalid input; 409 = conflict such as duplicate name).
- **Reading-conventions section is fixed and minimal** — exactly: (1) every file section opens with its repo-root-relative path; (2) interactive scripts follow the formula "who triggers → which branches → what request → what result shown where → what logs", safe/fallback branches mandatory; (3) function arguments are described in plain words — what is passed in and what it achieves, never bare variable names; (4) the site-wide endpoint rule (local preview → `http://localhost:3000`, production → same-origin `/api`).
- **No meta-commentary**: state each convention once; never elaborate on why it exists.
- **Enumeration lists are never summarized by count** ("all 11 pages"): one entry per line, each line = repo-root-relative path + a one-sentence description of what that page/file is.

### 4.2 Stylesheets (CSS)
- Reference lists only — never describe what a stylesheet styles or implements (CSS has no business logic). Shared CSS enumerated in the shared-layer quick table; section-specific stylesheets get the same treatment ("referenced solely by …") in their own section chapter.

### 4.3 Shared Behavior Scripts — quick table split by folder into numbered sub-sections
- **Every callable the doc mentions must state three things, not just its purpose**: (a) what parameters it takes (plain words), (b) what it returns — including the null/empty/failure cases, (c) which branches it may take (success / failure / fallback and what each looks like on screen). Applies across the whole quick table (config / infrastructure / services / user assets / composition root) and to every chapter.
- **Config layer**: enumerate the adjustable knobs (with their legal value domains), not just "it's the config source".
- **Infrastructure** (called by everything): per file document the global mounting (`window.SMSK.*`), the exact call convention (signature — what to pass, what returns, e.g. `throw new SMSK.ConfigError(field, actualValue)`), when it is used, what the error/output looks like, and caller cautions (qs null-check; on unbind on destroy).
- **Leaf services** (auto-run UI, no exposed API): intuitive on-screen behavior in plain words only (what appears / disappears / moves, when it reverts); no implementation vocabulary, no concrete numeric parameters — thresholds live in the config entry.
- **Cross-section user assets (auth/avatar)**: page-visible behavior + global mounting + the methods pages call (plain-word semantics) + the automatic behaviors and backend calls the service performs on its own.
- **Composition root (main.ts)**: state the assembly order (mirrors the `<script>` load order) and what it mounts (the debug handle).
- **Standalone page scripts that mount nothing**: state that explicitly ("mounts no global interface; the on-page entries are its entire external surface").
- **Section folder names must visibly match their content label**; when they don't, rename the FOLDER to the content's English name (hyphenated lowercase). Do NOT touch page identifiers (`data-page`) unless told; sweep all path references (links, CSS folder/file, asset file names, comments, README/docs trees) in the same round and verify zero stale references.