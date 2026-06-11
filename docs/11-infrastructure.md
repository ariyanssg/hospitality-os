# 11 — Infrastructure Design

> Boring, proven AWS primitives arranged for a transactional system that hotels bet their nightly revenue on. Optimize for: blast-radius control, fast recovery, and a small platform team operating it.

---

## 1. AWS Topology (per region/cell)

```
Route 53 → CloudFront (static, ISR pages, media) 
         → WAF → ALB (api.*, ws.*)
              → EKS cluster (3 AZs)
                  ├─ api deployment (HPA: CPU+RPS)
                  ├─ ws deployment (HPA: connections; ALB sticky)
                  ├─ worker deployment (KEDA: queue depth)
                  ├─ inference service (Python; GPU optional later)
                  └─ platform: ESO (secrets), otel-collector, reloader
Aurora PostgreSQL (writer + 2 readers, 3 AZ) ← PgBouncer (in-cluster)
ElastiCache Redis (cluster mode, multi-AZ)
OpenSearch Service (3 data nodes, dedicated masters at scale)
S3 (media, exports, archives, backups) + KMS CMKs
SES / external: PSP, Twilio/BSP, FCM/APNs, Claude API
```

- **Environments:** `dev` (shared, auto-deploy on merge), `staging` (prod-shaped, smaller, synthetic tenant data + OTA sandboxes), `prod`. Ephemeral preview environments per PR for frontend apps (Vercel-style via internal tooling or Vercel for the Next.js apps with API pointing at dev).
- **IaC:** Terraform (modules per stack: network, EKS, data stores, observability), single source of truth, plan-on-PR/apply-on-merge with manual gate for prod data stores. K8s manifests via Helm charts in-repo; ArgoCD for GitOps sync.
- **Containers:** distroless Node images, multi-stage builds, image scanning (Trivy) gate, signed images (cosign), ECR.

## 2. Kubernetes conventions

- Namespaces per environment-component (`prod-app`, `prod-platform`); NetworkPolicies default-deny between namespaces; PodDisruptionBudgets on all deployments; topology-spread across AZs.
- Resource requests/limits enforced; vertical sizing reviewed from usage data monthly.
- Progressive delivery: rolling updates with readiness gates; canary (Argo Rollouts, 10%→50%→100% on error-rate/latency analysis) for api/ws; workers drain-then-replace.
- Cron-style jobs (night audit orchestration, partition management, backup verification) run as queue-scheduled worker tasks (BullMQ repeatables), **not** K8s CronJobs — they need tenant context, observability, and retry semantics in-app.

## 3. CDN & Edge

- CloudFront: static assets (immutable, hashed), CMS sites (Next.js ISR with event-driven revalidation on `cms.page_published`), media (S3 origin, image transformation at edge or pre-derived renditions), booking-engine pages (short-TTL HTML, no-cache on availability JSON).
- WAF: managed core rules + rate-based rules on auth/booking endpoints + bot control on `/public/*`; geo controls per tenant policy where lawful.

## 4. DR & Continuity

| Metric | Target |
|---|---|
| RPO (data loss) | ≤ 5 min (continuous WAL archiving) |
| RTO (region-internal failure) | minutes (multi-AZ failover automatic) |
| RTO (full-region loss) | ≤ 4 h: cross-region snapshot copies + IaC re-provision runbook (warm-standby tier offered to enterprise later) |

- Quarterly game days: restore drill, AZ-loss simulation, Redis flush recovery (cache-only by design), OpenSearch rebuild from projections.
- **Property-level continuity:** the POS offline mode + a printable "emergency pack" (tonight's arrivals, in-house list, room status — auto-generated to property email on schedule) cover the hotel when *their* internet dies; this is an operational feature competitors ignore.

## 5. Cost posture

- Compute right-sized via HPA/KEDA; Graviton nodes; Savings Plans after baseline stabilizes; per-tenant cost telemetry (requests, storage, AI tokens, messages) feeding unit economics dashboards — COGS per room/month is a tracked KPI from day one (target: <8% of ARR at scale).
- Data lifecycle: partitions → S3 archive (Parquet) → Glacier per retention matrix.

## 6. Cell-based growth path

V1 ships one production cell (likely EU for GDPR-friendly reference customers, or US per design-partner geography). A **cell** = full stack above. Growth/residency adds cells; tenants pinned to cells; global layer = Route 53 + tenant directory + billing. No shared data plane across cells — blast radius and residency stay clean. (See [04-system-architecture.md §10](04-system-architecture.md).)

---

Related: [12-performance-scalability.md](12-performance-scalability.md) · [14-engineering-standards.md](14-engineering-standards.md) (observability/CI-CD) · [09-security.md](09-security.md)
