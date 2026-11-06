# Analysis report calculation review

Reviewed the monthly and yearly Analysis Report, its PDF export, bill creation, return mutation, and model definitions.

## Corrections and reasons

- Monthly prediction previously queried four calendar months and divided by three, then added an unsupported 10%. It now averages exactly three completed calendar months (zero-sale months included), with no uplift. The selected month is included only once it is complete. Demand labels are fixed quantity thresholds, not trends.
- Annual prediction previously suppressed negative growth, capped positive growth at 50%, but displayed the uncapped growth percentage. It now explicitly uses a repeat-year baseline with 0% assumed growth. Annual revenue forecasts require a completed year. Each monthly product forecast unlocks as soon as its matching month is complete, repeating that month's quantities without multiplying by revenue growth or substituting another year's sales for a zero-sale month.
- Incomplete/future periods no longer compare partial sales against an entire previous period as a growth percentage. Previous-period amounts remain visible as context. Yearly charts still display actual saved data for both years.
- Product aggregation uses product IDs, keeping identically named products separate. Line revenues proportionally allocate saved bill totals, including bill-level discounts, in cents. Quantities are stored base-unit quantities, not a sum of incompatible selling units. Bills without positive line totals remain in sales but cannot be attributed to products.
- Net Profit was misleading: revenue minus the expense register excludes historical cost of goods sold, and expenses can include asset purchases. The metric is now Sales Less Recorded Expenses in both the page and PDF. No historical costs are invented from current product prices.
- Low-month suggestions compare only completed months against 70% of their average. The 40% expense warning is explicitly a review threshold, not a margin calculation.
- Monthly defaults and input validation are fixed. Period boundaries and grouping use the database's Sri Lanka timezone and exclusive upper bounds. Expense DATEONLY queries use date strings.
- Expense query failures now fail visibly instead of displaying zero expenses. Removed unused project queries: they requested a nonexistent total_amount field and silently discarded failures (the model uses final_cost and has no total_amount). Projects are not displayed on this page and are not added to bill sales.
- Zero-revenue product bars avoid division by zero. The pie chart explicitly says it covers only six products. Stale responses cannot overwrite a newly selected period.

## Formulas retained

Sales = sum of saved eligible bill total_amount values, including credit balances; this is not cash collected. Eligible states are PAID, PARTIAL, and UNPAID. Bill count = eligible bills in the period, including zero-value bills. Average bill = sales / count (zero if no bills). Growth = (current - previous) / previous × 100, only for completed periods and a positive previous baseline. Daily/monthly series sum the same bill totals. Top products rank allocated sales, not profit. Expenses sum the expense register for the selected year.

## Data limitations

ReturnService changes original bill totals and item quantities, so reports reflect those changes in the original sale period. Refunds must not be subtracted a second time. This is not an immutable accounting ledger. The return service also recalculates remaining line totals using base quantity and selling-unit price; historical unit conversion/return correctness needs a separate transaction-level audit. Report changes cannot reconstruct missing historical unit-cost snapshots or original ledger entries.

## Validation

Node regression tests cover discounts and penny allocation, duplicate names, leap-day and timezone boundaries, exact forecast windows, declining sales, zero-sale months, incomplete years, invalid/default parameters, and failed expense reads. Client production build checks JSX integration. No production database reconciliation or browser visual validation was performed.

## Added report features

- Daily chart points, yearly month bars, product rankings, forecast products, and yearly forecast rows open a lazy-loaded bill and quantity drill-down.
- Monthly reports export to the existing printable PDF template and to an Excel-compatible UTF-8 CSV file.
- Monthly forecasts report the number of active history months and bills used, with high, medium, or low confidence at both report and product level.
- Yearly highlights identify strongest and weakest completed months, the fastest-growing product by allocated sales, and up to five products with declining allocated sales. Product comparisons use the same completed months from the prior year and include products that fell to zero.
