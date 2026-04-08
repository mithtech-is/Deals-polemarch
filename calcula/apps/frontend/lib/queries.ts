export const COMPANIES_QUERY = `
  query Companies($q: String) {
    companies(q: $q) {
      id
      name
      isin
      cin
      sector
      industry
      listingStatus
      description
      country
    }
  }
`;

export const COMPANY_QUERY = `
  query Company($id: String!) {
    company(id: $id) {
      id
      name
      isin
      cin
      sector
      industry
      listingStatus
      description
      country
    }
  }
`;

export const CREATE_COMPANY_MUTATION = `
  mutation CreateCompany($input: CreateCompanyInput!) {
    createCompany(input: $input) {
      id
      name
      country
      listingStatus
    }
  }
`;

export const UPDATE_COMPANY_MUTATION = `
  mutation UpdateCompany($id: String!, $input: UpdateCompanyInput!) {
    updateCompany(id: $id, input: $input) {
      id
      name
      isin
      cin
      sector
      industry
      listingStatus
      description
      country
    }
  }
`;

export const DELETE_COMPANY_MUTATION = `
  mutation DeleteCompany($id: String!) {
    deleteCompany(id: $id)
  }
`;

export const PERIODS_QUERY = `
  query CompanyPeriods($companyId: String!) {
    companyPeriods(companyId: $companyId) {
      id
      companyId
      fiscalYear
      fiscalQuarter
      periodStart
      periodEnd
      isAudited
    }
  }
`;

export const UPSERT_PERIOD_MUTATION = `
  mutation UpsertPeriod($input: UpsertPeriodInput!) {
    upsertPeriod(input: $input) {
      id
      companyId
      fiscalYear
      fiscalQuarter
      periodStart
      periodEnd
      isAudited
    }
  }
`;

export const DELETE_PERIOD_MUTATION = `
  mutation DeletePeriod($id: String!) {
    deletePeriod(id: $id)
  }
`;

export const LINE_ITEMS_QUERY = `
  query LineItems($statementType: String) {
    financialLineItems(statementType: $statementType) {
      id
      code
      name
      parentId
      statementType
      orderCode
      displayOrder
      isRequired
      isCalculated
      formula
    }
  }
`;

export const UPSERT_LINE_ITEM_MUTATION = `
  mutation UpsertLineItem($input: UpsertFinancialLineItemInput!) {
    upsertFinancialLineItem(input: $input) {
      id
      code
      name
      parentId
      statementType
      orderCode
      displayOrder
      isRequired
      isCalculated
      formula
    }
  }
`;

export const DELETE_LINE_ITEM_MUTATION = `
  mutation DeleteLineItem($id: String!) {
    deleteFinancialLineItem(id: $id)
  }
`;

export const REMAINDER_MAPPINGS_QUERY = `
  query FinancialRemainderMappings($statementType: String) {
    financialRemainderMappings(statementType: $statementType) {
      id
      parentLineItemId
      parentCode
      parentName
      remainderLineItemId
      remainderCode
      remainderName
      isValid
      validationMessage
    }
  }
`;

export const UPSERT_REMAINDER_MAPPING_MUTATION = `
  mutation UpsertFinancialRemainderMapping($input: UpsertFinancialRemainderMappingInput!) {
    upsertFinancialRemainderMapping(input: $input) {
      id
      parentLineItemId
      parentCode
      parentName
      remainderLineItemId
      remainderCode
      remainderName
      isValid
      validationMessage
    }
  }
`;

export const DELETE_REMAINDER_MAPPING_MUTATION = `
  mutation DeleteFinancialRemainderMapping($id: String!) {
    deleteFinancialRemainderMapping(id: $id)
  }
`;

export const REPAIR_REMAINDER_MAPPING_MUTATION = `
  mutation RepairFinancialRemainderMapping($input: RepairFinancialRemainderMappingInput!) {
    repairFinancialRemainderMapping(input: $input) {
      id
      parentLineItemId
      parentCode
      parentName
      remainderLineItemId
      remainderCode
      remainderName
      isValid
      validationMessage
    }
  }
`;

export const COMPANY_MULTI_PERIOD_FINANCIALS_QUERY = `
  query CompanyMultiPeriodFinancials($companyId: String!, $periodIds: [String!]!, $statementType: String) {
    companyMultiPeriodFinancials(companyId: $companyId, periodIds: $periodIds, statementType: $statementType) {
      id
      companyId
      periodId
      lineItemId
      lineItemCode
      lineItemName
      orderCode
      value
      currency
      valueSource
    }
  }
`;

export const UPSERT_FINANCIAL_VALUES_MUTATION = `
  mutation UpsertFinancialValues($input: UpsertFinancialValuesBatchInput!) {
    upsertFinancialValues(input: $input) {
      id
      lineItemId
      value
      currency
      valueSource
    }
  }
`;

export const TRENDS_QUERY = `
  query Trends($companyId: String!) {
    companyTrends(companyId: $companyId) {
      periodLabel
      revenue
      netProfit
      networth
    }
  }
`;

export const COMPANY_BY_ISIN_QUERY = `
  query CompanyByIsin($isin: String!) {
    companyByIsin(isin: $isin) {
      id
      name
      isin
      cin
      sector
      industry
      listingStatus
      description
      country
    }
  }
`;

export const COMPANY_PRICE_HISTORY_QUERY = `
  query CompanyPriceHistory($companyId: String!) {
    companyPriceHistory(companyId: $companyId) {
      id
      companyId
      datetime
      price
      note
      link
      category
    }
  }
`;

export const UPSERT_COMPANY_PRICE_MUTATION = `
  mutation UpsertCompanyPrice($companyId: String!, $input: UpsertCompanyPriceInput!) {
    upsertCompanyPrice(companyId: $companyId, input: $input) {
      id
      companyId
      datetime
      price
      note
      link
      category
    }
  }
`;

export const UPSERT_COMPANY_PRICE_BULK_MUTATION = `
  mutation UpsertCompanyPriceBulk($companyId: String!, $entries: [UpsertCompanyPriceInput!]!) {
    upsertCompanyPriceBulk(companyId: $companyId, entries: $entries) {
      id
      datetime
      price
      note
      link
      category
    }
  }
`;

export const DELETE_COMPANY_PRICE_MUTATION = `
  mutation DeleteCompanyPrice($id: String!) {
    deleteCompanyPrice(id: $id)
  }
`;

export const DELETE_COMPANY_PRICE_BULK_MUTATION = `
  mutation DeleteCompanyPriceBulk($companyId: String!, $ids: [String!]!) {
    deleteCompanyPriceBulk(companyId: $companyId, ids: $ids)
  }
`;

// ── News events (Phase 3) ─────────────────────────────────────

export const COMPANY_NEWS_EVENTS_QUERY = `
  query CompanyNewsEvents($companyId: String!) {
    companyNewsEvents(companyId: $companyId) {
      id
      companyId
      occurredAt
      category
      title
      body
      sourceUrl
      updatedAt
    }
  }
`;

export const UPSERT_NEWS_EVENT_MUTATION = `
  mutation UpsertNewsEvent($input: UpsertNewsEventInput!) {
    upsertNewsEvent(input: $input) {
      id
      companyId
      occurredAt
      category
      title
      body
      sourceUrl
    }
  }
`;

export const DELETE_NEWS_EVENT_MUTATION = `
  mutation DeleteNewsEvent($id: String!) {
    deleteNewsEvent(id: $id)
  }
`;

// ── Editorial: CompanyOverview + ProsCons (Phase 4/5) ─────────

export const COMPANY_NARRATIVE_QUERY = `
  query CompanyNarrative($companyId: String!) {
    companyNarrative(companyId: $companyId) {
      companyId
      summary
      businessModel
      competitiveMoat
      risks
      updatedAt
    }
  }
`;

export const UPSERT_COMPANY_NARRATIVE_MUTATION = `
  mutation UpsertCompanyNarrative($input: UpsertCompanyOverviewInput!) {
    upsertCompanyNarrative(input: $input) {
      companyId
      summary
      businessModel
      competitiveMoat
      risks
    }
  }
`;

export const COMPANY_PROS_CONS_QUERY = `
  query CompanyProsCons($companyId: String!) {
    companyProsCons(companyId: $companyId) {
      companyId
      pros
      cons
      updatedAt
    }
  }
`;

export const UPSERT_PROS_CONS_MUTATION = `
  mutation UpsertProsCons($input: UpsertProsConsInput!) {
    upsertProsCons(input: $input) {
      companyId
      pros
      cons
    }
  }
`;

