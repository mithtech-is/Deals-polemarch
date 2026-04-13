export type StatementType = 'balance_sheet' | 'pnl' | 'cashflow' | 'change_in_equity' | 'ratios_valuations' | 'auxiliary_data';

export type AuthToken = {
  accessToken: string;
  role: string;
  username: string;
};

export type Company = {
  id: string;
  name: string;
  isin: string;
  cin?: string | null;
  sector?: string | null;
  industry?: string | null;
  activity?: string | null;
  sectorId?: string | null;
  industryId?: string | null;
  activityId?: string | null;
  listingStatus: string;
  description?: string | null;
  country: string;
};

export type PriceEventCategory = 'C' | 'E' | 'N' | 'R';

export type CompanyPricePoint = {
  id: string;
  companyId: string;
  datetime: string;
  price: number;
  note?: string | null;
  link?: string | null;
  category?: PriceEventCategory | null;
};

export type EventSentiment = 'G' | 'R' | 'B';

export type NewsEventItem = {
  id: string;
  companyId: string;
  occurredAt: string;
  category: PriceEventCategory;
  sentiment?: EventSentiment | null;
  impactScore?: number | null;
  title: string;
  body: string;
  sourceUrl?: string | null;
  updatedAt?: string;
};

export type CompanyNarrative = {
  companyId: string;
  summary: string;
  businessModel?: string | null;
  competitiveMoat?: string | null;
  risks?: string | null;
  financialInsights?: string | null;
  industryAnalysis?: string | null;
  sectorAnalysis?: string | null;
  activityAnalysis?: string | null;
  updatedAt?: string;
};

export type CompanyProsCons = {
  companyId: string;
  pros: string;
  cons: string;
  updatedAt?: string;
};

export type CompanyFaqItem = { question: string; answer: string };

export type CompanyFaq = {
  companyId: string;
  items: CompanyFaqItem[];
  updatedAt?: string;
};

export type CompanyTeamMember = {
  name: string;
  role: string;
  since?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
  photoUrl?: string | null;
};

export type CompanyTeam = {
  companyId: string;
  members: CompanyTeamMember[];
  updatedAt?: string;
};

export type CompanyShareholderEntry = {
  name: string;
  type: string;
  stakePercent?: string | null;
  since?: string | null;
  note?: string | null;
};

export type CompanyShareholders = {
  companyId: string;
  entries: CompanyShareholderEntry[];
  updatedAt?: string;
};

export type CompanyCompetitorEntry = {
  name: string;
  isin?: string | null;
  link?: string | null;
  theirEdge?: string | null;
  ourEdge?: string | null;
  note?: string | null;
};

export type CompanyCompetitors = {
  companyId: string;
  entries: CompanyCompetitorEntry[];
  updatedAt?: string;
};

export type FinancialPeriod = {
  id: string;
  companyId: string;
  fiscalYear: number;
  fiscalQuarter?: number | null;
  periodStart: string;
  periodEnd: string;
  isAudited: boolean;
};

export type FinancialLineItem = {
  id: string;
  code: string;
  name: string;
  parentId?: string | null;
  statementType: StatementType;
  orderCode: string;
  displayOrder: number;
  isRequired: boolean;
  isCalculated: boolean;
  formula?: string | null;
  children?: FinancialLineItem[];
};

export type FinancialValue = {
  id: string;
  companyId: string;
  periodId: string;
  lineItemId: string;
  lineItemCode: string;
  lineItemName: string;
  orderCode: string;
  value: number;
  currency?: string | null;
  valueSource: 'manual' | 'derived';
};

export type FinancialRemainderMapping = {
  id: string;
  parentLineItemId: string;
  parentCode: string;
  parentName: string;
  remainderLineItemId: string;
  remainderCode: string;
  remainderName: string;
  isValid: boolean;
  validationMessage?: string | null;
};

// ── Profile: CompanyDetails + CompanyValuations (Phase 6) ─────

export type CompanyDetails = {
  companyId: string;
  logoUrl: string | null;
  website: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  crunchbaseUrl: string | null;
  founded: string | null;
  incorporationCountry: string | null;
  legalEntityType: string | null;
  registeredOffice: string | null;
  headquarters: string | null;
  auditor: string | null;
  panNumber: string | null;
  rta: string | null;
  depository: string | null;
  employeeCount: number | null;
  subsidiariesCount: number | null;
  fiscalYearEnd: string | null;
  shareType: string | null;
  faceValue: string | null;
  totalShares: string | null;
  lotSize: number | null;
  availabilityPercent: string | null;
  fiftyTwoWeekHigh: string | null;
  fiftyTwoWeekLow: string | null;
  lastRoundType: string | null;
  lastRoundDate: string | null;
  lastRoundRaised: string | null;
  lastRoundLead: string | null;
  lastRoundValuation: string | null;
  updatedAt: string;
};

export type ValuationMethodType =
  | 'dcf'
  | 'trading_comparables'
  | 'precedent_transactions'
  | 'lbo'
  | 'vc_method'
  | 'first_chicago'
  | 'scorecard'
  | 'berkus'
  | 'risk_factor_summation'
  | 'sotp'
  | 'asset_based'
  | 'dividend_discount'
  | 'residual_income'
  | 'rule_of_forty'
  | 'arr_multiple'
  | 'last_round'
  | 'public_market_equivalent'
  | 'real_options';

export type ValuationModelEntry = {
  id: string;
  methodType: ValuationMethodType;
  label: string;
  weight: number;
  impliedValueLow: number | null;
  impliedValueBase: number | null;
  impliedValueHigh: number | null;
  notes: string | null;
  payload: Record<string, unknown>;
};

export type CompanyValuations = {
  companyId: string;
  baseCurrency: string;
  asOfDate: string | null;
  summary: string | null;
  /** Wire format from backend: JSON-serialized array of ValuationModelEntry. */
  modelsJson: string;
  updatedAt: string;
};
