# CFO Financial & Unit Economics Audit

**Date:** February 27, 2026
**Scope:** Complete financial model of Local-Roots marketplace
**Status:** READ-ONLY audit -- no code modifications

---

## Table of Contents

1. [Fee Structure (Code Audit)](#1-fee-structure-code-audit)
2. [Money Flow Analysis](#2-money-flow-analysis)
3. [Unit Economics Model](#3-unit-economics-model)
4. [Break-Even Analysis (3 Scenarios)](#4-break-even-analysis)
5. [Pricing Sensitivity](#5-pricing-sensitivity)
6. [Infrastructure Cost Model](#6-infrastructure-cost-model)
7. [Market Benchmarks](#7-market-benchmarks)
8. [Key Findings & Recommendations](#8-key-findings--recommendations)

---

## 1. Fee Structure (Code Audit)

### Current Configuration

The fee structure is controlled by two environment variables with **defaults of zero**:

| Variable              | Default | Description                        | Source File                          |
|-----------------------|---------|------------------------------------|--------------------------------------|
| `BUYER_FEE_BPS`       | `0`     | Buyer service fee in basis points  | `backend/internal/config/config.go:55` |
| `BUYER_FEE_FLAT_CENTS` | `0`    | Buyer flat fee in cents            | `backend/internal/config/config.go:61` |

### Fee Calculation Formula

All transaction types use the same `computeBuyerFee()` function
(`backend/internal/api/v1/subscriptions.go:277-297`):

```
buyerFee = (subtotalCents * BuyerFeeBps) / 10000 + BuyerFeeFlatCents
totalCents = subtotalCents + buyerFee
```

This formula is applied consistently across:
- Subscription checkout (`SubscriptionAPI.Checkout`)
- Subscription PI validation (`SubscriptionAPI.Subscribe`)
- One-time order checkout (`OrderCheckoutAPI.Checkout`)
- One-time order creation (`OrdersAPI.CreateOrder`)
- Recurring cycle generation (`SellerSubscriptionAPI.GenerateNextCycle`)

Consistency is verified by `fee_consistency_test.go`.

### CRITICAL FINDING: Fees Are Not Yet Configured in Production

The code defaults `BUYER_FEE_BPS` and `BUYER_FEE_FLAT_CENTS` to **zero**. The strategy
documents reference a 5% buyer service fee, but this requires explicitly setting
`BUYER_FEE_BPS=500` in the production environment. Without this, **no platform revenue
is being collected**.

**Action required:** Confirm that `BUYER_FEE_BPS=500` is set in the Railway production
environment. If it is not, every transaction processed to date has generated zero
platform revenue.

### No-Show Fee Configuration

| Variable                    | Default | Current Policy       |
|-----------------------------|---------|---------------------|
| `NO_SHOW_FEE_CENTS`         | `500`   | Set to `0` in prod  |
| `NO_SHOW_PLATFORM_SPLIT_BPS`| `3000`  | 30% platform share  |

The no-show fee is intentionally disabled (`NO_SHOW_FEE_CENTS=0`). When a buyer
no-shows, the full box price is still captured (buyer forfeits the box), and the
seller receives full payout. No additional penalty is assessed.

---

## 2. Money Flow Analysis

### Per-Transaction Money Flow (Assuming 5% Buyer Fee)

For a $40.00 subscription box:

```
BUYER PAYS:
  Box price (subtotal)                    $40.00
  + Service fee (5% of $40.00)            $ 2.00
  ----------------------------------------
  Total charged to card                   $42.00

STRIPE CAPTURES:
  Total authorization                     $42.00
  - Stripe processing (2.9% + $0.30)     -$ 1.52   [2.9% of $42.00 + $0.30]
  ----------------------------------------
  Net settled to Local-Roots               $40.48

LOCAL-ROOTS TRANSFERS TO SELLER:
  Seller payout = subtotal_cents           $40.00

LOCAL-ROOTS RETAINS:
  Net settled - seller transfer            $ 0.48
  This equals: buyer_fee - Stripe fees     $ 2.00 - $1.52 = $0.48
```

### Key Code References

- **Capture on pickup:** `pickup_confirm.go:299` -- `captured_cents = total_cents`
- **Seller transfer amount:** `seller_orders.go:507` -- `transferToSeller(..., subtotalCents, ...)`
  - Comment at line 506: "Seller gets subtotal_cents; buyer_fee_cents stays on the platform."
- **Stripe Connect transfer:** `stripepay.go:374-398` -- separate `CreateTransfer()` call
  with the seller's Connected Account ID

### Stripe Connect Cost Layer

Beyond standard processing fees, Stripe Connect Express adds:

| Fee Component                 | Amount                |
|-------------------------------|-----------------------|
| Active account fee            | $2.00/month/account   |
| Payout fee                    | 0.25% + $0.25/payout  |

For a seller receiving a $40 transfer, the payout fee is $0.35 (0.25% of $40 + $0.25).
**This is deducted from the seller's bank deposit by Stripe, not from the platform.**

### Who Pays What

| Cost                          | Paid by   | Amount (on $40 box)  |
|-------------------------------|-----------|---------------------|
| Box price                     | Buyer     | $40.00              |
| 5% service fee                | Buyer     | $2.00               |
| Stripe processing (2.9%+$0.30)| Platform  | $1.52               |
| Connect account fee ($2/mo)   | Platform  | ~$0.05/txn amortized|
| Connect payout fee            | Seller    | $0.35               |

**Important note from cancellation-policy.md line 66:** The doc states "Stripe
processing (~2.9% + $0.30)" is "Deducted from payout" under the seller column. However,
the actual code transfers the full `subtotalCents` to the seller. Stripe's processing
fee is deducted from the gross `total_cents` settlement before the platform ever sees
the funds. The platform absorbs the processing fee from the buyer fee revenue. The
cancellation policy doc appears to have an error in its cost allocation table -- the
seller does NOT pay Stripe processing on the box price. They only pay the Connect
payout fee on the transfer.

---

## 3. Unit Economics Model

### Assumptions

| Parameter                    | Value     | Source / Rationale               |
|------------------------------|-----------|----------------------------------|
| Average box price (sub)      | $45.00    | CEO strategy memo                |
| Average walk-up order        | $25.00    | Smaller basket, walk-up items    |
| Buyer service fee            | 5% (500 bps) | Strategy docs                 |
| Stripe processing            | 2.9% + $0.30 | Standard Stripe rate          |
| Connect account fee          | $2/mo/account | Stripe Connect Express       |
| Connect payout fee           | 0.25% + $0.25 | Stripe Connect Express       |
| Sub cadence mix              | 60% weekly, 25% biweekly, 15% monthly |                    |
| Weighted avg orders/mo/sub   | 3.1       | (0.6*4.3 + 0.25*2.15 + 0.15*1) |
| Subscriber monthly churn     | 8%        | Target from GTM strategy         |
| Walk-up buyer monthly churn  | 40%       | High churn, low loyalty          |
| Infrastructure cost/txn      | $0.15     | CEO memo estimate                |

### 3.1 Revenue Per Transaction

```
SUBSCRIPTION ORDER ($45 box):
  Subtotal                         $45.00
  Buyer fee (5%)                   $ 2.25
  Total charged                    $47.25
  Stripe processing (2.9%+$0.30)  -$ 1.67
  Net platform revenue             $ 0.58
  Infrastructure cost              -$ 0.15
  CONTRIBUTION PER TXN             $ 0.43

ONE-TIME ORDER ($25 walk-up):
  Subtotal                         $25.00
  Buyer fee (5%)                   $ 1.25
  Total charged                    $26.25
  Stripe processing (2.9%+$0.30)  -$ 1.06
  Net platform revenue             $ 0.19
  Infrastructure cost              -$ 0.15
  CONTRIBUTION PER TXN             $ 0.04
```

### 3.2 Platform Revenue Margin by Order Value

```
+-------------+-----------+--------+--------+---------+---------+--------+
| Box Price   | Fee (5%)  | Stripe | Net Rev| Infra   | Contrib | Margin |
+-------------+-----------+--------+--------+---------+---------+--------+
| $20.00      | $1.00     | $0.91  | $0.09  | $0.15   | -$0.06  | -6.0%  |
| $25.00      | $1.25     | $1.06  | $0.19  | $0.15   | $0.04   |  3.2%  |
| $30.00      | $1.50     | $1.21  | $0.29  | $0.15   | $0.14   |  8.9%  |
| $35.00      | $1.75     | $1.37  | $0.38  | $0.15   | $0.23   | 12.3%  |
| $40.00      | $2.00     | $1.52  | $0.48  | $0.15   | $0.33   | 15.0%  |
| $45.00      | $2.25     | $1.67  | $0.58  | $0.15   | $0.43   | 17.1%  |
| $50.00      | $2.50     | $1.82  | $0.68  | $0.15   | $0.53   | 18.9%  |
| $60.00      | $3.00     | $2.12  | $0.88  | $0.15   | $0.73   | 20.8%  |
| $80.00      | $4.00     | $2.72  | $1.28  | $0.15   | $1.13   | 23.4%  |
+-------------+-----------+--------+--------+---------+---------+--------+

BREAKEVEN BOX PRICE (where contribution = 0):
  0.05x - (0.029*(1.05x) + 0.30) - 0.15 = 0
  0.05x - 0.03045x - 0.30 - 0.15 = 0
  0.01955x = 0.45
  x = $23.02

Orders below ~$23 are contribution-negative at 5% take rate.
```

### 3.3 Contribution Margin Per Buyer Per Month

**Subscriber (weekly, $45 box):**
```
  Orders per month                   4.3
  Contribution per order             $0.43
  MONTHLY CONTRIBUTION               $1.85

  Connect account fee (amortized)    ~$0.05  [per sub, across all farmer subs]
  NET MONTHLY CONTRIBUTION           $1.80
```

**Subscriber (biweekly, $45 box):**
```
  Orders per month                   2.15
  Contribution per order             $0.43
  MONTHLY CONTRIBUTION               $0.92
```

**Subscriber (monthly, $45 box):**
```
  Orders per month                   1.0
  Contribution per order             $0.43
  MONTHLY CONTRIBUTION               $0.43
```

**Walk-up buyer (one-time $25, 1.5 orders/mo average):**
```
  Orders per month                   1.5
  Contribution per order             $0.04
  MONTHLY CONTRIBUTION               $0.06
```

**Blended subscriber (weighted by cadence mix):**
```
  0.60 * $1.80 + 0.25 * $0.92 + 0.15 * $0.43 = $1.08 + $0.23 + $0.06 = $1.37/mo
```

### 3.4 Customer Acquisition Cost (CAC)

| Channel                  | CAC     | % of Buyers | Weighted CAC |
|--------------------------|---------|-------------|--------------|
| QR code (farmer-led)     | $1.25   | 50%         | $0.63        |
| Organic/SEO              | $10.00  | 20%         | $2.00        |
| Referral program         | $10.00  | 15%         | $1.50        |
| Social media (organic)   | $5.50   | 10%         | $0.55        |
| Paid social              | $22.50  | 5%          | $1.13        |
|                          |         | **Blended** | **$5.81**    |

Farmer CAC is separately modeled:
| Channel                   | CAC      | % of Farmers | Weighted CAC |
|---------------------------|----------|-------------|--------------|
| Founder direct outreach   | $75.00   | 60%         | $45.00       |
| Farmer referral           | $15.00   | 25%         | $3.75        |
| Ag extension / events     | $25.00   | 15%         | $3.75        |
|                           |          | **Blended** | **$52.50**   |

Note: CEO memo estimates $300-500 farmer CAC at scale with a dedicated field sales
team. At founding stage with the CEO doing direct outreach, effective CAC is lower
(time cost only), estimated here at $75/farmer (time value).

### 3.5 Lifetime Value (LTV)

**Subscriber LTV:**
```
  Monthly contribution         $1.37
  Monthly churn                8%
  Average lifetime             1 / 0.08 = 12.5 months
  Gross LTV                    $1.37 * 12.5 = $17.13
  Discount rate (10% annual)   ~0.83% monthly
  Discounted LTV               $1.37 * (1 / (0.08 + 0.0083)) = $1.37 / 0.0883
  DISCOUNTED LTV               $15.52
```

**Walk-up buyer LTV:**
```
  Monthly contribution         $0.06
  Monthly churn                40%
  Average lifetime             1 / 0.40 = 2.5 months
  GROSS LTV                    $0.15
```

Walk-up buyers generate negligible LTV as standalone users. Their value is in
**conversion to subscribers** (strategy targets 15%+ conversion rate).

**Farmer LTV (platform revenue per farmer):**
```
  Avg subscribers per farmer     15  (Phase 1 target, NOT steady-state 40)
  Avg monthly rev per sub        $1.37
  Monthly rev per farmer         $20.55
  Monthly farmer churn           5%
  Average farmer lifetime        20 months
  FARMER LTV                     $411.00
  FARMER LTV:CAC                 411 / 52.50 = 7.8x
```

At steady-state (40 subs/farmer per CEO memo):
```
  Monthly rev per farmer         $54.80
  FARMER LTV (20 mo)             $1,096
  FARMER LTV:CAC                 1096 / 300 = 3.7x  (with $300 field sales CAC)
```

### 3.6 LTV:CAC Ratios

```
+---------------------+--------+--------+----------+
| Segment             | LTV    | CAC    | LTV:CAC  |
+---------------------+--------+--------+----------+
| Subscriber (disc.)  | $15.52 | $5.81  | 2.7x     |
| Walk-up buyer       | $0.15  | $5.81  | 0.03x    |
| Farmer (Phase 1)    | $411   | $52.50 | 7.8x     |
| Farmer (steady)     | $1,096 | $300   | 3.7x     |
+---------------------+--------+--------+----------+
```

### FINDING: Subscriber LTV:CAC Is Below the 3x Minimum Threshold

At 5% take rate with current Stripe fee structure, subscriber LTV:CAC of 2.7x
is below the commonly accepted 3:1 minimum for sustainable unit economics. This is
driven by the thin margin between the 5% buyer fee and the ~3.4% effective Stripe
cost on the total charge.

The CEO strategy memo claims buyer LTV of $82 and LTV:CAC of 5.5-10.3x. Those
figures use **gross revenue** (the full 5% fee) rather than **net contribution**
(after Stripe processing). The gross LTV is $17.13; the net contribution LTV is
$15.52. The discrepancy suggests the strategy memo does not fully account for
Stripe costs in its per-buyer economics.

---

## 4. Break-Even Analysis

### Monthly Fixed Costs by Scale

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
|   ($2/acct/mo)    |        |         |          |           |
+-------------------+--------+---------+----------+-----------+
| TOTAL MONTHLY     | $775   | $8,050  | $56,500  | $155,000  |
+-------------------+--------+---------+----------+-----------+

* At 10 farmers: founder does everything (engineering, success, marketing).
  Founder salary not included -- this is pre-revenue/pre-seed.
```

### Three Scenarios

**Assumptions common to all scenarios:**
- Average box price: $45
- Buyer service fee: 5%
- Net contribution per order: $0.43
- Weighted avg orders per subscriber per month: 3.1
- Walk-up orders: 20% of subscription volume
- Walk-up contribution per order: $0.04

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
  Sub revenue: 372 * $0.43        $159.96
  Walk-up revenue: 75 * $0.04     $3.00
  TOTAL MONTHLY CONTRIBUTION      $162.96

Monthly Fixed Costs:              $1,500  (pre-revenue, founder-only)

MONTHLY LOSS:                     -$1,337
ANNUAL LOSS:                      -$16,044
MONTHS TO BREAK-EVEN:             Not achievable at this scale
SUBSCRIBERS NEEDED TO BREAK-EVEN: 1,500 / ($0.43 * 3.1) = 1,125

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
  Sub revenue: 12,400 * $0.43     $5,332
  Walk-up revenue: 2,500 * $0.04  $100
  TOTAL MONTHLY CONTRIBUTION      $5,432

Monthly Fixed Costs:              $25,000  (small team of 3-4)

MONTHLY LOSS:                     -$19,568
ANNUAL LOSS:                      -$234,816
MONTHS TO BREAK-EVEN:             Not achievable at this scale
SUBSCRIBERS NEEDED TO BREAK-EVEN: 25,000 / ($0.43 * 3.1) = 18,756

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
  Sub revenue: 232,500 * $0.43    $99,975
  Walk-up revenue: 45,000 * $0.04 $1,800
  TOTAL MONTHLY CONTRIBUTION      $101,775

Monthly Fixed Costs:              $130,000  (team of 15-20)

MONTHLY LOSS:                     -$28,225
ANNUAL LOSS:                      -$338,700

But at 2,500 farmers w/ 40 subs each (steady state):
  Total subs: 100,000
  Sub orders: 310,000
  Sub contribution: $133,300
  Walk-up: $2,400
  TOTAL: $135,700

  MONTHLY PROFIT:                 +$5,700
  BREAK-EVEN ACHIEVED

==========================================================================
```

### Break-Even Summary Table

```
+-------------------+-----------+-----------+-----------+
| Metric            | Bear      | Base      | Bull      |
+-------------------+-----------+-----------+-----------+
| Farmers           | 15        | 200       | 2,500     |
| Subs/farmer       | 8         | 20        | 30-40     |
| Total subs        | 120       | 4,000     | 75K-100K  |
| Monthly GMV       | $16,740   | $558,000  | $14M      |
| Monthly net rev   | $163      | $5,432    | $102-136K |
| Monthly costs     | $1,500    | $25,000   | $130,000  |
| Monthly P&L       | -$1,337   | -$19,568  | -$28K/+$6K|
| Break-even?       | No        | No        | At 40 s/f |
+-------------------+-----------+-----------+-----------+
```

### FINDING: Break-Even Requires ~97,500 Subscribers at Pure 5% Take

```
  Required monthly contribution = $130,000
  Contribution per sub per month = $1.37
  Required subscribers = 130,000 / 1.37 = 94,891

  At 40 subs/farmer: 94,891 / 40 = 2,373 farmers
```

This is roughly consistent with the CEO memo's estimate of 2,500 farmers / 60,000
buyers. The discrepancy (60K vs 95K) comes from the memo using gross fee revenue
($2.25/order) rather than net contribution ($0.43/order). The CEO memo's cost
estimate of $130K/month at break-even scale is reasonable.

**The math only works if Stripe processing costs are excluded from the per-unit
analysis (i.e., treated as a fixed cost absorbed by gross margins at scale).** In
reality, Stripe costs are purely variable and scale linearly with GMV. This is the
fundamental tension in the 5% take rate model.

---

## 5. Pricing Sensitivity

### Impact of Fee Rate on Unit Economics

```
+--------+-----------+---------+---------+---------+----------+----------+
| Fee %  | Fee ($45) | Stripe  | Net/Txn | Net/Mo  | BEP Subs | LTV:CAC  |
|        |           | Cost    |         | (sub)   |          |          |
+--------+-----------+---------+---------+---------+----------+----------+
| 3%     | $1.35     | $1.64   | -$0.29  | -$0.90  | NEVER    | Negative |
| 4%     | $1.80     | $1.66   | $0.14   | $0.43   | 302,326  | 0.9x     |
| 5%     | $2.25     | $1.67   | $0.43   | $1.37   | 94,891   | 2.7x     |
| 6%     | $2.70     | $1.68   | $0.87   | $2.70   | 48,148   | 5.3x     |
| 7%     | $3.15     | $1.70   | $1.30   | $4.03   | 32,258   | 8.0x     |
| 8%     | $3.60     | $1.71   | $1.74   | $5.39   | 24,119   | 10.7x   |
| 10%    | $4.50     | $1.74   | $2.61   | $8.09   | 16,069   | 16.1x   |
+--------+-----------+---------+---------+---------+----------+----------+

Notes:
  - Stripe cost increases slightly with fee % because total charge is higher
  - BEP Subs = subscribers needed for $130K/mo contribution
  - LTV:CAC uses blended $5.81 buyer CAC, 8% monthly churn
  - Net/Mo = (Net/Txn * 3.1 orders) for weekly-weighted sub
```

### Conversion Impact Estimates

```
+--------+-----------+-------------+-----------+-----------+
| Fee %  | Fee ($45) | Est. Conv.  | Adj. Subs | Net Rev   |
|        |           | Impact      | (vs 5%)   | Impact    |
+--------+-----------+-------------+-----------+-----------+
| 3%     | $1.35     | +10% conv   | +10%      | NEGATIVE  |
| 4%     | $1.80     | +5% conv    | +5%       | -65%      |
| 5%     | $2.25     | Baseline    | Baseline  | Baseline  |
| 6%     | $2.70     | -3% conv    | -3%       | +96%      |
| 7%     | $3.15     | -8% conv    | -8%       | +178%     |
| 8%     | $3.60     | -15% conv   | -15%      | +231%     |
| 10%    | $4.50     | -25% conv   | -25%      | +303%     |
+--------+-----------+-------------+-----------+-----------+

Key insight: Even a 25% conversion drop at 10% fee rate still yields
3x more net revenue than a 5% fee with full conversion.
```

### FINDING: 5% Is Contribution-Dangerous; 7% Is the Sweet Spot

At 5%, the platform retains only $0.43 per $45 transaction after Stripe -- a razor-thin
0.96% effective net margin on GMV. A 7% fee on a $45 box is $3.15, which is:

- Still less than a typical food delivery service fee ($4-8)
- Below Instacart's 5-15% service fee
- Far below DoorDash's 15-30% commission
- Only $0.90 more than the 5% fee ($3.15 vs $2.25)
- But triples the contribution margin

However, this recommendation is constrained by the strategic decision to keep the
fee at 5% for competitive positioning. **The zero-seller-fee + low-buyer-fee
positioning is the core differentiator.** The trade-off is that break-even requires
massive scale.

### Alternative: Hybrid Fee Model (BPS + Flat)

The code already supports `BUYER_FEE_FLAT_CENTS`. A $0.30-$0.50 flat fee
per transaction would meaningfully improve economics on low-value orders:

```
+-------------+----------+---------+---------+---------+
| Box Price   | 5% Only  | 5%+$0.30| 5%+$0.50| Diff    |
|             | Net/Txn  | Net/Txn | Net/Txn | vs 5%   |
+-------------+----------+---------+---------+---------+
| $25.00      | $0.04    | $0.33   | $0.52   | +$0.29  |
| $35.00      | $0.23    | $0.52   | $0.71   | +$0.29  |
| $45.00      | $0.43    | $0.71   | $0.89   | +$0.28  |
| $60.00      | $0.73    | $1.01   | $1.19   | +$0.28  |
+-------------+----------+---------+---------+---------+

A $0.30 flat fee:
  - Eliminates contribution-negative orders (breakeven drops to ~$15)
  - Adds ~$0.29/txn across all price points
  - On 12,400 monthly sub orders (base case): +$3,596/mo additional contribution
  - Can be positioned as "payment processing fee" (transparent, defensible)
```

---

## 6. Infrastructure Cost Model

### Per-Service Cost Estimates

```
==========================================================================
                    10 farmers   100 farmers  1,000 farmers  5,000 farmers
                    50 buyers    1,000 buyers 25,000 buyers  150,000 buyers
==========================================================================

VERCEL (Frontend)
  Plan              Hobby (Free) Pro ($20/mo) Pro ($20/mo)   Pro ($20/mo)
  Bandwidth overage $0           $0           $50/mo         $200/mo
  Serverless overage$0           $0           $30/mo         $100/mo
  TOTAL             $0           $20          $100           $320
--------------------------------------------------------------------------

RAILWAY (Backend + PostgreSQL)
  Plan              Hobby ($5)   Pro ($20)    Pro ($20)      Pro ($20)
  Compute (Go API)  $5           $15          $80            $300
  PostgreSQL        $5           $20          $150           $600
  Bandwidth         $0           $5           $30            $100
  TOTAL             $15          $60          $280           $1,020
--------------------------------------------------------------------------

SUPABASE (Storage)
  Plan              Free         Free         Pro ($25/mo)   Pro ($25/mo)
  Storage           $0           $0           $10            $50
  Bandwidth         $0           $0           $5             $30
  TOTAL             $0           $0           $40            $105
--------------------------------------------------------------------------

STRIPE (Payment Processing)
  Processing fees   Variable*    Variable*    Variable*      Variable*
  Connect accounts  $20          $200         $2,000         $10,000
  TOTAL FIXED       $20          $200         $2,000         $10,000
--------------------------------------------------------------------------

RESEND (Email)
  Plan              Free         Free         Pro ($20/mo)   Pro ($20/mo)
  Volume            <3K/mo       <3K/mo       ~50K/mo        ~300K/mo
  Overage           $0           $0           $0             $200/mo
  TOTAL             $0           $0           $20            $220
--------------------------------------------------------------------------

GOOGLE APIS (Places, OAuth)
  Places autocomplete $0         $10          $100           $400
  OAuth             $0           $0           $0             $0
  TOTAL             $0           $10          $100           $400
--------------------------------------------------------------------------

DOMAIN + SSL
  TOTAL             $20          $20          $20            $20
--------------------------------------------------------------------------

MONTHLY INFRA TOTAL $55         $310         $2,560         $12,085
ANNUAL INFRA TOTAL  $660        $3,720       $30,720        $145,020
==========================================================================

* Stripe processing fees are variable costs, not infrastructure:
  At 1,000 farmers / 25K subs / 77,500 orders/mo at $45 avg:
    GMV = $3.49M/mo
    Total charged (incl fee) = $3.66M/mo
    Stripe processing = ~$106K/mo (2.9% + $0.30/txn)
    This is NOT an infrastructure cost -- it's COGS.
```

### Infrastructure as % of Revenue

```
+--------------------+-----------+----------+----------+
| Scale              | Infra/mo  | Gross Rev| Infra %  |
+--------------------+-----------+----------+----------+
| 10 farmers         | $55       | $163     | 33.7%    |
| 100 farmers        | $310      | $5,432   | 5.7%     |
| 1,000 farmers      | $2,560    | $56,500* | 4.5%     |
| 5,000 farmers      | $12,085   | $337,500*| 3.6%     |
+--------------------+-----------+----------+----------+

* Gross fee revenue (before Stripe processing)
  Infrastructure scales favorably -- dropping below 5% of gross
  revenue at 100+ farmers. This is healthy for a marketplace.
```

---

## 7. Market Benchmarks

### Marketplace Take Rate Comparison

```
+-------------------------+--------------------+------------------+
| Platform                | Seller Pays        | Buyer Pays       |
+-------------------------+--------------------+------------------+
| Local-Roots             | $0                 | 5% service fee   |
| Barn2Door               | $99-299/mo + 2.9%  | $0               |
| Local Line              | $49-199+/mo        | $0               |
| GrazeCart               | ~$149/mo           | $0               |
| Harvie                  | 7% + 3% CC         | $6 delivery      |
| Instacart               | 15-30% commission  | 5-15% svc fee    |
| DoorDash                | 15-30% commission  | Service + delivery|
| Uber Eats               | 15-30% commission  | Service + delivery|
| Etsy                    | 6.5% + $0.20/listing| ~0%             |
| Shopify                 | $39-399/mo         | 0%               |
+-------------------------+--------------------+------------------+

Local-Roots effective take rate: 5% (buyer-side only)
Industry average marketplace take rate: 15-25% (combined)
Farm e-commerce SaaS effective rate: 5-15% (monthly fee / GMV)
```

### Key Benchmark Insights

1. **5% is at the bottom of viable marketplace take rates.** Most two-sided
   marketplaces operate at 10-30% blended take rates. At 5%, Local-Roots is
   positioned as a loss-leader to win farmers, with a plan to expand take rate
   through additional services over time.

2. **Delivery marketplaces justify higher fees through logistics.** DoorDash,
   Instacart, and Uber Eats operate at 20-30% because they manage delivery. Local
   pickup eliminates this cost but also eliminates the fee justification.

3. **Farm SaaS tools charge $50-300/month regardless of volume.** For a farmer
   doing $2,000/month through the platform, a 5% buyer fee generates $100/month
   in platform revenue -- comparable to what the farmer would pay for a SaaS tool,
   but with the critical difference that the farmer pays nothing.

4. **Stripe Connect Express adds ~$2/month per active farmer account** plus
   0.25% + $0.25 per payout. At scale (5,000 farmers), this is $120K/year in
   Connect fees alone, before any processing costs.

### Sources

- [Stripe Pricing](https://stripe.com/pricing)
- [Stripe Connect Pricing](https://stripe.com/connect/pricing)
- [Stripe Fee Breakdown 2026](https://globalfeecalculator.com/blog/how-stripe-fees-work/)
- [Marketplace Valuation & Take Rates](https://www.equidam.com/marketplace-valuation-gmv-value-creation-business-strategy/)
- [Marketplace KPIs: CAC, LTV, Take-Rate](https://financialmodelslab.com/blogs/kpi-metrics/goods-and-products-marketplace)
- [KitchenHub: Marketplace Commission Models](https://www.trykitchenhub.com/post/what-marketplaces-arent-telling-you-how-commission-models-are-quietly-changing)
- [Local Food Marketplace Pricing](https://home.localfoodmarketplace.com/pricing/)
- [Vercel Pricing](https://vercel.com/pricing)
- [Railway Pricing](https://docs.railway.com/pricing/plans)
- [Supabase Pricing](https://supabase.com/pricing)
- [Resend Pricing](https://resend.com/pricing)

---

## 8. Key Findings & Recommendations

### Finding 1: Verify Production Fee Configuration (CRITICAL)

The backend defaults `BUYER_FEE_BPS` to `0`. Unless `BUYER_FEE_BPS=500` is
explicitly set in Railway's environment variables, **every transaction generates
zero platform revenue**. This is the single most important action item from this
audit.

**Recommendation:** Immediately verify the production environment configuration.
If fees are not set, this is a P0 issue.

### Finding 2: Net Contribution Per Transaction Is Razor-Thin

At 5% buyer fee on a $45 box, the platform retains $0.43 per transaction after
Stripe processing -- an effective net margin of 0.96% on GMV. This is structurally
thin for a marketplace. The strategy memo's per-unit economics ($2.25 net revenue
per order) are overstated because they do not deduct Stripe processing costs.

**Recommendation:** Update the strategy memo's unit economics to reflect true net
contribution after Stripe fees. Investors will ask this question and the current
figures will not withstand scrutiny.

### Finding 3: Walk-Up Orders Are Economically Negligible

One-time orders at $25 average contribute $0.04 per transaction. These buyers have
40% monthly churn and negligible LTV ($0.15). Walk-up orders are strategically
valuable only as a subscriber conversion funnel -- their standalone economics do
not justify the engineering investment.

**Recommendation:** Track walk-up-to-subscriber conversion rate aggressively.
If conversion is below 10%, reconsider the walk-up feature's priority.

### Finding 4: Orders Below ~$23 Are Contribution-Negative

The $0.30 Stripe flat fee creates a floor. At 5% take rate, orders below $23.02
cost the platform money. If farmers offer low-priced items (e.g., $5 herbs, $8
eggs), the platform loses money on every transaction.

**Recommendation:** Consider implementing a minimum order value ($15-20) or adding
`BUYER_FEE_FLAT_CENTS=30` to establish a per-transaction floor that covers Stripe's
flat fee. The code already supports this -- it just needs the env var set.

### Finding 5: Break-Even at 5% Requires ~95,000 Subscribers

The CEO memo estimates break-even at 2,500 farmers / 60,000 buyers. The true
break-even is closer to 2,500 farmers / 95,000 subscribers when accounting for
Stripe processing as variable COGS. This requires an average of 38 subscribers per
farmer, which is achievable at steady state but requires 3-4 years of operation.

**Recommendation:** Model a faster path to break-even through one of:
- Add `BUYER_FEE_FLAT_CENTS=30` (reduces break-even to ~60K subs)
- Introduce premium seller SaaS tier at $29-49/mo (as planned in Phase 2)
- Negotiate volume Stripe pricing at scale (2.5% + $0.25 is achievable at $1M+/mo)

### Finding 6: Cancellation Policy Doc Has Incorrect Cost Allocation

`docs/ops/cancellation-policy.md` line 66 states Stripe processing is "Deducted
from payout" under the seller column. In reality, the code transfers the full
`subtotalCents` to sellers (`seller_orders.go:507`). Stripe processing is absorbed
from the platform's gross fee revenue.

**Recommendation:** Correct the cancellation-policy.md cost allocation table.
The seller does NOT pay Stripe processing on the box price.

### Finding 7: Infrastructure Costs Scale Favorably

Infrastructure costs are well-controlled. At 100 farmers, infrastructure is ~$310/mo
(5.7% of gross revenue). At 1,000 farmers, it is ~$2,560/mo (4.5%). The dominant
cost is Stripe Connect account fees ($2/farmer/month), which are unavoidable.

**No action required.** Infrastructure cost structure is appropriate for this stage.

### Finding 8: LTV:CAC Ratios Require Honest Assessment

| Metric                | Strategy Memo | This Audit | Gap    |
|-----------------------|---------------|------------|--------|
| Subscriber LTV        | $82           | $15.52     | -81%   |
| Buyer LTV:CAC         | 5.5-10.3x     | 2.7x       | -74%   |
| Farmer LTV            | $5,261        | $411-$1,096| -79%   |
| Farmer LTV:CAC        | 10.5-17.5x    | 3.7-7.8x   | -65%   |

The strategy memo uses gross fee revenue for LTV calculations and does not deduct
Stripe processing costs (which are ~74% of the 5% fee on a $45 order). The corrected
figures paint a materially different picture.

**Recommendation:** The strategy memo's unit economics section needs a rewrite
before presenting to investors. Use net contribution figures, not gross fee revenue.
The business is still viable at scale, but the path to profitability is longer than
the memo suggests.

---

## Appendix A: Sensitivity Matrix -- Fee Rate vs Average Box Price

Net contribution per transaction (after Stripe + $0.15 infra):

```
           | $25 box  | $35 box  | $45 box  | $55 box  | $65 box  |
-----------+----------+----------+----------+----------+----------+
  3% fee   | -$0.44   | -$0.27   | -$0.14   | $0.00    | $0.14    |
  5% fee   | $0.04    | $0.23    | $0.43    | $0.63    | $0.83    |
  7% fee   | $0.51    | $0.73    | $1.00    | $1.25    | $1.51    |
  10% fee  | $1.19    | $1.49    | $1.85    | $2.19    | $2.55    |
-----------+----------+----------+----------+----------+----------+
```

## Appendix B: Monthly P&L Template at Base Case (200 Farmers)

```
REVENUE
  Subscription GMV (4,000 subs * 3.1 * $45)     $558,000
  Walk-up GMV (2,500 * $25)                       $62,500
  Total GMV                                      $620,500
  Buyer fees collected (5%)                       $31,025
  (-) Stripe processing                          -$19,285
  (-) Connect account fees (200 * $2)               -$400
  GROSS PROFIT                                    $11,340

OPERATING EXPENSES
  Engineering (founder + 1 eng)                   $10,000
  Farmer success (part-time)                       $5,000
  Infrastructure                                     $310
  Marketing                                        $2,000
  Legal/accounting                                   $500
  Miscellaneous                                      $500
  TOTAL OPEX                                      $18,310

NET MONTHLY LOSS                                  -$6,970
MONTHLY BURN RATE                                 -$6,970
RUNWAY (at $500K raise)                           71 months
```

## Appendix C: Key Code Files Referenced

| File | Relevance |
|------|-----------|
| `backend/internal/config/config.go` | Fee defaults, env var parsing |
| `backend/internal/api/v1/subscriptions.go` | `computeBuyerFee()`, subscription checkout |
| `backend/internal/api/v1/order_checkout.go` | Walk-up checkout, fee calculation |
| `backend/internal/api/v1/orders.go` | Order creation with fee breakdown |
| `backend/internal/api/v1/seller_orders.go` | `transferToSeller()`, payout logic |
| `backend/internal/api/v1/seller_payouts.go` | Payout summary calculation |
| `backend/internal/api/v1/pickup_confirm.go` | Capture + transfer on pickup |
| `backend/internal/api/v1/fee_consistency_test.go` | Fee formula verification |
| `backend/internal/payments/stripepay/stripepay.go` | Stripe API calls |
| `frontend/src/components/checkout-form.tsx` | Buyer fee display |
| `frontend/src/components/subscribe-form.tsx` | Subscription fee display |
| `docs/ops/payments.md` | Payment flow documentation |
| `docs/ops/cancellation-policy.md` | Cost allocation (has error) |
| `docs/strategy/01-market-analysis.md` | TAM/SAM/SOM |
| `docs/strategy/02-product-strategy.md` | Product roadmap, KPIs |
| `docs/strategy/03-go-to-market.md` | GTM, CAC estimates, pricing |
| `docs/strategy/04-ceo-strategy-memo.md` | Unit economics, fundraising |

---

*This audit was prepared as a financial analysis exercise. All models use assumptions
derived from the codebase, strategy documents, and public market data. Actual results
will vary based on production configuration, market conditions, and execution.*
