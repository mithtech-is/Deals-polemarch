import React, { useEffect, useMemo, useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, Text, Textarea, toast } from "@medusajs/ui"

type Field = { key: string; label: string; textarea?: boolean }

const PROFILE_FIELDS: Field[] = [
  { key: "company_name", label: "Company Name" },
  { key: "description", label: "Description", textarea: true },
  { key: "sector", label: "Sector" },
  { key: "industry", label: "Industry" },
  { key: "founded", label: "Founded" },
  { key: "headquarters", label: "Headquarters" },
  { key: "share_type", label: "Share Type" },
  { key: "listing_status", label: "Listing Status" },
]

const FINANCIAL_FIELDS: Field[] = [
  { key: "market_cap", label: "Market Cap" },
  { key: "valuation", label: "Valuation" },
  { key: "pe_ratio", label: "P/E Ratio" },
  { key: "pb_ratio", label: "P/B Ratio" },
  { key: "roe_value", label: "ROE (%)" },
  { key: "debt_to_equity", label: "Debt to Equity" },
  { key: "book_value", label: "Book Value" },
  { key: "fifty_two_week_high", label: "52 Week High" },
  { key: "fifty_two_week_low", label: "52 Week Low" },
  { key: "face_value", label: "Face Value" },
  { key: "lot_size", label: "Lot Size" },
  { key: "total_shares", label: "Total Shares" },
]

const REGULATORY_FIELDS: Field[] = [
  { key: "cin", label: "CIN" },
  { key: "pan_number", label: "PAN Number" },
  { key: "rta", label: "RTA" },
  { key: "depository", label: "Depository" },
]

const ALL_FIELDS: Field[] = [...PROFILE_FIELDS, ...FINANCIAL_FIELDS, ...REGULATORY_FIELDS]

const CalculaFieldsWidget = ({ data: product }: { data: any }) => {
  const initialIsin = (product?.metadata?.isin as string) || ""
  const [isin, setIsin] = useState(initialIsin)
  const [savingIsin, setSavingIsin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(ALL_FIELDS.map((f) => [f.key, ""]))
  )

  useEffect(() => {
    setIsin((product?.metadata?.isin as string) || "")
  }, [product?.id, product?.metadata?.isin])

  useEffect(() => {
    if (!isin) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/admin/calcula/${encodeURIComponent(isin)}`, {
          credentials: "include",
        })
        if (!res.ok) {
          if (res.status !== 404) throw new Error(`HTTP ${res.status}`)
          if (!cancelled) setValues(Object.fromEntries(ALL_FIELDS.map((f) => [f.key, ""])))
          return
        }
        const data = await res.json()
        if (cancelled) return
        const next: Record<string, string> = {}
        for (const f of ALL_FIELDS) next[f.key] = data?.[f.key] ?? ""
        setValues(next)
      } catch (err: any) {
        toast.error("Error", { description: err?.message || "Failed to load fields" })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isin])

  const saveIsin = async () => {
    setSavingIsin(true)
    try {
      const res = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: { ...(product.metadata || {}), isin: isin.trim() },
        }),
      })
      if (!res.ok) throw new Error("Failed to set ISIN")
      toast.success("Saved", { description: "ISIN linked to product." })
    } catch (err: any) {
      toast.error("Error", { description: err?.message || "Failed to save ISIN" })
    } finally {
      setSavingIsin(false)
    }
  }

  const saveFields = async () => {
    if (!isin) return
    setSaving(true)
    try {
      const res = await fetch(`/admin/calcula/${encodeURIComponent(isin)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success("Saved", { description: "Company details updated." })
    } catch (err: any) {
      toast.error("Error", { description: err?.message || "Failed to save fields" })
    } finally {
      setSaving(false)
    }
  }

  const onChange = (key: string, v: string) => setValues((p) => ({ ...p, [key]: v }))

  const hasIsin = useMemo(() => Boolean(initialIsin), [initialIsin])

  const renderSection = (title: string, fields: Field[]) => (
    <div className="mb-6">
      <Heading level="h3" className="mb-3">
        {title}
      </Heading>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fields.map((f) => (
          <div key={f.key} className={f.textarea ? "md:col-span-3" : ""}>
            <Label>{f.label}</Label>
            {f.textarea ? (
              <Textarea
                disabled={loading}
                rows={3}
                value={values[f.key] || ""}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            ) : (
              <Input
                disabled={loading}
                value={values[f.key] || ""}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-ui-border-base">
        <div>
          <Heading level="h2">Company Details</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Unlisted-share fields for this product. Linked by ISIN to the Calcula record.
          </Text>
        </div>
        {hasIsin && (
          <Text size="small" className="text-ui-fg-subtle">
            ISIN: <span className="font-mono font-medium text-ui-fg-base">{initialIsin}</span>
          </Text>
        )}
      </div>

      {!hasIsin && (
        <div className="mb-6 flex items-end gap-x-2">
          <div className="flex-1">
            <Label>ISIN (required)</Label>
            <Input
              placeholder="e.g. INE002A01018"
              value={isin}
              onChange={(e) => setIsin(e.target.value)}
            />
          </div>
          <Button onClick={saveIsin} disabled={savingIsin || !isin.trim()}>
            {savingIsin ? "Saving…" : "Link ISIN"}
          </Button>
        </div>
      )}

      {hasIsin && (
        <>
          {renderSection("Company Profile", PROFILE_FIELDS)}
          {renderSection("Financial Highlights", FINANCIAL_FIELDS)}
          {renderSection("Regulatory & Depository", REGULATORY_FIELDS)}
          <div className="flex justify-end">
            <Button onClick={saveFields} disabled={saving || loading}>
              {saving ? "Saving…" : "Save Company Details"}
            </Button>
          </div>
        </>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default CalculaFieldsWidget
