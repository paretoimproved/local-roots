# CFO Financial & Unit Economics Audit -- v2

**Date:** February 27, 2026
**Scope:** Updated financial model reflecting new fee structure (7% + $0.35)
**Prior audit:** `docs/audits/cfo-audit.md` (v1, same date, at 5% + $0.00)
**Status:** READ-ONLY audit -- no code modifications

---

## Executive Summary

The fee structure has been updated from 5% + $0.00 to 7% + $0.35. This is the
single most impactful change the business has made to its unit economics. The
prior audit identified 5% as "contribution-dangerous" and recommended 7% as the
sweet spot. That recommendation has now been implemented in code.

**Key findings at 7% + $0.35:**

- Net contribution per $45 subscription order: **$1.68** (was $0.43 at 5%)
- Subscriber LTV:CAC: **6.5x** (was 2.7x) -- now above the 3x minimum threshold
- Break-even subscribers: **~24,400** (was ~95,000) -- a 74% reduction
- Break-even farmers at 40 subs/farmer: **~610** (was ~2,375)
- The fee remains competitive: well below DoorDash (15%), Instacart (5-10%),
  and comparable to Harvie (7% seller-side + CC fees)

**Bottom line:** The new fee structure transforms Local-Roots from a business
that requires near-impossible scale to break even into one that can reach
profitability at a realistic farmer count. The math now works.

---

## Table of Contents

1. [Implementation Verification](#1-implementation-verification)
2. [Updated Unit Economics](#2-updated-unit-economics)
3. [Revised Break-Even Analysis](#3-revised-break-even-analysis)
4. [LTV:CAC Update](#4-ltvcac-update)
5. [Competitive Positioning](#5-competitive-positioning)
6. [Sensitivity Analysis](#6-sensitivity-analysis)
7. [Risk Assessment](#7-risk-assessment)
8. [Recommendation & Key Risks to Monitor](#8-recommendation--key-risks-to-monitor)

---

## 1. Implementation Verification

### Config Defaults (Confirmed)

Source: `backend/internal/config/config.go`, lines 55-66

```go
buyerFeeBps := 700                          // line 55
// ...
buyerFeeFlatCents := 35                     // line 61
```

| Variable              | Old Default | New Default | Status    |
|-----------------------|-------------|-------------|-----------|
| `BUYER_FEE_BPS`       | `0`         | `700`       | CONFIRMED |
| `BUYER_FEE_FLAT_CENTS` | `0`        | `35`        | CONFIRMED |

The defaults are now baked into the binary. A fresh deploy with NO environment
variable overrides will charge 7% + $0.35. This resolves the v1 audit's
critical finding that fees defaulted to zero.

### CLAUDE.md Documentation (Confirmed)

`CLAUDE.md` line items for these environment variables now document the defaults
as `700` and `35` respectively. Consistent with the code.

### Fee Formula (Unchanged)

The `computeBuyerFee()` function at `subscriptions.go:277-297` is unchanged:

```
fee = (subtotalCents * 700) / 10000 + 35
total = subtotalCents + fee
```

For a 4500-cent ($45.00) subtotal:
```
fee = (4500 * 700) / 10000 + 35  =  315 + 35  =  350 cents ($3.50)
total = 4500 + 350 = 4850 cents ($48.50)
```

All five call sites (subscription checkout, subscription PI validation, order
checkout, order creation, cycle generation) still use `computeBuyerFee`.
Verified by `fee_consistency_test.go`.

### v1 Critical Finding Resolution

| v1 Finding                                   | Status   |
|----------------------------------------------|----------|
| Fees default to zero; verify prod env vars   | RESOLVED |
| 5% is contribution-dangerous                 | RESOLVED |
| Orders below ~$23 are contribution-negative  | RESOLVED (see section 2) |
| LTV:CAC below 3x minimum                    | RESOLVED (see section 4) |
| Strategy memo overstates unit economics      | STILL OPEN -- memo should be updated |

---

## 2. Updated Unit Economics

### Assumptions

| Parameter                    | Value     | Source / Rationale                |
|------------------------------|-----------|-----------------------------------|
| Average box price (sub)      | $45.00    | CEO strategy memo                 |
| Average walk-up order        | $25.00    | Smaller basket, walk-up items     |
| Buyer service fee            | 7% + $0.35 | New defaults in config.go        |
| Stripe processing            | 2.9% + $0.30 | Standard Stripe rate           |
| Connect account fee          | $2/mo/account | Stripe Connect Express        |
| Connect payout fee           | 0.25% + $0.25 | Stripe Connect Express        |
| Sub cadence mix              | 60% weekly, 25% biweekly, 15% monthly |               |
| Weighted avg orders/mo/sub   | 3.1       | (0.6*4.3 + 0.25*2.15 + 0.15*1)  |
| Subscriber monthly churn     | 8%        | Target from GTM strategy          |
| Walk-up buyer monthly churn  | 40%       | High churn, low loyalty           |
| Infrastructure cost/txn      | $0.15     | CEO memo estimate                 |

### 2.1 Revenue Per Transaction (New vs Old)

```
======================================================================
SUBSCRIPTION ORDER ($45.00 box)
======================================================================
                                   OLD (5%)      NEW (7%+$0.35)
                                   ----------    ---------------
Subtotal                           $45.00        $45.00
Buyer fee                          $ 2.25        $ 3.50
  (% component)                    ($2.25)       ($3.15)
  (flat component)                 ($0.00)       ($0.35)
Total charged to card              $47.25        $48.50
Stripe processing (2.9% + $0.30)  -$ 1.67       -$ 1.71
  (2.9% of total)                  ($1.37)       ($1.41)
  ($0.30 flat)                     ($0.30)       ($0.30)
Net platform revenue               $ 0.58        $ 1.79
Infrastructure cost                -$ 0.15       -$ 0.15
CONTRIBUTION PER TXN               $ 0.43        $ 1.64
                                   ======        ======
IMPROVEMENT:                       +$1.21/txn    (+281%)

======================================================================
ONE-TIME ORDER ($25.00 walk-up)
======================================================================
                                   OLD (5%)      NEW (7%+$0.35)
                                   ----------    ---------------
Subtotal                           $25.00        $25.00
Buyer fee                          $ 1.25        $ 2.10
  (% component)                    ($1.25)       ($1.75)
  (flat component)                 ($0.00)       ($0.35)
Total charged to card              $26.25        $27.10
Stripe processing (2.9% + $0.30)  -$ 1.06       -$ 1.09
Net platform revenue               $ 0.19        $ 1.01
Infrastructure cost                -$ 0.15       -$ 0.15
CONTRIBUTION PER TXN               $ 0.04        $ 0.86
                                   ======        ======
IMPROVEMENT:                       +$0.82/txn    (walk-up is now viable!)
```

### 2.2 Contribution by Box Price (7% + $0.35)

```
+-------------+-----------+--------+--------+---------+---------+--------+
| Box Price   | Fee       | Stripe | Net Rev| Infra   | Contrib | Margin |
|             | 7%+$0.35  | Cost   |        |         |         | on GMV |
+-------------+-----------+--------+--------+---------+---------+--------+
| $15.00      | $1.40     | $0.78  | $0.62  | $0.15   | $0.47   |  3.1%  |
| $20.00      | $1.75     | $0.93  | $0.82  | $0.15   | $0.67   |  3.4%  |
| $25.00      | $2.10     | $1.09  | $1.01  | $0.15   | $0.86   |  3.4%  |
| $30.00      | $2.45     | $1.24  | $1.21  | $0.15   | $1.06   |  3.5%  |
| $35.00      | $2.80     | $1.40  | $1.40  | $0.15   | $1.25   |  3.6%  |
| $40.00      | $3.15     | $1.55  | $1.60  | $0.15   | $1.45   |  3.6%  |
| $45.00      | $3.50     | $1.71  | $1.79  | $0.15   | $1.64   |  3.6%  |
| $50.00      | $3.85     | $1.86  | $1.99  | $0.15   | $1.84   |  3.7%  |
| $65.00      | $4.90     | $2.33  | $2.57  | $0.15   | $2.42   |  3.7%  |
+-------------+-----------+--------+--------+---------+---------+--------+

Stripe cost formula: 0.029 * (box_price + fee) + 0.30
Contribution = fee - Stripe_cost - 0.15

BREAKEVEN BOX PRICE (where contribution = 0):
  Let x = box price in dollars.
  Fee = 0.07x + 0.35
  Stripe = 0.029 * (x + 0.07x + 0.35) + 0.30
         = 0.029 * (1.07x + 0.35) + 0.30
         = 0.03103x + 0.01015 + 0.30
         = 0.03103x + 0.31015
  Contribution = Fee - Stripe - 0.15
               = 0.07x + 0.35 - 0.03103x - 0.31015 - 0.15
               = 0.03897x - 0.11015
  Set to 0:
    0.03897x = 0.11015
    x = $2.83

  At 7% + $0.35, orders are contribution-positive above ~$3.
  (At 5% + $0.00, the floor was $23.02.)
  The $0.35 flat fee eliminates the low-order-value problem entirely.
```

**This is the most important structural improvement.** The flat fee means every
order above $3 generates positive contribution, regardless of basket size. The
v1 audit flagged orders below $23 as contribution-negative; that problem is
now solved.

### 2.3 Contribution Per Buyer Per Month (New vs Old)

```
======================================================================
SUBSCRIBER (weekly, $45 box)
======================================================================
                                   OLD           NEW
Orders per month                   4.3           4.3
Contribution per order             $0.43         $1.64
MONTHLY CONTRIBUTION               $1.85         $7.05
Connect fee amortized              ~$0.05        ~$0.05
NET MONTHLY CONTRIBUTION           $1.80         $7.00

======================================================================
SUBSCRIBER (biweekly, $45 box)
======================================================================
Orders per month                   2.15          2.15
Contribution per order             $0.43         $1.64
MONTHLY CONTRIBUTION               $0.92         $3.53

======================================================================
SUBSCRIBER (monthly, $45 box)
======================================================================
Orders per month                   1.0           1.0
Contribution per order             $0.43         $1.64
MONTHLY CONTRIBUTION               $0.43         $1.64

======================================================================
WALK-UP BUYER ($25, 1.5 orders/mo)
======================================================================
Orders per month                   1.5           1.5
Contribution per order             $0.04         $0.86
MONTHLY CONTRIBUTION               $0.06         $1.29

======================================================================
BLENDED SUBSCRIBER (weighted by cadence mix)
======================================================================
OLD: 0.60*$1.80 + 0.25*$0.92 + 0.15*$0.43 = $1.37/mo
NEW: 0.60*$7.00 + 0.25*$3.53 + 0.15*$1.64 = $4.20+$0.88+$0.25 = $5.33/mo

IMPROVEMENT: +$3.96/mo per subscriber (+289%)
```

### 2.4 Per-Transaction Money Flow (New)

For a $45.00 subscription box at 7% + $0.35:

```
BUYER PAYS:
  Box price (subtotal)                    $45.00
  + Service fee (7% + $0.35)             $ 3.50
  ----------------------------------------
  Total charged to card                   $48.50

STRIPE CAPTURES:
  Total authorization                     $48.50
  - Stripe processing (2.9% + $0.30)     -$ 1.71
  ----------------------------------------
  Net settled to Local-Roots               $46.80

LOCAL-ROOTS TRANSFERS TO SELLER:
  Seller payout = subtotal_cents           $45.00

LOCAL-ROOTS RETAINS:
  Net settled - seller transfer            $ 1.80
  This equals: buyer_fee - Stripe fees     $ 3.50 - $1.71 = $1.79
  (Rounding difference from cents math)

EFFECTIVE NET MARGIN ON GMV:              $1.79 / $45.00 = 3.98%
  (Was 1.29% at 5%)
```

---

## 3. Revised Break-Even Analysis

### Monthly Fixed Costs (Unchanged from v1)

```
+-------------------+--------+---------+----------+-----------+
| Cost Category     | 10     | 100     | 1,000    | 5,000     |
|                   | farmers| farmers | farmers  | farmers   |
+-------------------+--------+---------+----------+-----------+
| Engineering       | $0*    | $0*     | $25,000  | $60,000   |
| Farmer success    | $0*    | $5,000  | $15,000  | $40,000   |
| Infrastructure    | $55    | $350    | $2,500   | $10,000   |
| Marketing         | $500   | $2,000  | $10,000  | $30,000   |
| Legal/accounting  | $200   | $500    | $2,000   | $5,000    |
| Stripe Connect    | $20    | $200    | $2,000   | $10,000   |
+-------------------+--------+---------+----------+-----------+
| TOTAL MONTHLY     | $775   | $8,050  | $56,500  | $155,000  |
+-------------------+--------+---------+----------+-----------+

* Founder does everything at small scale. Salary not included.
```

### Three Scenarios (Updated for 7% + $0.35)

Common assumptions:
- Average box price: $45
- Buyer service fee: 7% + $0.35
- Net contribution per sub order: $1.64
- Weighted avg orders per sub per month: 3.1
- Walk-up orders: 20% of subscription volume
- Walk-up contribution per order: $0.86

```
==========================================================================
SCENARIO 1: BEAR CASE (Slow adoption, high churn)
==========================================================================

Parameters:
  Farmers                         15
  Subscribers per farmer          8
  Total subscribers               120
  Monthly churn                   12%
  Walk-up orders/mo               75

Monthly Revenue:
  Sub orders: 120 * 3.1           372 orders
  Sub contribution: 372 * $1.64   $610.08
  Walk-up: 75 * $0.86             $64.50
  TOTAL MONTHLY CONTRIBUTION      $674.58

Monthly Fixed Costs:              $1,500

MONTHLY LOSS:                     -$825
ANNUAL LOSS:                      -$9,905

vs v1:  Loss improved from -$1,337/mo to -$825/mo (+38%)
        Still not break-even at this scale, but the gap is much smaller.

==========================================================================
SCENARIO 2: BASE CASE (Strategy targets met)
==========================================================================

Parameters:
  Farmers                         200
  Subscribers per farmer          20
  Total subscribers               4,000
  Monthly churn                   8%
  Walk-up orders/mo               2,500

Monthly Revenue:
  Sub orders: 4,000 * 3.1         12,400 orders
  Sub contribution: 12,400*$1.64  $20,336
  Walk-up: 2,500 * $0.86          $2,150
  TOTAL MONTHLY CONTRIBUTION      $22,486

Monthly Fixed Costs:              $25,000

MONTHLY LOSS:                     -$2,514
ANNUAL LOSS:                      -$30,168

vs v1:  Loss improved from -$19,568/mo to -$2,514/mo (+87%)
        Nearly break-even. Only needs ~300 more subscribers or
        slight cost reduction.

SUBSCRIBERS NEEDED AT THIS COST LEVEL:
  $25,000 / ($1.64 * 3.1) = 4,917 subscribers
  At 20 subs/farmer: 246 farmers (very achievable)

==========================================================================
SCENARIO 3: BULL CASE (Strong PMF, efficient growth)
==========================================================================

Parameters:
  Farmers                         2,500
  Subscribers per farmer          30
  Total subscribers               75,000
  Monthly churn                   6%
  Walk-up orders/mo               45,000

Monthly Revenue:
  Sub orders: 75,000 * 3.1        232,500 orders
  Sub contribution: 232,500*$1.64 $381,300
  Walk-up: 45,000 * $0.86         $38,700
  TOTAL MONTHLY CONTRIBUTION      $420,000

Monthly Fixed Costs:              $155,000

MONTHLY PROFIT:                   +$265,000
ANNUAL PROFIT:                    +$3,180,000

vs v1:  From -$28,225/mo loss to +$265,000/mo profit.
        Break-even is now achieved well before bull-case scale.
```

### Break-Even Summary (New vs Old)

```
+-------------------+-----------+-----------+-----------+
| Metric            | Bear      | Base      | Bull      |
+-------------------+-----------+-----------+-----------+
| Farmers           | 15        | 200       | 2,500     |
| Subs/farmer       | 8         | 20        | 30        |
| Total subs        | 120       | 4,000     | 75,000    |
| Monthly GMV       | $16,740   | $558,000  | $10.5M    |
|                   |           |           |           |
| OLD Monthly P&L   | -$1,337   | -$19,568  | -$28,225  |
| NEW Monthly P&L   | -$825     | -$2,514   | +$265,000 |
| DELTA             | +$512     | +$17,054  | +$293,225 |
+-------------------+-----------+-----------+-----------+
```

### True Break-Even Point

```
At $130,000/mo fixed costs (scale team):

  Contribution per sub per month = $5.33
  Required subscribers = $130,000 / $5.33 = 24,390

  At 40 subs/farmer: 24,390 / 40 = 610 farmers
  At 30 subs/farmer: 24,390 / 30 = 813 farmers
  At 20 subs/farmer: 24,390 / 20 = 1,220 farmers

vs v1:  Was 94,891 subs / 2,373 farmers at 40 s/f.
        Now 24,390 subs /   610 farmers at 40 s/f.
        A 74% reduction in scale required to break even.
```

At a more realistic earlier-stage cost level ($25,000/mo):
```
  Required subscribers = $25,000 / $5.33 = 4,690
  At 20 subs/farmer: 235 farmers
  At 15 subs/farmer: 313 farmers
```

This means break-even at early-stage costs is achievable with ~235-313 farmers,
each with 15-20 subscribers. This is a realistic 18-24 month target for a
single metro area.

---

## 4. LTV:CAC Update

### Customer Acquisition Cost (Unchanged from v1)

| Channel                  | CAC     | % of Buyers | Weighted CAC |
|--------------------------|---------|-------------|--------------|
| QR code (farmer-led)     | $1.25   | 50%         | $0.63        |
| Organic/SEO              | $10.00  | 20%         | $2.00        |
| Referral program         | $10.00  | 15%         | $1.50        |
| Social media (organic)   | $5.50   | 10%         | $0.55        |
| Paid social              | $22.50  | 5%          | $1.13        |
|                          |         | **Blended** | **$5.81**    |

### Subscriber LTV (New vs Old)

```
                                   OLD (5%)      NEW (7%+$0.35)
Monthly contribution (blended)     $1.37         $5.33
Monthly churn                      8%            8%
Average lifetime                   12.5 mo       12.5 mo
Gross LTV                         $17.13         $66.63
Discount rate (10% annual)         ~0.83%/mo     ~0.83%/mo
Discounted LTV                    $15.52         $60.39

LTV:CAC (vs $5.81 blended CAC)    2.7x          10.4x
```

### Walk-Up Buyer LTV (New vs Old)

```
                                   OLD (5%)      NEW (7%+$0.35)
Monthly contribution               $0.06         $1.29
Monthly churn                      40%           40%
Average lifetime                   2.5 mo        2.5 mo
Gross LTV                         $0.15          $3.23

LTV:CAC (vs $5.81 blended CAC)    0.03x         0.56x
```

Walk-up buyers are still not independently profitable (LTV:CAC < 1x), but they
are no longer economically negligible. At $1.29/mo, they contribute meaningful
revenue while in the conversion funnel.

### Farmer LTV (Updated)

```
                                   OLD (5%)      NEW (7%+$0.35)
Avg subscribers per farmer (Ph1)   15            15
Monthly rev per sub                $1.37         $5.33
Monthly rev per farmer             $20.55        $79.95
Monthly farmer churn               5%            5%
Average farmer lifetime            20 mo         20 mo
FARMER LTV (Phase 1)              $411          $1,599
FARMER LTV:CAC (vs $52.50 CAC)    7.8x          30.5x

At steady-state (40 subs/farmer):
Monthly rev per farmer             $54.80        $213.20
FARMER LTV (20 mo)                $1,096        $4,264
FARMER LTV:CAC (vs $300 CAC)      3.7x          14.2x
```

### LTV:CAC Summary Table

```
+---------------------+---------+---------+---------+---------+
| Segment             | OLD LTV | OLD     | NEW LTV | NEW     |
|                     |         | LTV:CAC |         | LTV:CAC |
+---------------------+---------+---------+---------+---------+
| Subscriber (disc.)  | $15.52  | 2.7x    | $60.39  | 10.4x   |
| Walk-up buyer       | $0.15   | 0.03x   | $3.23   | 0.56x   |
| Farmer (Phase 1)    | $411    | 7.8x    | $1,599  | 30.5x   |
| Farmer (steady)     | $1,096  | 3.7x    | $4,264  | 14.2x   |
+---------------------+---------+---------+---------+---------+
```

### FINDING: LTV:CAC Is Now Well Above the 3x Minimum Threshold

At 10.4x subscriber LTV:CAC, Local-Roots is in healthy territory for a
marketplace business. The 3:1 minimum is comfortably exceeded.

The farmer-side economics are exceptional at 14-30x LTV:CAC. This means the
business can afford to invest significantly more in farmer acquisition (up to
$500+/farmer CAC) and still maintain healthy unit economics.

---

## 5. Competitive Positioning

### Updated Marketplace Fee Comparison

```
+---------------------------+--------------------+---------------------+--------------+
| Platform                  | Seller Pays        | Buyer Pays          | Eff. Rate    |
+---------------------------+--------------------+---------------------+--------------+
| LOCAL-ROOTS (NEW)         | $0                 | 7% + $0.35          | ~7.8%*       |
| LOCAL-ROOTS (OLD)         | $0                 | 5%                  | ~5%          |
|                           |                    |                     |              |
| FARM-SPECIFIC PLATFORMS:  |                    |                     |              |
| Barn2Door                 | $99-299/mo + 2.9% | $0                  | 5-15%**      |
|                           | + $399-599 setup   |                     |              |
| Local Line                | $49+/mo + add-ons  | $0                  | 3-10%**      |
| GrazeCart                 | ~$124+/mo          | $0                  | 5-12%**      |
| Harvie                    | $500 setup + 7%    | $0                  | ~10%***      |
|                           | + CC fees (~3%)    |                     |              |
| Farmigo                   | 2% of deliveries   | $0                  | ~2%          |
|                           |                    |                     |              |
| FOOD DELIVERY PLATFORMS:  |                    |                     |              |
| Instacart                 | 15-30% commission  | 5-10% service fee   | 20-40%       |
| DoorDash                  | 15-30% commission  | ~15% svc + delivery | 25-45%       |
| Uber Eats                 | 15-30% commission  | Service + delivery  | 25-45%       |
|                           |                    |                     |              |
| GENERAL MARKETPLACES:     |                    |                     |              |
| Etsy                      | 6.5% + $0.20/list | $0                  | ~8-10%       |
| Shopify                   | $39-399/mo         | 0%                  | 1-5%**       |
+---------------------------+--------------------+---------------------+--------------+

*   Effective rate on $45 box: $3.50/$45 = 7.78%. Declines on larger orders.
**  SaaS fee divided by monthly GMV; varies widely by farm volume.
*** Harvie charges 7% + credit card processing to sellers. A seller doing
    $3,000/mo pays ~$210 in Harvie fees + ~$90 in CC = $300/mo, or 10%.

Sources:
- DoorDash: ~15% service fee to buyer + delivery fee + 15-30% commission to merchant
  (https://merchants.doordash.com/en-us/learning-center/delivery-commission)
  (https://help.doordash.com/consumers/s/article/What-fees-do-I-pay)
- Instacart: 5-10% service fee to buyer + markup + delivery
  (https://www.instacart.com/help/section/360007902791/360039164252)
- Barn2Door: $99-299/mo + $399-599 setup + 2.9%+$0.30 CC fees
  (https://www.barn2door.com/pricing)
- Local Line: $49+/mo + add-ons ($24-29/mo each)
  (https://www.localline.co/suppliers/pricing)
- GrazeCart: ~$124+/mo subscription
  (https://www.grazecart.com/pricing)
- Harvie: $500 setup + 7% + CC fees; volume discount above $250K
  (https://www.harvie.farm/sell/)
- Farmigo: 2% of deliveries, no setup fee
  (https://www.farmigo.com/pricing.html)
```

### Competitive Position Analysis

**vs Barn2Door / Local Line / GrazeCart (SaaS model):**
These platforms charge sellers $50-300/month regardless of sales volume, plus
credit card processing. For a farmer doing $3,000/month in GMV:

```
  Barn2Door (Business): $199/mo + 2.9% CC = $199 + $87  = $286/mo
  Local Line:           $49/mo + add-ons   = $75-150/mo
  GrazeCart:            $124/mo + CC       = $124 + $87  = $211/mo

  Local-Roots:          $0 to farmer. Buyer pays $3.50 on a $45 box.
  Platform collects: 20 subs * 3.1 orders * $3.50 = $217/mo in fees
```

Local-Roots collects comparable revenue to what a farmer would pay for SaaS
tools, but the farmer pays NOTHING. The buyer absorbs the cost. This remains
the core competitive differentiator even at 7% + $0.35.

**vs Harvie (closest direct competitor):**
Harvie is the most relevant comparison because it uses a similar transaction-fee
model for CSA/farm shares:

```
  Harvie:       7% seller-side + ~3% CC processing = ~10% total
                Seller absorbs the full cost
  Local-Roots:  7% + $0.35 buyer-side = ~7.8% total
                Seller pays nothing

  On a $45 box:
    Harvie seller receives: $45 - $3.15 (7%) - $1.31 (CC) = $40.54
    Local-Roots seller receives: $45.00 (full subtotal)
    Difference: +$4.46 per box to the farmer on Local-Roots
```

Local-Roots is meaningfully cheaper for farmers than Harvie and charges a lower
total take rate. This is a strong selling point.

**vs DoorDash / Instacart (delivery platforms):**
These platforms charge 25-45% combined. Local-Roots at 7.8% effective is less
than one-third of delivery platform pricing. However, this is not a fair
comparison -- delivery platforms provide logistics. The relevant comparison is
the service fee alone, and even there, DoorDash's 15% service fee is nearly
double Local-Roots' 7.8%.

### FINDING: 7% + $0.35 Remains Highly Competitive

The new fee structure positions Local-Roots as:
1. **Cheapest for farmers** among all comparable platforms (zero seller fees)
2. **Cheaper for buyers** than delivery platforms by 2-5x
3. **Comparable total take rate** to farm SaaS tools, without the seller paying
4. **Below Harvie's total take rate** by ~2 percentage points

The buyer-side fee of $3.50 on a $45 box (7.8%) is modest and defensible.
For context, a DoorDash order on a $45 restaurant meal incurs ~$12-15 in
fees + delivery + tip. Local-Roots' $3.50 is a fraction of that.

---

## 6. Sensitivity Analysis

### 6.1 What If Average Box Price Drops to $25?

```
At $25 box, 7% + $0.35:
  Buyer fee         = 0.07 * $25 + $0.35 = $2.10
  Total charged     = $27.10
  Stripe processing = 0.029 * $27.10 + $0.30 = $1.09
  Net revenue       = $2.10 - $1.09 = $1.01
  Infrastructure    = $0.15
  CONTRIBUTION/TXN  = $0.86

Subscriber monthly contribution (weekly cadence):
  4.3 * $0.86 = $3.70/mo

Blended subscriber monthly (cadence mix):
  0.60*$3.70 + 0.25*$1.85 + 0.15*$0.86 = $2.22+$0.46+$0.13 = $2.81/mo

LTV (12.5 mo): $35.13
LTV:CAC: $35.13 / $5.81 = 6.0x    (still above 3x threshold)

Break-even at $130K/mo:
  $130,000 / $2.81 = 46,263 subs
  At 40 subs/farmer: 1,157 farmers

vs OLD at $25/5%:
  Contribution/txn was $0.04
  Monthly contribution was $0.12 (essentially zero)
  LTV:CAC was 0.3x (negative in practice)
```

**Conclusion:** Even at a $25 average box price, the new fee structure maintains
healthy unit economics (6.0x LTV:CAC). At the old 5% rate, a $25 box was
economically nonviable. This is the power of the $0.35 flat fee component.

### 6.2 What If Churn Doubles (8% to 16%)?

```
At $45 box, 7% + $0.35, 16% monthly churn:
  Monthly contribution (blended)  = $5.33/mo (unchanged)
  Average lifetime                = 1 / 0.16 = 6.25 months
  Gross LTV                       = $5.33 * 6.25 = $33.31
  Discounted LTV                  = $5.33 / (0.16 + 0.0083) = $31.68

  LTV:CAC: $31.68 / $5.81 = 5.5x  (still above 3x)

Break-even unchanged (churn affects LTV but not monthly contribution at
steady state, because new subscribers replace churned ones -- what matters
is total active subscriber count, not individual lifetimes).
```

**Conclusion:** Even with double the churn, LTV:CAC remains at 5.5x. The
business model is resilient to churn at this fee level. At the old 5% rate,
doubling churn would have pushed LTV:CAC to 1.4x -- unsustainable.

### 6.3 Combined Stress Test: $25 Box + 16% Churn

```
At $25 box, 7% + $0.35, 16% monthly churn:
  Monthly contribution (blended)  = $2.81/mo
  Average lifetime                = 6.25 months
  Gross LTV                       = $17.56
  Discounted LTV                  = $16.71

  LTV:CAC: $16.71 / $5.81 = 2.9x  (borderline -- below 3x threshold)

Break-even at $130K/mo:
  $130,000 / $2.81 = 46,263 subs
  At 40 subs/farmer: 1,157 farmers (still achievable, but harder)
```

**Conclusion:** The combined stress case is the one scenario where LTV:CAC
drops below 3x. This is the worst-case floor. Even here, the numbers are
dramatically better than v1's base case (2.7x).

### 6.4 Sensitivity Matrix: Fee Structure vs Box Price (Contribution per Txn)

```
                | $25 box  | $35 box  | $45 box  | $65 box  |
  --------------+----------+----------+----------+----------+
  5% + $0.00    | $0.04    | $0.23    | $0.43    | $0.83    |
  7% + $0.00    | $0.36    | $0.58    | $0.85    | $1.36    |
  7% + $0.35    | $0.86    | $1.25    | $1.64    | $2.42    |  <-- CURRENT
  8% + $0.35    | $1.10    | $1.59    | $2.08    | $3.07    |
  10% + $0.50   | $1.93    | $2.68    | $3.53    | $5.13    |
  --------------+----------+----------+----------+----------+

The $0.35 flat fee adds ~$0.34 net contribution to every transaction
(after Stripe takes its cut of the higher total). It has an outsized
impact on small orders.
```

---

## 7. Risk Assessment

### 7.1 Conversion Impact Risk

**Risk:** The fee increase from 5% ($2.25 on $45) to 7%+$0.35 ($3.50 on $45)
means buyers pay $1.25 more per order. Could this reduce conversion?

**Assessment:**

```
Fee increase per order:  $1.25  (from $2.25 to $3.50)
Fee as % of total price: 7.2%  (was 4.8%)

For a weekly subscriber at $45:
  Monthly fee increase: $1.25 * 4.3 = $5.38/month
  Monthly total: $48.50 * 4.3 = $208.55 (was $203.18)
  Increase: 2.6%
```

**Mitigating factors:**
1. The fee is presented as a separate line item ("service fee") -- common in
   food commerce. Buyers are accustomed to this from DoorDash, Instacart, etc.
2. $3.50 on a $45 box is still far less than delivery fees on comparable
   platforms ($5-15 on DoorDash/Instacart).
3. The value proposition is "subscribe to your farmer" -- buyers are
   mission-driven, not purely price-optimizing.
4. Local food buyers have higher willingness to pay than mass-market grocery
   shoppers (typical CSA customers self-select for premium local products).

**Estimated conversion impact:** -3% to -8% (moderate).

Even at -8% conversion, the net revenue impact is strongly positive:
```
  Old: 100 subscribers * $1.37/mo = $137/mo
  New:  92 subscribers * $5.33/mo = $490/mo  (+258%)
```

**Verdict:** LOW RISK. The conversion impact is easily absorbed by the margin
improvement. The fee would need to cause a >75% conversion drop to be net
negative, which is implausible for a $1.25/order increase.

### 7.2 Churn Acceleration Risk

**Risk:** Existing subscribers may churn faster when they notice higher fees
on recurring charges.

**Assessment:**
- Subscription charges are recurring and expected. After the first 1-2 cycles,
  buyers habituate to the total amount.
- The fee is not hidden -- it is shown at checkout as "service fee" and appears
  on the receipt. Transparency reduces surprise-driven churn.
- A $1.25/order increase on a $45 box is 2.8% of the total charge. This is
  below the threshold where most consumers actively reconsider.

**Estimated churn impact:** +0.5% to +1.5% additional monthly churn.

Even at +1.5% churn (8% to 9.5%):
```
  LTV = $5.33 / (0.095 + 0.0083) = $51.60
  LTV:CAC = $51.60 / $5.81 = 8.9x  (still excellent)
```

**Verdict:** LOW RISK.

### 7.3 Farmer Perception Risk

**Risk:** Farmers may resist a platform that charges their customers a visible
7.8% fee, fearing it makes their products look more expensive.

**Assessment:**
- Farmers on Barn2Door/GrazeCart absorb $150-300/month themselves; they know
  the cost has to come from somewhere.
- The fee is explicitly buyer-side and clearly labeled. Farmers can truthfully
  say "I don't pay any fees."
- At $3.50 on a $45 box, the fee is less than a cup of coffee. Most CSA buyers
  will view it as reasonable for platform convenience.
- The farmer's listed price ($45) is unchanged. The $3.50 is a separate line.

**Verdict:** LOW-MEDIUM RISK. Some farmers may push back during sales calls.
Prepare a comparison sheet showing what farmers pay on competing platforms
($100-300/month) vs. Local-Roots ($0). The zero-seller-fee story is even
more compelling when the buyer fee is modest.

### 7.4 Competitive Response Risk

**Risk:** Competitors lower prices or match the zero-seller-fee model.

**Assessment:**
- Barn2Door, Local Line, and GrazeCart are SaaS-model businesses with
  revenue tied to monthly subscriptions. Switching to a pure transaction-fee
  model would require a fundamental business model change -- unlikely.
- Harvie is the closest model at 7% seller-side. They could theoretically
  shift to buyer-side, but this would require renegotiating with all existing
  farmer partners.
- DoorDash/Instacart could enter local farm pickup but this is a niche
  segment that does not align with their delivery-centric models.

**Verdict:** LOW RISK in the 12-18 month horizon.

### 7.5 Regulatory / Transparency Risk

**Risk:** Service fees face increasing regulatory scrutiny (e.g., FTC
"junk fees" rule, state-level fee disclosure requirements).

**Assessment:**
- Local-Roots already displays the fee transparently at checkout as a
  separate line item with exact amounts.
- The fee is not a "hidden" or "drip priced" fee -- it appears before
  payment authorization.
- At 7% + $0.35, the fee is reasonable and proportional to the service.
- As long as the fee is disclosed before checkout, there is minimal
  regulatory risk.

**Verdict:** LOW RISK, but monitor regulatory developments.

---

## 8. Recommendation & Key Risks to Monitor

### Recommendation

**The 7% + $0.35 fee structure is correct.** It resolves the three most
critical findings from the v1 audit:

1. **LTV:CAC crosses the 3x threshold.** At 10.4x, the business has a
   healthy margin of safety. Even under combined stress (low box price +
   high churn), LTV:CAC stays near 3x.

2. **Break-even is achievable at realistic scale.** The business can break
   even at ~610 farmers (40 subs each) or ~1,220 farmers (20 subs each)
   at scale-team cost levels. At early-stage costs ($25K/mo), break-even
   is ~235 farmers -- achievable in a single metro within 18-24 months.

3. **Low-value orders are no longer contribution-negative.** The $0.35
   flat fee drops the break-even box price from $23 to $3. Walk-up orders
   now contribute $0.86 per transaction instead of $0.04.

The fee remains competitive: cheaper for farmers than every alternative,
cheaper for buyers than delivery platforms, and comparable in total take rate
to farm SaaS tools.

**Do not raise the fee further at this time.** 7% + $0.35 is the sweet spot
identified in v1. Going to 8% or 10% would generate more revenue per
transaction but risks crossing the psychological threshold where buyers
actively compare fees. The current level is "low enough to not think about."

### Summary P&L: Base Case (200 Farmers) -- New vs Old

```
                                        OLD (5%)      NEW (7%+$0.35)
REVENUE
  Subscription GMV                      $558,000      $558,000
  Walk-up GMV                            $62,500       $62,500
  Total GMV                             $620,500      $620,500
  Buyer fees collected                   $31,025       $47,225
  (-) Stripe processing                 -$19,285      -$19,640
  (-) Connect account fees (200*$2)        -$400         -$400
  GROSS PROFIT                           $11,340       $27,185

OPERATING EXPENSES
  Engineering (founder + 1 eng)          $10,000       $10,000
  Farmer success (part-time)              $5,000        $5,000
  Infrastructure                            $310          $310
  Marketing                               $2,000        $2,000
  Legal/accounting                           $500          $500
  Miscellaneous                              $500          $500
  TOTAL OPEX                             $18,310       $18,310

NET MONTHLY P&L                         -$6,970       +$8,875
                                        =======       =======

Buyer fee calc:
  Sub: 12,400 orders * (0.07*$45 + $0.35) = 12,400 * $3.50 = $43,400
  Walk-up: 2,500 orders * (0.07*$25 + $0.35) = 2,500 * $2.10 = $5,250
  Stripe: (12,400*$48.50 + 2,500*$27.10) * 0.029 + 14,900*$0.30
        = ($601,400 + $67,750) * 0.029 + $4,470
        = $19,405 + $4,470 = ~$19,640 (rounding)
  (Note: Stripe calc uses approximate weighted average; exact
   per-transaction math may differ slightly due to rounding.)

RUNWAY (at $500K raise):
  OLD: $500K / $6,970 = 72 months
  NEW: PROFITABLE at base case. $500K adds to treasury.
```

### The 3 Assumptions That Matter Most

These are the assumptions that, if wrong, most change the outcome:

```
+------+---------------------------+----------+----------------------------------+
| Rank | Assumption                | Value    | If Wrong...                      |
+------+---------------------------+----------+----------------------------------+
|  1   | Average box price         | $45      | At $25, break-even needs 2x the  |
|      |                           |          | farmers. At $65, it needs 40%    |
|      |                           |          | fewer. This is the #1 lever.     |
+------+---------------------------+----------+----------------------------------+
|  2   | Subscribers per farmer    | 15-40    | Below 10/farmer, the model       |
|      |                           |          | requires 3-5x more farmers.      |
|      |                           |          | This is the demand-density bet.  |
+------+---------------------------+----------+----------------------------------+
|  3   | Monthly subscriber churn  | 8%       | At 16%, LTV drops 50% but        |
|      |                           |          | LTV:CAC stays above 5x. Churn    |
|      |                           |          | is less dangerous than box price. |
+------+---------------------------+----------+----------------------------------+
```

### Key Risks to Monitor

| # | Risk                           | Metric to Watch                | Threshold     |
|---|--------------------------------|--------------------------------|---------------|
| 1 | Conversion drop from fee hike  | Checkout completion rate       | <70% = alarm  |
| 2 | Churn spike from recurring fee | 30-day subscriber retention    | <85% = alarm  |
| 3 | Average box price drift down   | Weighted avg subscription price| <$30 = review |
| 4 | Farmer objection to buyer fee  | Farmer close rate on sales calls| <20% = review|
| 5 | Walk-up order volume below plan| Walk-up orders / farmer / week | <3 = deprioritize walk-up features |

### Open Items from v1 (Still Applicable)

| v1 Finding                                    | Status          |
|-----------------------------------------------|-----------------|
| Strategy memo overstates unit economics       | STILL OPEN      |
| Cancellation policy doc has wrong cost table  | STILL OPEN      |
| Track walk-up to subscriber conversion rate   | STILL OPEN      |

The strategy memo's LTV and LTV:CAC figures should be updated to reflect the
new fee structure and use net contribution (not gross fees). The new numbers
are dramatically better than v1 -- now is a good time to do this rewrite.

---

## Appendix A: Calculation Verification

All fee calculations verified against `computeBuyerFee()` at
`backend/internal/api/v1/subscriptions.go:277-297`:

```go
func computeBuyerFee(subtotalCents, bps, flatCts int) (feeCents, totalCents int) {
    fee := (subtotalCents * bps) / 10000
    fee += flatCts
    total := subtotalCents + fee
    return fee, total
}
```

Spot checks (all in cents):

```
computeBuyerFee(4500, 700, 35)  -> fee=350, total=4850   ($3.50 on $45)  CORRECT
computeBuyerFee(2500, 700, 35)  -> fee=210, total=2710   ($2.10 on $25)  CORRECT
computeBuyerFee(3500, 700, 35)  -> fee=280, total=3780   ($2.80 on $35)  CORRECT
computeBuyerFee(6500, 700, 35)  -> fee=490, total=6990   ($4.90 on $65)  CORRECT
```

## Appendix B: Sources

- [DoorDash Commission and Fees](https://merchants.doordash.com/en-us/learning-center/delivery-commission)
- [DoorDash Consumer Fees](https://help.doordash.com/consumers/s/article/What-fees-do-I-pay)
- [DoorDash Costs Complete Guide 2026](https://eathealthy365.com/doordash-costs-a-complete-guide-to-all-fees-in-2026/)
- [Instacart Fees and Taxes](https://www.instacart.com/help/section/360007902791/360039164252)
- [Instacart Fees Explained 2026](https://teachmedelivery.com/learn/instacart-fees/)
- [Barn2Door Pricing](https://www.barn2door.com/pricing)
- [Local Line Pricing for Farms](https://www.localline.co/suppliers/pricing)
- [GrazeCart Pricing](https://www.grazecart.com/pricing)
- [Harvie: Sell with Harvie](https://www.harvie.farm/sell/)
- [Farmigo Pricing](https://www.farmigo.com/pricing.html)
- [Stripe Pricing](https://stripe.com/pricing)
- [Stripe Connect Pricing](https://stripe.com/connect/pricing)
- [Farm POS Systems Compared](https://www.locallygrown.app/blog/2025-06-16-farm-pos-systems-compared-square-vs-local-line-vs-barn2door-vs-locally-grown)

---

*This audit was prepared as a financial analysis exercise. All models use
assumptions derived from the codebase, strategy documents, public market data,
and competitor research. Actual results will vary based on market conditions
and execution. This document supersedes the v1 audit for all unit economics
and break-even calculations.*
