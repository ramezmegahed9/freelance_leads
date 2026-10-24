# Freelance Leads — daily research playbook

The daily task follows this file. Output goes to `data/leads.json` only (append; never delete or edit existing leads).

## Who we are
Ramez — WordPress developer and team lead of a strong in-house WordPress/dev team in Egypt (Dashboard, https://dashboard-eg.com).
Competitive pricing. We take: freelance projects, part-time/contract roles, and full outsourcing of a company's development
(white-label for agencies, ongoing maintenance retainers).
Stack: WordPress, Elementor/Elementor Pro, WooCommerce, custom themes & plugins (PHP), headless WordPress + React/Next.js,
GSAP animations, speed/SEO fixes, migrations, Shopify basics.

## What counts as a lead
Someone who publicly said they NEED WordPress work, recently:
- Job/contract/part-time posts for a WordPress developer (remote or Egypt/GCC).
- "Looking for a WordPress developer / agency" posts on LinkedIn, Facebook (groups or pages), Instagram, X, Reddit.
- Agencies looking for a white-label / outsourced WordPress team.
- Companies asking for a new WordPress/WooCommerce site, redesign, fixes, speed, migration, maintenance.

Sources to search: LinkedIn (posts + jobs), Facebook (public posts/groups), Google Jobs (search "wordpress developer" jobs),
Instagram, Wuzzuf, Bayt, Indeed, Upwork/Mostaql/Khamsat/Freelancer (only if the post itself is public), Reddit (r/forhire, r/WordPress),
WeWorkRemotely, Remote OK, company careers pages. Use the built-in browser when search snippets aren't enough.

Market priority: 1) Egypt  2) Saudi Arabia, UAE, Kuwait, Qatar and the rest of GCC  3) remote-friendly anywhere (US/UK/EU/AU).

## Rules
- Search only. Never post, like, comment, apply, follow, join groups or message anyone.
- Freshness: posted within the last 14 days (prefer the last 3). Record the real post date; if only "3 days ago" is shown, convert it.
- Every lead must link to the original post/listing (the source).
- Never invent contact data. Only emails/phones that appear publicly (in the post, the company site contact page, Google listing).
  Leave fields empty if not found. Never guess an email format.
- No duplicates: check `id`, company name and source URL against existing leads.
- Skip: unpaid/equity-only, "internship", students, scams, pure design-only roles, full-time on-site roles outside Egypt
  that need relocation, and posts by other agencies selling services.
- Exactly 5 new leads per run (more only if all are strong). Prefer leads with an email or phone.

## Lead fields
- id: platform prefix + slug (`li-`, `fb-`, `ig-`, `gj-` google jobs, `wz-` wuzzuf, `bt-` bayt, `rd-` reddit, `ot-` other) + company slug + MMDD
- added (run date, YYYY-MM-DD), posted (post date, YYYY-MM-DD)
- company, country, city, platform (LinkedIn / Facebook / Instagram / Google Jobs / Wuzzuf / Bayt / Reddit / Other)
- type: one of `Freelance project`, `Part-time`, `Contract`, `Full-time remote`, `Outsourcing / white-label`, `Maintenance`
- budget (only if stated), stack[] (e.g. WordPress, Elementor, WooCommerce, PHP)
- need: exactly what they need, concrete (1–3 sentences)
- summary: one short line for the card
- source{platform, url, date, title, poster, excerpt} — excerpt is a short paraphrase, not a long copy
- contacts{name, role, emails[], phones[] (international format, e.g. +20 100 123 4567), whatsapp, website, linkedin, facebook, instagram, other}
- extra_sources[{title,url,date}] optional
- email_subject (English), email_subject_ar (Arabic)
- message_en: short, personal, references their exact need, 1 line on the team (Egypt-based WordPress team, competitive rates,
  fast delivery), offers a concrete next step (quick call / sample / quote in 24h). Sign: Ramez.
- message_ar: same message in natural Egyptian/Gulf-friendly professional Arabic (not a literal translation). Sign: رامز.

Set top-level `updated` to the run date.
