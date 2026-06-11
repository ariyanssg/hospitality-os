# Module 04 — Inventory & Procurement

## Purpose
Control the property's physical stock — F&B ingredients, beverages, minibar, linen, amenities, engineering parts, retail — from requisition to consumption, with recipe-level costing that turns POS sales into live food-cost percentages and automatic GL valuation.

## Features

**Stock control**
- Multi-store model per property: main store, outlet stores (each restaurant/bar), housekeeping pantry, engineering store, minibar float.
- Items with units-of-measure conversions (case → bottle → pour), storage requirements, par levels per store, reorder points.
- Movements (all immutable, double-sided like the ledger): receiving, transfer between stores, issue to department (expense), spoilage/waste (reason-coded), physical-count adjustment, return-to-vendor.
- Perpetual inventory valuation: weighted-average cost (FIFO option later); every movement posts GL (inventory asset ↔ COGS/expense by department cost center) automatically.
- Physical counts: scheduled count sheets per store (full or cycle counts), blind-count mode, variance report with approval before adjustment posting.
- Batch/expiry tracking for perishables; waste-log analytics.

**Recipes & F&B costing**
- Recipes per menu item (ingredients + quantities + yield); sub-recipes (sauces, preps); theoretical cost auto-recalculated on ingredient price change; menu engineering report (popularity × margin matrix — stars/dogs).
- POS sale → theoretical depletion of outlet store; periodic count → theoretical-vs-actual variance (shrinkage detection per outlet).
- Allergen and nutrition data on ingredients → propagates to menu items and KDS.

**Procurement**
- Requisition → approval → PO → receiving → invoice match (3-way match: PO vs GRN vs vendor invoice → AP).
- Supplier registry: catalogs, price lists with validity windows, multi-supplier price comparison on PO creation, supplier scorecards (price variance, delivery reliability).
- Approval matrix by amount and department (conditions in permission grants).
- Receiving with partials/over-delivery rules, quality rejection, landed-cost allocation (freight).
- Auto-suggested orders from par/reorder levels and forecasted consumption (occupancy-linked: amenities scale with arrivals; food with covers forecast).

## Database entities
`stores`, `stock_items`, `item_units`, `item_store_levels` (par/reorder/qty-on-hand), `stock_movements`, `stock_counts`, `stock_count_lines`, `recipes`, `recipe_ingredients`, `suppliers`, `supplier_catalog_items`, `price_lists`, `requisitions`, `purchase_orders`, `po_lines`, `goods_receipts`, `grn_lines`, `invoice_matches`, `waste_logs`.

## APIs
```
CRUD /inventory/items /stores /suppliers /recipes
POST /inventory/movements            (typed: receive|transfer|issue|waste|adjust)
POST /inventory/counts  /counts/{id}/post
GET  /inventory/items/{id}/levels    GET /inventory/valuation?store=
CRUD /procurement/requisitions       POST /requisitions/{id}/approve
CRUD /procurement/purchase-orders    POST /purchase-orders/{id}/send | /receive
GET  /procurement/suggested-orders   GET /fnb/menu-engineering?outlet=&period=
```

## Workflows
- **Weekly F&B cycle:** chef builds requisition from suggested order (par + covers forecast) → F&B manager approves → POs auto-split by best supplier price → receiving clerk scans GRN against PO (variances flagged) → stock and GL update; vendor invoice arrives → 3-way match → AP voucher created ([05-accounting-finance.md](05-accounting-finance.md)).
- **Outlet variance:** month-end count at pool bar → actual 6 bottles under theoretical → variance report to F&B manager with per-item shrinkage value → investigation workflow note.
- **86 loop:** stock item hits zero in outlet store → `stock.depleted` event → POS auto-86s linked menu items (policy-controlled).

## Permissions
`stock.*`, `purchase.requisition.create`, `purchase.order.create/approve`, `supplier.manage`, `receiving.manage`, `recipe.manage` — approval amounts via conditional grants.

## Dependencies
GL (valuation postings, AP handoff), POS (sales depletion, 86), Housekeeping (linen/amenity issues), Maintenance (parts), HR (cost centers). Consumed by BI (food cost %, GOP flow-through), AI (consumption forecasting).

## Events
Emits: `stock.received/transferred/issued/depleted/adjusted`, `po.created/approved/received`, `count.posted`.
Consumes: `pos.check_closed` (depletion), `occupancy.forecast_updated` (suggested orders), `housekeeping.task_completed` (amenity usage models, later).

## Future scalability
Central purchasing for chains (group contracts, inter-property transfers), EDI/punch-out supplier integrations, IoT scale/temperature monitoring, sustainability reporting (waste KPIs, carbon per cover).
