# InboxChat — Product Specification v1.0
### *The live chat for founders who can't afford to lose a single customer*

---

## 1. Product Vision

**InboxChat is the live chat built for the first 1,000 customers of a SaaS.**

Intercom started like this. Then they raised $240M and forgot who their first customer was.
InboxChat never will.

> **Vision statement:** Make every early-stage SaaS founder capable of talking to their users in real time — without paying $74/month for features they'll use in 3 years.

The product exists at the intersection of three truths:
1. The first 100 customers determine product-market fit
2. Live chat is the highest-converting acquisition channel for SaaS (3x email)
3. Every competitor in this space is priced for companies who've already won

---

## 2. Ideal Customer Profile (ICP)

### Primary ICP: The Solo Founder

| Attribute | Profile |
|---|---|
| **Role** | Solo founder or small team (1-3 people) |
| **Stage** | Pre-revenue to $5k MRR |
| **Product** | B2B SaaS, developer tool, or niche vertical SaaS |
| **Tech stack** | Next.js, React, or any web app with a `<script>` tag |
| **Pain** | "I'm losing users at onboarding and I don't know why" |
| **Budget** | $0-$49/month max for chat tools |
| **Behavior** | Ships fast, values simplicity, hates vendor lock-in |
| **Channels** | Twitter/X, Indie Hackers, Product Hunt, Hacker News |

### Secondary ICP: The Migrating Startup

Companies on Intercom's Starter plan ($74/month) who:
- Have < 5 operators
- Don't use 80% of Intercom's features
- Are looking for a reason to cut costs

### Anti-ICP (do NOT target)
- Enterprise (>100 seats)
- Companies that need CRM integrations as Day 1 requirement
- Non-technical teams expecting zero-setup magic

---

## 3. Differentiation vs. Intercom & Crisp

### The Competitor Landscape

| Feature | Intercom | Crisp | **InboxChat** |
|---|---|---|---|
| Pricing (1 operator) | $74/mo | $25/mo | **$19/mo** |
| Setup complexity | High (30+ config steps) | Medium | **One `<script>` tag** |
| Widget customization | Deep but complex | Moderate | **Simple + intentional** |
| AI bot (native) | Yes ($$$) | Basic | Roadmap — done right |
| Email notification offline | Yes | Yes | **Yes (built-in, Day 1)** |
| Multi-operator | Yes | Yes | **Yes (v1)** |
| Open source | No | Partial | **Planned** |
| Self-hostable | No | No | **Roadmap** |
| Target segment | Mid-market → Enterprise | SMB | **Early-stage SaaS** |

### Our Positioning Statement

> InboxChat is **not** a cheaper Intercom. It's what Intercom would be if it was built in 2025, for founders, by founders.

### Differentiation Pillars

**1. Radical simplicity.** One script tag. Working chat in under 5 minutes. No Zapier setup. No "workspace configuration wizard."

**2. Founder-first pricing.** Pay per workspace, not per seat. No per-contact pricing that punishes growth.

**3. Transparent infrastructure.** Open API, self-hostable roadmap. You own your data.

**4. Real-time that actually works.** Socket.io over polling. Messages in milliseconds, not seconds.

**5. Built-in GTM integrations.** Native Stripe billing. Not a "zap" on top. Revenue context inside the chat.

---

## 4. North Star Metric

> **"Weekly Active Workspaces with ≥ 1 resolved conversation"**

This metric captures:
- ✅ Product is installed and working
- ✅ Founder had a real conversation with a user
- ✅ Conversation was meaningful enough to resolve
- ✅ Operator is coming back (weekly)

**Why not "messages sent"?** It rewards noise.
**Why not "conversations started"?** Widget could be chatting with bots.
**Why not "MRR"?** Too lagging. We need a leading indicator.

### Supporting Metrics

| Metric | Target (Month 6) |
|---|---|
| Time to first conversation | < 10 minutes from signup |
| Widget installation rate | > 60% of signups |
| Weekly active workspaces | 150 |
| Conversation resolution rate | > 40% |
| Churn rate (monthly) | < 5% |
| NPS | > 50 |

---

## 5. Strategic Roadmap

### v1 — Foundation *(current)*
**Theme: It works. It's fast. It's cheap.**

- ✅ Auth (login/register/JWT)
- ✅ Real-time chat via Socket.io
- ✅ Email notifications (offline operator)
- ✅ Stripe billing (trial → pro)
- ✅ Multi-operator support
- ✅ Analytics (basic)
- ✅ Conversation close/resolve
- 🔄 Widget customization (color, welcome message, GDPR)
- 🔄 Password reset

**Goal:** 50 paying workspaces

---

### v2 — Retention *(Q2 2025)*
**Theme: Make operators want to come back every day.**

| Feature | Why |
|---|---|
| **Conversation assignment** | Multiple operators need ownership |
| **Typing indicators** | Makes the chat feel alive |
| **Conversation search** | Can't lose context as volume grows |
| **Canned responses** | Speed up operator response time |
| **Contact history** | See all past conversations of a visitor |
| **Mobile-responsive dashboard** | 40% of founders check on mobile |
| **Conversation tags** | Categorize by issue type |
| **SLA / response time alerts** | Accountability for support quality |

**Goal:** 200 paying workspaces, churn < 5%

---

### v3 — Growth *(Q3 2025)*
**Theme: Make InboxChat the acquisition engine, not just support.**

| Feature | Why |
|---|---|
| **Proactive messages (triggers)** | "Message after 30s on pricing page" → highest-converting feature in live chat |
| **Lead capture forms** | Capture email before widget session starts |
| **Visitor identity (track by user ID)** | Close the loop between chat and your user database |
| **Zapier / Make integrations** | Connect to the rest of the stack |
| **Crisp/Intercom migration tool** | Lower the switching cost for competitors |
| **Public API** | Developers extend the product themselves |
| **Team inbox with multiple workspaces** | Agencies and consultants managing multiple clients |

**Goal:** 500 paying workspaces, first $10k MRR month

---

### v4 — Differentiation *(Q4 2025)*
**Theme: Do what Intercom CAN'T — because they're too big to care.**** 

| Feature | Why |
|---|---|
| **AI-powered reply suggestions** | GPT trained on YOUR conversation history — not generic |
| **Session replay integration** | See what the user did before messaging (PostHog/Clarity embed) |
| **Revenue context in chat** | Pull Stripe MRR of the user inline in the conversation |
| **Self-hosted option (Docker)** | Compete for the privacy-first segment |
| **Changelog widget** | Announce updates inline — one less tool |
| **Status page embed** | Show incident status inside the widget |

**Goal:** $25k MRR, Series A readiness

---

## 6. Growth Engine Strategy

### Primary: Product-Led Growth (PLG)

The widget itself is the growth loop:

```
Founder installs InboxChat → Visitor chats → "Powered by InboxChat" link in widget
→ Visitor becomes founder → Installs InboxChat → repeat
```

**Powered by InboxChat** badge on the free and $19 plan drives organic installs.
Remove badge = upgrade incentive.

### Secondary: Community-Led Growth

**Target communities (in order of priority):**
1. **Indie Hackers** — perfect ICP, highly influential, loves bootstrapped tools
2. **Twitter/X builder community** — #buildinpublic thread strategy
3. **Product Hunt** — launch strategy for v2 and v3
4. **Hacker News Show HN** — credibility, developer-first audience
5. **r/SaaS and r/Entrepreneur** — volume play

**Content strategy:**
- "How I went from 0 to 100 users by talking to every single one" (founder stories using InboxChat)
- Open metrics (MRR, installs) — radical transparency builds trust

### Tertiary: Referral Loop

- **Refer 3 friends → 1 month free**
- Agency partner program: 30% recurring commission for resellers

---

## 7. Pricing Strategy

### Current
| Plan | Price | Limits |
|---|---|---|
| Trial | $0 | 14 days, 100 conversations |
| Pro | $19/mo | Unlimited conversations, 3 operators |

### Proposed (v2+)

| Plan | Price | Target |
|---|---|---|
| **Free** | $0 | 1 operator, "Powered by InboxChat" badge, 50 conv/mo |
| **Starter** | $19/mo | 3 operators, no badge, unlimited conv, basic analytics |
| **Growth** | $49/mo | 10 operators, proactive messages, canned responses, priority support |
| **Scale** | $149/mo | Unlimited operators, API, custom domain widget, SLA alerts |

> [!IMPORTANT]
> **Never price per contact.** This is Intercom's biggest sin. It punishes growth.
> Price per workspace capability, not per user you're talking to.

### Why Free Tier?

Free tier with badge = **1,000+ organic widget installs** that become leads.
The badge is worth more than $19/month in CAC savings.

### Path to $10k MRR

```
$10,000 MRR =
  350 Starter ($19) = $6,650
+  50 Growth ($49)  = $2,450
+   5 Scale ($149)  =   $745
─────────────────────────────
                    = $9,845 ✓
```

Achievable with < 1% conversion from a 50,000 monthly unique visitor funnel.

---

## 8. Scalability Architecture Goals

### Current Stack Assessment

| Component | Current | Bottleneck at |
|---|---|---|
| Server | Fastify + Socket.io (single instance) | ~500 concurrent connections |
| DB | Supabase PostgreSQL | ~10k workspaces (Supabase limits) |
| Deploy | Railway (1 dyno) | 500 concurrent |
| Storage | None | — |

### Scaling Phases

**Phase 1 — 0-500 workspaces (current):** Single Railway dyno. No changes needed.

**Phase 2 — 500-5k workspaces:**
- Add Redis adapter for Socket.io (enables horizontal scaling)
- Move to Railway's scale-to-zero with min 2 instances
- Add connection pooling via PgBouncer (Supabase already provides this via Transaction Pooler)
- CDN for `widget.js` (Cloudflare)

**Phase 3 — 5k+ workspaces:**
- Move to dedicated PostgreSQL (Neon or self-managed RDS)
- Separate Socket.io server from REST API (different scaling profiles)
- Add message queue (BullMQ/Redis) for email sending
- Rate limiting at edge (Cloudflare Workers)

### Non-Negotiables at Any Scale
- Widget JS < 15KB gzipped (no framework bloat)
- First socket connection < 200ms p95
- Message delivery < 500ms p99

---

## 9. Metrics Dashboard

### Product Health (tracked weekly)

```
┌─────────────────────────────────────────────────────────────┐
│  North Star: Weekly Active Resolving Workspaces   ███  142  │
│  ────────────────────────────────────────────────────────── │
│  New workspaces this week              ████████  +47        │
│  Widget installation rate             ████████  63%         │
│  Avg time to first conversation       ████     8.2 min      │
│  Conversations resolved / total       █████    44%          │
│  Messages sent (operator)             ██████   1,247        │
│  Avg response time                    ███      4.1 min      │
│  Churn (MTD)                          █        3.2%         │
└─────────────────────────────────────────────────────────────┘
```

### Business Health (tracked monthly)

| Metric | Month 1 | Month 3 | Month 6 | Month 12 |
|---|---|---|---|---|
| MRR | $190 | $1,900 | $5,700 | $10,000 |
| Paying workspaces | 10 | 100 | 300 | 526 |
| CAC | $0 (PLG) | $15 | $20 | $25 |
| LTV (12-month) | $228 | $228 | $350 | $400 |
| LTV/CAC | — | 15x | 17x | 16x |
| Trial → Paid | 20% | 30% | 35% | 40% |

### Alerts (auto-trigger if breached)
- Churn > 8% in a 30-day window → emergency retention campaign
- Trial → Paid conversion < 15% → pricing or onboarding problem
- avg resolution rate < 20% → product education gap
- Time to first conv > 20 min → onboarding flow broken

---

## 10. Viral Features for Organic Growth

### 1. **"Powered by InboxChat" — Smart Badge**
Not just a logo. Clicking it opens a pre-filled InboxChat signup with "I want a chat widget like [SiteName]'s."
Every install drives qualified leads. **Estimated: 3-5 signups per 1,000 widget conversations.**

### 2. **Public Conversation Showcase**
Opt-in feature: "Share your best support win." Founder publishes an anonymized conversation as a tweet-sized testimonial. Auto-generates an image card. Built-in social sharing.
**Loop:** Founder tweets → InboxChat gets credited → other founders sign up.

### 3. **Widget Gallery**
Public gallery of the best-looking InboxChat widgets (color, logo, message). Indexed on Google. Founders searching "live chat widget examples" land on InboxChat.
**SEO leverage:** Long-tail keywords, zero paid spend.

### 4. **One-Command Install for Popular Stacks**
```bash
npx inboxchat-install
```
Auto-detects Next.js, Vite, Remix, Svelte. Injects the script tag. Commits the change.
**Virality:** Founders share the CLI on Twitter. "Just installed InboxChat in 10 seconds with one command."

### 5. **Referral Leaderboard (Indie Hacker Special)**
A public leaderboard of the most-referring founders, with their MRR displayed (optional). Indie Hackers LOVE this. It gamifies referrals and creates social proof simultaneously.

---

## 5 Killer Features Better Than Intercom for Early-Stage SaaS Founders

### 🔥 1. Revenue Context in Chat (Stripe-native)
When a user messages, **show their Stripe MRR, plan, and days to renewal inline** in the conversation.
Intercom has this... for $149/month add-on. InboxChat builds it natively at $49/month.

> Operator sees: "💳 $49/mo · Pro Plan · 12 days to renewal · 3 failed payments" → right in the sidebar.

**Why it wins:** Founders don't route tickets. They talk to customers who are about to churn.

---

### 🔥 2. Churn Risk Score (AI-assisted, no ML team needed)
Combine last message date + plan + usage signals into a simple 1-10 churn score per contact.
Color-coded in the conversation list. Red = at risk. Green = healthy.

> "This user hasn't logged in for 14 days and never responded to your last message. Risk: 8/10."

**Why it beats Intercom:** Intercom's Health Score requires custom events + $400/month plan. InboxChat does it out of the box.

---

### 🔥 3. "Talk to Founder" Mode
A special widget variant with a photo of the actual founder, a response SLA ("I reply within 2 hours"), and a direct connection to the founder's socket — not a team inbox.

Users KNOW they're talking to the person who built the product. Conversion rate is 2-3x higher than anonymous support.

**Why it wins:** Intercom is built for teams. InboxChat is built for the person who ships.

---

### 🔥 4. Session Context (no extra SDK)
Capture the last 5 pages the user visited before opening the chat — using a tiny localStorage tracker embedded in `widget.js`.

> "User visited /pricing → /features → /pricing (3x) → opened chat"

No PostHog. No Segment. No extra SDK. Built in.

**Why it wins:** Context is everything. Founders ask less, understand more, convert more.

---

### 🔥 5. Async Message Mode ("Leave a note")
When the operator is offline, instead of showing "We'll reply soon" — show a **beautiful offline form** that sends the user a real email reply thread (via Resend). The conversation continues over email, synced back to InboxChat when the operator comes online.

**Why it wins:** Intercom's "away mode" is dead on arrival for solo founders who sleep. InboxChat turns offline into async support — without losing the lead.


---

## 11. Distribution Engine

Most SaaS tools die not because the product is bad, but because nobody finds it.
InboxChat's distribution is structured so **the product distributes itself**.

### Channel Stack (ranked by leverage)

| Channel | Mechanism | CAC | Scale |
|---|---|---|---|
| Widget badge (PLG) | Visitor → founder loop | $0 | Infinite |
| SEO (programmatic) | "Live chat for [vertical]" pages | $0 | High |
| Indie Hackers | Authentic founder story posts | $0 | Medium |
| Product Hunt launches | v1, v2, v3 staggered launches | $0 | Spike |
| GitHub (open widget) | Stars → installs → signups | $0 | Long-tail |
| Twitter/X #buildinpublic | Real metrics, real updates | $0 | Medium |
| Referral program | 30-day free per referral | LTV-based | High |
| YouTube (tutorials) | "Replace Intercom for $19" | $0 | Long-tail |
| Paid (Google) | Activated only after $5k MRR | $25-40 | Scalable |

### Programmatic SEO Strategy

Generate landing pages for high-intent queries:
- `"live chat for [SaaS vertical]"` → /chat-for-lawyers, /chat-for-saas, /chat-for-agencies
- `"intercom alternative"` → direct competitor comparison page
- `"crisp alternative"` → same
- `"best live chat for bootstrapped startups"`
- `"free intercom alternative"`

Each page: real benchmark data, real pricing table, embed a working demo widget.
**Target: 200 landing pages, 50k monthly organic visits by Month 12.**

### Developer Distribution

Open-source the widget (`packages/widget`) on GitHub.
- Stars generate organic backlinks and trust
- Issues become free product research
- Contributors become evangelists
- OSS widget → commercial dashboard is a proven model (Crisp, Chatwoot)

### Partnership Distribution

| Partner type | Mechanism | Example |
|---|---|---|
| No-code builders | Template + native embed | Framer, Webflow |
| SaaS boilerplates | Pre-integrated in starter kits | Shipfast, Supastarter |
| SaaS newsletters | Sponsored post (one-time) | Indie Hackers, TLDR |
| Accelerators | Preferred tool for cohorts | Y Combinator, Antler |

---

## 12. Product Moat Strategy

A product without a moat is just a feature waiting to be copied.
InboxChat's moat is built in layers — each one harder to replicate than the last.

### Layer 1: Data Moat (12-24 months)

Every resolved conversation is a training signal.

- **Conversation patterns** by industry → power AI reply suggestions specific to YOUR type of SaaS
- **Churn signals** from thousands of workspaces → industry benchmarks no one else has
- **Onboarding friction heatmaps** → aggregated insight about where SaaS users drop off

No competitor can replicate this without the user base. The user base can't exist without the product. Classic moat.

### Layer 2: Switching Cost Moat

| Switching friction | How we build it |
|---|---|
| Conversation history | 2+ years of customer data = don't want to lose it |
| Contact identities | Users identified by externalId = needs re-instrumentation |
| Widget customization | Matches brand exactly = re-design cost to move |
| Canned responses | Team's entire support playbook lives in InboxChat |
| Operator workflows | Habits form around the inbox interface |

We don't build barriers cynically. We build depth. Depth creates retention.

### Layer 3: Network Effect (v3+)

**Community-level network effect:**
- `npx inboxchat-install` referenced in tutorials → more installs
- Widget Gallery: best widgets get featured → drives upgrades
- Referral leaderboard: top referrers get public recognition → self-sustaining

**Ecosystem network effect:**
- 3rd-party integrations (Zapier, Make) → more connectors → more value → harder to replace
- Public API → developers build on top → features we never planned

### Layer 4: Brand Moat

> "InboxChat is the live chat Indie Hackers use."

Owning this association is worth more than any feature.
Brand moat compounds: the more founders associate InboxChat with successful early-stage conversions, the more new founders default to choosing it.

**How to build it:** Radical transparency (share MRR), founder testimonials, genuine community presence — not ads.

---

## 13. Technical Differentiation

Most live chat tools are PHP monoliths from 2014 wrapped in a React skin.
InboxChat is built on the right foundation from day one.

### Stack Advantages

| Decision | Benefit | vs. Competition |
|---|---|---|
| **Fastify** over Express | 2x throughput at same hardware cost | Most tools use Express or Rails |
| **Socket.io** over polling | Real-time in milliseconds, not seconds | Crisp uses long polling in free tier |
| **PostgreSQL** (Supabase) | Row-level security, full SQL power | Many competitors use MongoDB |
| **TypeScript end-to-end** | Shared types between server, client, widget | Runtime errors caught at compile time |
| **pnpm monorepo** | Shared `@inboxchat/shared` package | Zero drift between frontend/backend contracts |
| **No ORM** (raw SQL) | Predictable queries, no N+1 hiding behind abstractions | Prisma/Sequelize hide performance bugs |

### Widget Architecture Advantage

The widget is the product's GTM asset — it must be **fast, small, and bulletproof.**

```
Target: widget.js < 15KB gzipped
Boot time: < 100ms
Dependencies: 0 (vanilla JS only)
Methodology: no React, no Vue, no Angular
```

Intercom's widget: **~400KB**. Crisp's widget: **~120KB**. InboxChat's target: **< 15KB.**

A 15KB widget means: Lighthouse score doesn't suffer, works on slow 3G, developers don't push back on install, CLS/LCP are not impacted.

### Developer Experience as Differentiation

```typescript
// The entire integration — 1 line:
InboxChat.init({ workspaceKey: 'YOUR_KEY' });

// Optional: identify a logged-in user
InboxChat.identify({ id: user.id, name: user.name, email: user.email });

// Optional: trigger programmatically
InboxChat.open();
```

Every extra config option is a reason NOT to install. Intentional simplicity is a feature.

### Security Architecture

| Vector | Mitigation |
|---|---|
| Brute force | `@fastify/rate-limit` (200 req/min global, tighter on auth routes) |
| XSS | `@fastify/helmet` CSP headers |
| Token theft | JWT 7-day expiry + httpOnly cookie (roadmap) |
| SQL injection | `postgres` tagged template literals — no string interpolation |
| CORS abuse | Allowlist per workspace API key |
| Stripe webhook replay | Stripe signature verification + raw body bypass |

---

## 14. Expansion Strategy

InboxChat reaches $10k MRR as a focused live chat tool. The expansion strategy unlocks the next $100k MRR.

### Phase A: Vertical SaaS Expansion (Month 9-12)

Go **deep in specific verticals** before expanding horizontally.

| Vertical | Why |
|---|---|
| **Developer tools** | Trust open-source, comfortable with script tags, high ARPU |
| **No-code/low-code SaaS** | Rapid adoption, referral-heavy communities |
| **Edtech SaaS** | High conversation volume, strong retention need |
| **Legal tech** | Privacy-first = self-hosted version becomes premium sell |
| **AI-native SaaS** | New wave of founders needing user feedback loops |

For each vertical: a dedicated landing page, vertical-specific template (widget message, canned responses), and a real customer case study.

### Phase B: Geography Expansion (Month 12-18)

**Priority markets:**
1. **Latin America** — huge indie founder community, Intercom pricing is prohibitive in local currency
2. **Europe (GDPR-ready)** — self-hosted option becomes a compliance sell
3. **Southeast Asia** — growing SaaS ecosystem, low competition from US players

**Localization requirements:**
- Dashboard in Spanish/Portuguese (Month 12)
- Widget in 10 languages (Month 15)
- Local payment methods: Mercado Pago, PIX, PayNow (Month 18)

> [!IMPORTANT]
> Latin America is an **underserved**, high-conviction bet. Intercom's $74/month plan
> is 30-40% of a developer's monthly salary in many LATAM markets. InboxChat at $19
> is attainable. This is a genuine arbitrage opportunity.

### Phase C: Product Category Expansion (Month 18-24)

Once InboxChat owns "live chat for early-stage SaaS," trust expands to adjacent categories:

| Expansion | Mechanism |
|---|---|
| **In-app announcements** | Changelog widget — already on roadmap |
| **User onboarding tooltips** | Guide new users without a 3rd-party SDK |
| **CSAT / NPS surveys** | Post-conversation satisfaction — native, no Typeform |
| **Help center (AI-powered)** | Answer common questions before they hit the chat |
| **Knowledge base** | Light CMS for FAQ — replaces Notion/Intercom Articles |

Each expansion is a natural extension of the core loop:
*User needs help → Chat → Follow-up → Survey → Knowledge base → Fewer chats needed.*

### The End Game

```
Month 6:   $10k MRR  — "The live chat for early SaaS"
Month 18:  $50k MRR  — "The customer communication layer for SaaS"
Month 36: $200k MRR  — "The Intercom for the next generation of founders"
```

The vision is not to become Intercom. The vision is to make Intercom irrelevant to the customers they've forgotten.

---

*Document version: 1.1 — March 2025*  
*Owner: Gerardo Valpuesta*  
*Next review: After reaching 100 paying workspaces*
