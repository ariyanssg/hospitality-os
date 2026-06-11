# Module 08 — Website CMS & Booking Engine

> Direct bookings are the highest-margin channel, yet hotels run brochure sites on WordPress with an iframed third-party booking widget that lags inventory by minutes. Ours reads the same availability counters the front desk writes. **Zero synchronization lag is a database property, not a feature claim.**

## Purpose
Let every property (or chain) run a fast, beautiful, SEO-strong website with a conversion-optimized booking flow — no agency, no plugin stack, no sync.

## Features

**CMS**
- Block-based page builder (sections: hero, room showcase, offers, gallery, dining, events, FAQ, map) with property data bindings — room pages render live from PMS room types (photos, amenities, *from-price* computed from real rates); editing is structured content, not freeform HTML.
- Theming: design tokens (colors, type, spacing) + curated premium templates; custom domain + automatic TLS; brand kit shared with CRM emails.
- Content: blogs, events, offers/packages (bound to PMS packages — publishing an offer creates its bookable rate context), media library (S3 + CDN, auto-optimized AVIF/WebP, focal-point cropping), multi-language content with locale routing, scheduled publishing, preview + draft/publish workflow with roles (`cms.page.edit` vs `cms.page.publish`).
- SEO: per-page meta/OG, automatic schema.org (`Hotel`, `HotelRoom`, `Offer` structured data — feeds Google free booking links + AI travel agents), sitemaps, redirects manager, Core-Web-Vitals-first rendering (Next.js ISR on CDN, target LCP < 1.5s).
- Chain mode: shared component library + brand governance across property sites; group portal site.

**Booking engine**
- Flow: dates/guests → live availability & rates (room types with rate-plan choices, package toggles, member rates on login) → room selection (attribute filters: view, floor, accessibility) → upsells (early check-in, breakfast, parking — from CRM offer catalog) → guest details (returning-guest recognition) → payment (PSP elements; deposit/guarantee per policy) → instant confirmation. Target: 3 steps, < 30s.
- Real-time truth: availability/rate reads from Redis cache (60s TTL + event bust) with **write-time revalidation against Postgres counters** — a sold-out flash sale can never oversell; last-room scenarios resolve via the counter constraint ([modules/01-pms-core.md](01-pms-core.md)).
- Pricing: dynamic prices from Revenue AI flow instantly (same rate tables); promo codes; multi-currency display (FX at display, charge in property currency or PSP DCC); tax-inclusive display per locale law.
- Conversion toolkit: urgency signals (true remaining count, never fake), abandoned-booking recovery (email capture early + resume link), price-calendar view (cheapest dates), hold-my-rate option (TTL tentative hold), Google Hotel Ads / metasearch feed (free booking links first), gift vouchers.
- Guest accounts: view/modify/cancel within policy (self-service modification hits the same reservation API with policy validation), loyalty integration.
- Embeddable widget mode for hotels keeping an external site (script tag, same engine).
- Accessibility WCAG 2.2 AA; full analytics events (funnel steps → BI; attribution to campaigns/promo).

## Database entities
`sites`, `site_domains`, `pages`, `page_blocks`, `content_translations`, `media_assets`, `menus_nav`, `blog_posts`, `site_offers`, `redirects`, `seo_settings`, `themes`, `booking_sessions`, `booking_abandonments`, `gift_vouchers`, `metasearch_feeds`.
(Availability, rates, reservations, guests live in their owning modules — the engine has **no shadow copies**.)

## APIs
```
# CMS (staff)
CRUD /cms/sites /pages /blocks /media /blog-posts /redirects
POST /cms/pages/{id}/publish        GET /cms/sites/{id}/preview-token

# Booking (public, rate-limited, bot-protected)
GET  /public/availability?property=&from=&to=&adults=&children=&promo=
GET  /public/rate-calendar?month=
POST /public/booking-sessions       (start; holds optional)
POST /public/booking-sessions/{id}/confirm   (Idempotency-Key, PSP token)
GET  /public/reservations/{confirmation}?email=   POST .../cancel | /modify
```

## Workflows
- **Launch a site:** pick template → bind property (rooms/offers auto-populate) → edit blocks → connect domain (DNS wizard, auto-TLS) → publish. Day one, no developer.
- **Flash offer:** marketing creates "Summer 26" package in PMS rates → CMS offer page auto-binds → campaign email via CRM → bookings carry source attribution → BI shows package pickup live; revenue manager watches displacement in the same dashboard.
- **Abandoned recovery:** guest leaves at payment → session stored with consented email → 2h later resume email with held price (policy TTL) → conversion tracked.

## Permissions
`cms.*`, `seo.manage`, `bookingengine.configure`; public endpoints are unauthenticated with strict rate limiting + bot defense ([09-security.md](../09-security.md)).

## Dependencies
PMS Core (availability/rates/reservations — in-process), CRM (offers, recognition, attribution), Payments (PSP), Files/CDN, Revenue AI (prices). Consumed by: BI (funnel), Channel Manager (metasearch is arguably distribution — feeds generated here, managed there).

## Events
Emits: `booking_session.started/abandoned`, `direct.booking_confirmed` (specialization of `reservation.created`), `cms.page_published`, `voucher.sold/redeemed`.
Consumes: `availability.changed`/`rate.price_changed` (cache bust), `reservation.cancelled` (voucher/locks), `offer.accepted`.

## Future scalability
A/B testing framework on blocks and funnel; AI content generation (page copy, translations) with brand voice; AI travel-agent readiness (clean structured data + booking API for agentic buyers — the 2026+ distribution shift); marketplace of premium templates; headless API for custom brand sites on our booking core.
