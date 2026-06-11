# Module 07 — CRM, Guest Profiles & Loyalty

## Purpose
One guest record across every touchpoint — reservations, stays, POS spend, website behavior, messages, reviews, loyalty — owned by the tenant, deduplicated, privacy-compliant. The "single guest record architecture" the industry has named the defining 2026 capability, delivered natively rather than as a bolt-on CDP.

## Features

**Guest profiles**
- Identity: names (with transliterations), emails/phones (multi, verified flags), ID documents (encrypted, auto-purge policy), company links, household/travel-companion links.
- The 360 view: stay history with revenue split (room vs F&B vs other — possible only because POS is native), preferences (pillow, floor, allergies, dietary — flowing to HK boards and KDS), special dates, communication log (all channels), reviews/surveys, lifetime value, open requests.
- Dedup & merge: candidate detection on identifier match (blind-indexed email/phone/document hashes) at create time + nightly sweep; merge UI with field-level survivorship; reversible merge history; API-driven merge for chain-wide identity.
- Tags + computed traits (stay frequency, ADR band, lead time, channel origin, F&B propensity) refreshed by event projections.
- VIP tiers and alerts (front desk + POS see the badge with context).
- Privacy: consent records per purpose, DSAR tooling, masking ([09-security.md](../09-security.md)).

**Segmentation & campaigns**
- Segment builder: visual AND/OR conditions over traits/behavior ("stayed ≥2× in 12 months, F&B spend > $200, no booking next 90 days"), live count preview, materialized + refreshed.
- Campaigns: email (templates with brand kit from CMS), SMS/WhatsApp via providers; triggered journeys on events — pre-arrival (upsell email 3 days out), in-stay (welcome message at check-in event), post-stay (survey, win-back at 11 months); send-time and frequency caps; attribution back to bookings (promo links → booking-engine source tracking).
- Upsell engine: offer catalog (upgrades priced from live availability, early check-in, breakfast, spa) presented pre-arrival/at kiosk/in portal; accepted offers post to reservation/folio automatically.

**Loyalty**
- Program designer: tiers (criteria: nights/stays/spend in rolling window), points earning rules (per currency unit by stream — rooms vs F&B; bonus events), redemption catalog (free nights priced by availability, F&B credit, upgrades), points ledger (immutable entries, expiry schedules), member rates (gated rate plans on booking engine), recognition benefits surfaced operationally (free breakfast flag on KDS/front desk).
- Member portal (within guest portal): balance, history, digital card, redeem.
- Chain-wide: program is tenant-scoped across all properties by default.

**Feedback & reputation**
- Post-stay surveys (NPS + custom), in-stay pulse ("how's everything?" → service-recovery ticket on detractor), review aggregation hooks (Google/TripAdvisor/booking sites via integrations) with AI sentiment tagging routed to department heads ([14-ai-assistant.md](14-ai-assistant.md)).

## Database entities
`guests`, `guest_identifiers`, `guest_preferences`, `guest_links`, `guest_merges`, `guest_consents`, `guest_notes`, `vip_tiers`, `tags`, `computed_traits`, `segments`, `segment_memberships`, `campaigns`, `campaign_sends`, `journeys`, `journey_steps`, `offers`, `offer_acceptances`, `loyalty_programs`, `loyalty_tiers`, `loyalty_members`, `points_entries`, `redemptions`, `surveys`, `survey_responses`, `service_recovery_tickets`.

## APIs
```
CRUD /guests                      GET /guests/{id}/timeline | /value | /duplicates
POST /guests/merge                GET /guests/search?q=    (OpenSearch-backed)
CRUD /segments /campaigns /journeys /offers
POST /campaigns/{id}/send | /test GET /campaigns/{id}/attribution
CRUD /loyalty/programs            GET /loyalty/members/{id}/ledger
POST /loyalty/members/{id}/points (adjust, audited)  POST /redemptions
POST /surveys/{id}/dispatch       GET /feedback/inbox
```

## Workflows
- **Pre-arrival journey:** booking event starts journey → T-3d upsell email (upgrade priced live) → guest accepts suite upgrade → reservation amended + folio adjusted automatically → T-1d online check-in invite → arrival: front desk sees preferences + VIP context.
- **Service recovery:** in-stay survey scores 4/10 → ticket auto-created, duty manager paged → resolution logged on profile → checkout: GM-signed apology + points gesture → post-stay survey excludes the resolved issue from NPS denominator option.
- **Win-back:** segment "lapsed high-value" auto-refreshes → quarterly campaign with member rate → bookings attributed, segment exit on stay.

## Permissions
`guest.*` (pii.view and export separated), `segment.manage`, `campaign.manage`, `loyalty.*`, blacklist management.

## Dependencies
PMS Core (reservations/stays), POS (spend), Booking Engine (behavior, member rates), CMS (brand kit), Notifications (delivery), AI (sentiment, traits). Consumed by BI and Revenue AI (segment demand curves).

## Events
Emits: `guest.created/merged/consent_changed`, `segment.entered/exited`, `offer.accepted`, `loyalty.points_earned/redeemed/tier_changed`, `survey.detractor_response`.
Consumes: `reservation.*`, `pos.check_closed`, `folio.closed`, `campaign engagement webhooks`.

## Future scalability
Cross-tenant brand alliances (opt-in shared programs), CDP export streams, paid-media audience sync (privacy-gated), AI concierge personalization, predictive LTV and churn models.
