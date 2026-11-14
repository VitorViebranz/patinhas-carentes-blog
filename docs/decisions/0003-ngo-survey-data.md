# 0003: Data confirmed by the NGO

Status: accepted
Date: 2026-10-26

## Context

The build prompt was written from the first prototype, before the NGO answered the survey
(answers received on 2026-10-19 and in a follow-up). Some numbers in the prompt were assumptions and
turned out to be wrong, so the code, the schema and the tests were updated.

## Decisions

| Topic               | Before (prompt)                           | Now (NGO answer)                                              |
| ------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| Neutering goal      | 500 kg, stored as `goalKg`                | R$ 350 per neutering and R$ 2.00 per kg, so 175 kg (derived)  |
| Feed days           | 12.5 kg per day, shown in the meter       | Removed. Nothing confirmed it, and it came from the 500 kg    |
| Impact meter        | 0 to 200,000 caps, percent of a neutering | 0 to 2,000 caps, value in reais and effect of 100 people      |
| Monthly report      | Goal reached or not                       | Neutering paid in the month and kg left for the next one      |
| Numbers on the home | Points, neighborhoods, volunteers         | Points, monthly average in kg, animals served per year        |
| Collection points   | Hide inactive                             | Keep the 166 imported points (the NGO says about 110 active)  |
| CNPJ and Pix        | Not shown until informed                  | CNPJ 45.559.299/0001-57 in the footer; Pix key is the CNPJ    |
| Shop prices         | Shown for notebooks and mugs              | Removed from the page                                         |
| Reply time          | Not stated                                | Usually within 2 hours on WhatsApp                            |
| Text size button    | "Texto maior" in the header               | Removed. The prototype dropped it and the base font is 14 px  |
| Panel access        | Several users                             | One administrator created by the seed. User API and card stay |

## Where each value lives

`site_settings` is a single row edited in the panel (Equipe e ajustes): `gramsPerCap`, `kgPriceBrl`,
`spayCostBrl`, `monthlyAverageKg`, `animalsServedYear`, `cnpj`, `pixKey`, contacts. `goalKg` is not
stored: `goalKg = spayCostBrl / kgPriceBrl` (`packages/shared/src/impact.ts`), so the two inputs can
never disagree with a third one. `animalsServedYear` is empty until the NGO informs it, and the home
hides that number while it is empty.

## Assumption that still needs confirmation

A cap weighs 2.5 g on average (400 caps per kg). The NGO accepted it, but it was not measured.
Changing `gramsPerCap` in the panel recalculates the meter and the reports.

## Consequences

- The `site_settings` columns `goal_kg`, `feed_kg_per_day` and `volunteer_count` do not exist. The
  initial migration was written after this change, so there is no data migration.
- `GET /monthly-reports` returns `castrations` instead of `goalReached`.
