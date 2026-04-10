/**
 * Display labels and ordered input schemas for the 18 PE/VC valuation
 * methods. Shared between the storefront ValuationPanel and Calcula admin.
 */

export const VALUATION_METHOD_LABELS: Record<string, string> = {
  dcf: "Discounted Cash Flow (DCF)",
  trading_comparables: "Trading Comparables",
  precedent_transactions: "Precedent Transactions",
  lbo: "Leveraged Buyout (LBO)",
  vc_method: "Venture Capital Method",
  first_chicago: "First Chicago Method",
  scorecard: "Scorecard Method",
  berkus: "Berkus Method",
  risk_factor_summation: "Risk Factor Summation",
  sotp: "Sum-of-the-Parts (SOTP)",
  asset_based: "Asset-Based / NAV",
  dividend_discount: "Dividend Discount Model",
  residual_income: "Residual Income",
  rule_of_forty: "Rule of 40",
  arr_multiple: "ARR / Revenue Multiple",
  last_round: "Last Funding Round",
  public_market_equivalent: "Public Market Equivalent",
  real_options: "Real Options (Black-Scholes)",
};

export const VALUATION_METHOD_ORDER: string[] = [
  "dcf",
  "trading_comparables",
  "precedent_transactions",
  "lbo",
  "vc_method",
  "first_chicago",
  "scorecard",
  "berkus",
  "risk_factor_summation",
  "sotp",
  "asset_based",
  "dividend_discount",
  "residual_income",
  "rule_of_forty",
  "arr_multiple",
  "last_round",
  "public_market_equivalent",
  "real_options",
];
