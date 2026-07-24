# Licensing — options for the owner to decide

**Status: your decision. Nothing here has been changed.**

The repository already ships an **MIT** `LICENSE` (Copyright © 2026 Sebi
Iancu), and GitHub reports the public repo as MIT-licensed. So the task of
"add a LICENSE file" is already done — the real question is whether MIT is
still the licence you want.

This is a legal decision, not a technical one. The summaries below are a
starting point for a conversation with someone qualified, not legal advice.

---

## What you said you want

From the brief: the repo should stay genuinely readable and auditable, but
someone who clones it should not be able to stand up an identical competing
service.

Worth being blunt about one thing first: **no licence can deliver the second
half on its own.** A licence governs what people are *permitted* to do, not
what they are *able* to do. What actually stops a clone from working is that
the API keys, the Supabase project and the tuned configuration are not in the
repo — see `docs/ARCHITECTURE-PRIVACY-PROPOSAL.md`. The licence decides
whether you have legal recourse when someone hosts it anyway.

---

## Option A — Keep MIT (status quo)

Maximally permissive. Anyone may use, modify, sell and host the software,
including commercially, provided they keep your copyright notice.

- **For:** already in place; the most recognised open-source licence;
  friendliest to contributors, forks and hiring signals; zero friction for
  anyone evaluating the project.
- **Against:** explicitly permits a competitor to launch a hosted copy of
  Verifact and charge for it. No obligation to publish their changes.
- **Pick this if** the goal is credibility, adoption and contributions, and
  you accept that the moat is your infrastructure and data rather than the
  licence.

## Option B — AGPL-3.0 (copyleft, still OSI open source)

Also fully open source, but with a network clause: anyone who runs a modified
version **as a network service** must publish their source under the AGPL too.

- **For:** still genuinely open source; removes the "take it private, host it,
  compete" path — a competitor must open their improvements; widely used by
  companies in exactly this position (Grafana pre-2021, MongoDB pre-SSPL,
  Mastodon, Nextcloud).
- **Against:** many companies forbid AGPL internally, which shrinks your
  contributor and adopter pool; it does **not** prevent commercial hosting, it
  only forces the host to share their source; changing from MIT to AGPL needs
  the agreement of every copyright holder — trivial today while you are the
  sole author, much harder after outside contributions land.
- **Pick this if** you want to stay a real open-source project but close off
  proprietary re-hosting.

## Option C — Business Source License 1.1 (source-available, not open source)

Source is public and freely usable for development, testing and internal use.
A *usage limitation* forbids offering it as a commercial service. Each release
automatically converts to a chosen open-source licence (commonly Apache-2.0)
after a set period, typically 3–4 years.

- **For:** the closest match to "readable and contributable, but you cannot
  host it commercially"; the time-delayed conversion keeps a credible
  open-source commitment; established precedent (HashiCorp, Sentry, MariaDB,
  CockroachDB).
- **Against:** **not** an OSI-approved open-source licence — you must stop
  describing the project as "open source", which matters here because the
  landing page and README currently say *"100% open source sub licență MIT"*
  and *"Transparență Radicală"*; some contributors will decline on principle;
  GitHub will show it as "Other".
- **Pick this if** commercial self-hosting by others is the specific thing you
  want to prevent, and you are comfortable dropping the "open source" label for
  "source available".

---

## If you change the licence, also change

A licence swap is not just the `LICENSE` file. These currently assert MIT:

- `package.json` → `"license": "MIT"`
- `README.md` → licence section and badge
- `src/app/page.tsx` → *"Proiectul nostru este 100% open source sub licență
  MIT"* and the *"Codul pe GitHub (MIT License)"* button
- `src/components/home/Hero/index.tsx` → *"Licență MIT"* in the disclaimer
- `src/app/transparency/page.tsx` → any licence claim there
- The GitHub repo's detected licence updates itself from `LICENSE`

Leaving stale MIT claims in the UI while the repo says something else is worse
than either choice on its own, because MIT text already published stays valid
for the versions it was published under.

---

## Suggested next step

Decide between A and B first — that is the real fork in the road, since C means
giving up the "open source" description the product currently leans on. If you
lean toward B or C, do it **before** accepting outside contributions, while you
are still the only copyright holder.
