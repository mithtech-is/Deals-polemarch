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
  listingStatus: string;
  description?: string | null;
  country: string;
};

export type PriceEventCategory = 'C' | 'N' | 'R';

export type CompanyPricePoint = {
  id: string;
  companyId: string;
  datetime: string;
  price: number;
  note?: string | null;
  link?: string | null;
  category?: PriceEventCategory | null;
};

export type NewsEventItem = {
  id: string;
  companyId: string;
  occurredAt: string;
  category: PriceEventCategory;
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
  statementType: 'balance_sheet' | 'pnl' | 'cashflow' | 'derived';
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
