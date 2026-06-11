# 02 — Competitive Analysis

*Per-competitor assessment from June 2026 research (review-platform themes, vendor materials, market reports) + domain knowledge. Market-level synthesis in [01-market-research.md](01-market-research.md).*

---

## 1. Enterprise PMS

### Oracle OPERA Cloud (+ Micros Simphony POS)
- **Why it wins:** deepest functional coverage in the industry (groups, blocks, folio routing, exports, chain standards); the de-facto RFP checkbox for chains; enormous switching costs; the only credible PMS+POS single-vendor bundle for full-service.
- **Architecture:** OPERA V5 re-platformed to cloud (microservices on OCI); heavy, complex; integration via OHIP (Oracle Hospitality Integration Platform) — improved but gated and enterprise-priced.
- **Validated complaints:** support widely described as poor-to-abysmal; slow UI ("5 minutes to next page" in reviews); UX dense and dated; long training; opaque and high pricing; features behind paywalls; rude/misleading sales experience reported; subcontracted service techs.
- **Disruption vector:** match the *depth* (folio routing, groups, night audit, POS integration) with 10× better UX, transparent pricing, real support, and 1/3 the TCO. Hotels don't love OPERA; they're trapped by the absence of a deep alternative.

### Agilysys
- Strong in resorts/casinos (US-centric); unified PMS+POS+spa+golf story (closest to our thesis, validating it); ERP-rooted back office. Weaknesses: dated UX in places, US-heavy, premium pricing, limited open ecosystem. Their growth proves full-service properties buy the unified pitch.

### Infor HMS / Protel / Stayntouch
- Infor: solid mid-enterprise, weak ecosystem momentum. Protel (now part of Planet): strong EU base, aging; Planet's payments-led roll-up shows fintech-led strategy. Stayntouch: clean cloud PMS, 1,100+ integrations, recently bundling CM/booking engine/kiosk ("Stayntouch 2.0") — moving toward the suite from the PMS side, but no POS, no accounting, no HR.

## 2. Modern Cloud PMS

### Mews (HotelTechAwards #1 PMS 2025)
- **Strengths:** best-in-class UX reputation; API-first with 1,000+ marketplace integrations; embedded payments at the core of its model; flexible time units (hourly/day-use); kiosk; acquired Atomize → native RMS; strong EU brand, moving upmarket.
- **Weaknesses (validated):** reporting depth/customization is the recurring complaint; simplicity becomes a ceiling at full-service scale (F&B, banquets, complex folio routing); POS is partner-territory (it has a marketplace, not a restaurant platform); accounting is export-based; US enterprise penetration still thin.
- **Read:** Mews is the UX/API bar to beat — and proof the market pays for platform elegance. Its marketplace strategy outsources exactly the depth (POS, accounting, HR) we make native.

### Cloudbeds (HotelTechAwards #2)
- **Strengths:** purpose-built unified story (PMS+CM+booking engine+payments on one data model — our thesis at the SMB tier); strong distribution tech; aggressive AI marketing ("Decision Intelligence"); big independent-hotel base.
- **Weaknesses:** depth ceiling at full-service (no real POS, no GL, basic housekeeping); reporting customization complaints mirror Mews; support strain reported at scale; per-feature pricing creep.
- **Read:** validates unified-platform demand at the low end; leaves the full-service tier open.

### Others (RMS Cloud, RoomRaccoon, Hotelogix, eZee, Little Hotelier, Guesty)
- Segment players: RoomRaccoon (automation for small independents), Guesty (short-term-rental ops, different DNA), eZee/Hotelogix (price-led, emerging markets), Little Hotelier (micro-properties). None threaten the full-service tier; all compress SMB pricing. Avoid fighting on their turf at launch.

## 3. Enterprise Platforms (Salesforce/SAP/Dynamics hospitality)
CRM/ERP verticalizations, not operating systems — they sit *above* PMS data and depend on integrations. Treat as future integration partners (corporate CRM sync, ERP consolidation exports), not competitors for the operational core.

## 4. Distribution

### SiteMinder
- Largest channel manager (450+ channels); reliable at scale; now adding "Smart Platform" revenue tools. Weaknesses: it's still a *sync company* — 2-minute update rounds documented, last-room race conditions acknowledged in their own docs, per-channel fees, and the PMS↔CM hop remains a failure surface. RateGain/D-EDGE similar enterprise-pipes positioning.
- **Read:** we don't sell a channel manager; we *eliminate the category* for our tenants (built-in, event-driven, <5s pushes) while connecting to the same OTA APIs (Booking.com Connectivity, Expedia EQC/Rapid, Agoda YCS, Airbnb).

## 5. POS & Restaurant

### Toast
- The restaurant-OS template: POS + KDS + payments + payroll + marketing, loved UX, embedded-fintech economics. Hotel story = PMS integrations (Maestro etc.) with mapping/batch friction. Complaints: total cost creep, weak inventory module, weak data export, hardware lock-in.
### Square / Lightspeed / Oracle Micros
- Square: SMB simplicity, thin hotel fit. Lightspeed: retail/hospitality hybrid, EU presence. Micros Simphony: the entrenched hotel F&B incumbent — deep but expensive, complex, and tied to the OPERA bundle's reputation.
- **Read:** build Toast-grade POS UX *inside* the hotel platform; the room-charge-as-transaction demo is the killshot vs both Toast-with-integration and Micros-with-middleware.

## 6. HR/Workforce (Workday, BambooHR, Deel, Rippling)
Horizontal leaders none of which handle hotel realities natively (occupancy-driven scheduling, tip pooling, multi-position staff, service-charge distribution). Rippling's lesson: identity + payroll + devices unified = compounding lock-in — we apply the same compounding inside hospitality (HR drives platform identity lifecycle). Deel's lesson: country-pack expansion model for payroll. We ship hospitality-native scheduling/time/tips first, payroll country packs progressively, bureau-export everywhere else.

## 7. Modern SaaS Benchmarks (UX bar)
- **Linear:** keyboard-first speed, command palette, opinionated workflows — the model for front-desk ergonomics.
- **Notion:** flexible blocks → our CMS editor and dashboard composition.
- **Stripe:** docs/API DX, dated-version API evolution, webhook debuggability — the model for our platform surface.
- **Vercel/GitHub:** deploy-preview culture, status transparency.
- **Shopify:** the strategic template overall — merchant OS, app ecosystem, embedded payments, themes; "Shopify admin" is the reference for information density done right.
Full UX translation: [13-ux-strategy.md](13-ux-strategy.md).

---

## 8. Synthesis: the opening

| Capability | OPERA+Micros | Mews | Cloudbeds | Toast | **Us (target)** |
|---|---|---|---|---|---|
| Full-service PMS depth | ✅ | ◐ | ◐ | — | ✅ |
| Modern UX/speed | ❌ | ✅ | ◐ | ✅ | ✅ |
| Native restaurant POS | ✅ (bundle, middleware) | ❌ | ❌ | ✅ (standalone) | ✅ (same transaction) |
| Built-in CM/booking engine | ◐ | ◐ | ✅ | — | ✅ (zero-lag) |
| Native GL/accounting | ◐ (exports) | ❌ | ❌ | ❌ | ✅ (USALI) |
| HR/scheduling/payroll | ❌ | ❌ | ❌ | ◐ | ✅ |
| Native RMS/AI | ◐ | ◐ (Atomize) | ◐ | — | ✅ |
| Open API/ecosystem | ◐ (OHIP) | ✅ | ◐ | ◐ | ✅ |
| TCO transparency | ❌ | ◐ | ◐ | ❌ | ✅ |

No vendor holds more than five checks. The unified full-service platform column is empty. **That is the company.**

Common complaints we must *never* earn: slow pages, support black holes, hidden fees, shallow reports, sync excuses. Each has an explicit engineering or operating answer in this blueprint.

**Sources:** as listed in [01-market-research.md](01-market-research.md).
