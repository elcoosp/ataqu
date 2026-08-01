# ✍️ ATAQU UX WRITING STYLE GUIDE — Version 1.1 (Phase 1)
### The Interface Voice of the Calm Predator

> **Executive Note:** UX writing is not marketing. Marketing gets people through the door; UX writing determines if they ever leave. In 2026, users are suffering from "SaaS fatigue"—a cognitive exhaustion caused by bloated interfaces, cheerful micro‑copy, and unhelpful error messages. Ataqu’s UX writing must mirror our Rust architecture: deterministic, ruthlessly efficient, and devoid of bloat. We do not coddle users with cheerfulness; we empower them with absolute clarity. If the UI text does not help the user complete a job in the next 5 seconds, delete it.

---

## 1. THE UX WRITING PHILOSOPHY

### 1.1 The Core Principles
Every word inside the Ataqu interface must adhere to three unbreakable laws:

1. **Precision Over Politeness:** We do not say "Please wait" or "Oops." We say "Saving..." or "Error." The interface is a tool, not a butler. Politeness adds reading time; precision saves it.
2. **System Truth:** If the backend is performing a heavy query, we do not say "Fetching your magic." We say "Querying database." We respect the user's intelligence, especially our CTO persona, by telling them exactly what the machine is doing.
3. **Action Over Description:** UI copy is a lever, not a label. A button shouldn't say "Submission Form"; it should say "Save changes." Every string of text should move the user closer to decommissioning a competitor.

### 1.2 The "No-Cheerleader" Rule
Ataqu strictly forbids celebratory or apologetic micro‑copy.
- **No confetti, no "Yay!", no "Awesome!"** The reward for completing a task is the completed task itself.
- **No "Oops", no "We're sorry", no "Whoops."** Apologies waste characters. If the system fails, provide the technical reason and the immediate fix.

---

## 2. THE UX LEXICON (Controlled Vocabulary)

Words shape reality. We strictly forbid generic SaaS jargon and replace it with mechanical, absolute terms.

| ❌ Banned UX Words (The SaaS Stereotype) | ✅ Mandatory UX Words (The Ataqu Way) | Context |
|---------------------------------------|-----------------------------------|----------|
| Submit, OK, Apply | Save, Create, Delete, Update | Action buttons must describe the exact operation. |
| Oops, Whoops, Uh‑oh | Error, Failed, Warning | Never apologize or act surprised by system states. |
| Please wait... | Loading..., Syncing..., Querying... | Be precise about the system state. |
| Seamless, Smooth | Native, Instant, Connected | Avoid empty superlatives; use architectural facts. |
| Utilize, Leverage | Use, Connect | Eradicate corporate jargon. |
| Guest, Member | User, Admin, Owner | Use clear role‑based nouns. |
| Unsaved changes will be lost | Leave without saving? | Be direct about the consequence. |

---

## 3. VOICE & TONE IN CONTEXT

The voice remains constant (Direct, Calm, Competent), but the tone shifts based on the user's emotional state and context.

### 3.1 The Contextual Tone Matrix

| Context | Emotional State | Tone | Example |
|---------|-----------------|------|---------|
| **Onboarding / Empty States** | Skeptical, impatient | Functional, guiding | "No deals yet. Drop your HubSpot CSV here or create one." |
| **Success / Completion** | Relieved | Cold, factual | "Saved." or "Deal moved to Won." |
| **Destructive Actions** | Cautious | Stern, absolute | "Delete workspace. This permanently erases all data." |
| **Errors / System Failure** | Frustrated | Analytical, helpful | "Network timeout. Data saved locally. Retrying in 3s." |
| **Upgrades / Paywalls** | Evaluative | Mathematical, transparent | "Upgrade to bundle: +$34/mo. Unlocks 9 more apps." |

---

## 4. INTERACTION PATTERNS & MICROCOPY

### 4.1 Buttons & Actions
Buttons are levers. They must contain active verbs. Never use "OK" or "Submit."

| Element | ❌ Standard SaaS | ✅ Ataqu Standard |
|---------|------------------|-------------------|
| **Primary Button (Create)** | "Submit" | "Create deal" |
| **Primary Button (Update)** | "Apply Changes" | "Save changes" |
| **Secondary Button (Cancel)** | "Cancel" | "Discard" or "Go back" |
| **Destructive Button** | "Yes, delete" | "Delete forever" |

*Rule:* If an action is irreversible, the button text must include the noun being destroyed (e.g., "Delete workspace", not just "Delete").

### 4.2 Form Labels & Helper Text
- **Labels:** Short, title‑case, above the input. (e.g., `Email Address`)
- **Helper Text:** Below the input, only if constraints are not obvious. (e.g., `Must include a domain.`)
- **Placeholder Text:** Never use placeholder text as a label. Placeholders disappear on type, destroying context. Use placeholder strictly for format examples. (e.g., `name@company.com`)

### 4.3 Loading & Delayed States
Ataqu uses Optimistic UI. The UI assumes success and updates instantly. However, for heavy jobs (e.g., VISTA analytics over large datasets), we use precise loading text.

- ❌ "Fetching your magic..."
- ❌ "One moment please..."
- ✅ "Querying database..."
- ✅ "Generating export..."
- ✅ "Running SPARK workflow..."

### 4.4 Toast Notifications (Transitions)
Toasts are temporary confirmations. They must appear in the bottom‑right, be high‑contrast, and auto‑dismiss in 3 seconds.

| Event | ❌ SaaS Toast | ✅ Ataqu Toast |
|-------|--------------|----------------|
| **Save Success** | "🎉 Awesome! Your settings have been successfully saved." | "Saved." |
| **Error** | "Oops! Something went wrong on our end." | "Failed to save. Check network connection." |
| **Native Integration** | "You just connected two apps! 🎈" | "CINQ connected to DIAL." |

---

## 5. ERROR MESSAGING (THE ANTI‑OOPS PROTOCOL)

Errors are the ultimate test of a brand's competence. Ataqu does not hide errors behind vague PR speak. We state the failure, explain the technical reason (if known), and provide the exact next step.

### 5.1 The 3‑Part Error Structure
1. **What happened:** (e.g., "Export failed.")
2. **Why it happened:** (e.g., "VAULT contains 50,000 rows. Limit is 10,000 per export.")
3. **How to fix it:** (e.g., "Filter by date range and try again.")

### 5.2 Error State Examples

| Situation | ❌ SaaS Error | ✅ Ataqu Error |
|-----------|--------------|----------------|
| **Validation Error (Form)** | "Invalid input" | "Email requires an '@' symbol." |
| **404 Page** | "404: Page not found. Try the search bar." | "404: Route does not exist. Check the URL or return to the dashboard." |
| **500 Server Error** | "Our servers are taking a break." | "System error. Event logged to DLQ. Admin notified. Your data is safe." |
| **Network Offline** | "You are offline. Reconnect to continue." | "Network disconnected. Changes saved locally. Will sync when reconnected." |
| **Permission Denied** | "Access denied." | "You lack Admin rights for this workspace." |

---

## 6. EMPTY STATES (THE CONVERSION ENGINE)

Empty states are not dead ends; they are the starting line for PLG (Product‑Led Growth). An empty state must never just state the absence of data; it must provide the exact mechanism to populate it.

### 6.1 The Empty State Formula
**Fact + Action Prompt + Native Hook**

### 6.2 App Empty State Examples

**CINQ (CRM) - No Deals:**
> **No deals tracked.**
> Drop your HubSpot CSV here, or create your first deal manually.
> *Native hook: Connect CINQ to DIAL to auto‑create channels for new deals.*

**SPARK (Automation) - No Workflows:**
> **0 Automations.**
> Zapier would charge you $30/mo for this. Build your first native trigger.
> *Native hook: Trigger SPARK when a CINQ deal enters 'Won'.*

**VISTA (Analytics) - No Data:**
> **No data to display.**
> VISTA reads natively from your other apps. Connect an app to populate this dashboard.
> *Native hook: Activate CINQ to start tracking revenue.*

---

## 7. ONBOARDING & IN‑APP GUIDANCE

We do not use multi‑step product tours that force users to click "Next" 5 times. We use strictly positioned, just‑in‑time tooltips.

### 7.1 Tooltip Rules
- **Trigger:** Must appear only when the user hovers or clicks a help icon (`?`). Never auto‑popup on page load.
- **Length:** Maximum 2 sentences.
- **Tone:** Instructional.
- **Example:** *(Hovering over the "Cancel Subscription" button)* -> "Cancels immediately. Your data export (CSV/JSON) will be generated for download."

### 7.2 The "Decommission" Prompts
When a user achieves proficiency in one app, the UI prompts them to expand.

- **Trigger:** User creates 10 entities in CINQ.
- **Prompt Location:** Top banner of CINQ.
- **Copy:** "You're tracking revenue. Stop paying for Slack. Connect DIAL to discuss these deals natively. [Connect in 1 click]"

---

## 8. FORMATTING, CAPITALIZATION & PUNCTUATION

Consistency in typography reduces cognitive load.

### 8.1 Capitalization
- **Headings:** Sentence case. (e.g., "Your settings", not "Your Settings")
- **Buttons:** Sentence case. (e.g., "Save changes", not "Save Changes")
- **App Names:** Always capitalized as proper nouns (PIVOT, CINQ, DIAL, SPARK, SOND, TEMPO, VAULT, AEGIS, PAUSE, VISTA).

### 8.2 Punctuation
- **No Oxford Commas:** Keep it lean. (e.g., "CRM, Chat and Automation")
- **No Exclamation Marks:** Ever. We are not excited; we are functional.
- **Periods:** Use periods in body text and helper text. Do NOT use periods on buttons or single‑line labels.
- **Ellipses:** Use strictly for loading states (e.g., "Loading..."). Never use to trail off a thought.

### 8.3 Numbers & Dates
- **Numbers:** Always use numerals (1, 2, 3), never words (one, two, three).
- **Dates:** Strictly ISO 8601 format (YYYY‑MM‑DD) to prevent US/EU confusion.
- **Currency:** Always prefix with the symbol ($49, not 49 USD).

---

### FINAL UX WRITING DIRECTIVE
Every character on the screen costs the user time. If a word does not prove our Rust architecture, guide the user to their next action, or facilitate the decommission of a competitor, it is bloat. The Ataqu UI is a high‑performance tool. Write it like you are writing code: deterministic, strict, and ruthlessly efficient.
