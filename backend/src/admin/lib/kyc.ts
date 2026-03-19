export type KycStatus =
  | "none"
  | "pending"
  | "submitted"
  | "approved"
  | "verified"
  | "rejected"

export type AdminCustomer = {
  id: string
  email?: string
  first_name?: string
  last_name?: string
  created_at?: string
  metadata?: Record<string, any>
}

export type KycRecord = {
  customerId: string
  email: string
  name: string
  status: KycStatus
  fullName: string
  panNumber: string
  aadhaarNumber: string
  dpName: string
  dematNumber: string
  panFileUrl: string
  cmrFileUrl: string
  submittedAt: string
  reviewedAt: string
  reviewNotes: string
  rejectionReason: string
  metadata: Record<string, any>
}

export const hasKycSubmission = (customer: AdminCustomer) => {
  const metadata = customer.metadata || {}

  return Boolean(
    metadata.kyc_pan_number ||
      metadata.kyc_aadhaar_number ||
      metadata.kyc_demat_number ||
      metadata.kyc_pan_file_url ||
      metadata.kyc_cmr_file_url ||
      metadata.kyc_status
  )
}

export const toKycRecord = (customer: AdminCustomer): KycRecord => {
  const metadata = customer.metadata || {}
  const fullName =
    metadata.kyc_full_name ||
    [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() ||
    customer.email ||
    customer.id

  return {
    customerId: customer.id,
    email: customer.email || "",
    name:
      [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() ||
      customer.email ||
      customer.id,
    status: (metadata.kyc_status || "none") as KycStatus,
    fullName,
    panNumber: metadata.kyc_pan_number || "",
    aadhaarNumber: metadata.kyc_aadhaar_number || "",
    dpName: metadata.kyc_dp_name || "",
    dematNumber: metadata.kyc_demat_number || "",
    panFileUrl: metadata.kyc_pan_file_url || "",
    cmrFileUrl: metadata.kyc_cmr_file_url || "",
    submittedAt: metadata.kyc_submitted_at || customer.created_at || "",
    reviewedAt: metadata.kyc_reviewed_at || "",
    reviewNotes: metadata.kyc_review_notes || "",
    rejectionReason: metadata.kyc_rejection_reason || "",
    metadata,
  }
}

export const getKycBadgeColor = (status: KycStatus) => {
  switch (status) {
    case "approved":
    case "verified":
      return "green"
    case "rejected":
      return "red"
    case "pending":
    case "submitted":
      return "orange"
    default:
      return "grey"
  }
}

export const getKycLabel = (status: KycStatus) => {
  if (!status || status === "none") {
    return "UNKNOWN"
  }

  if (status === "verified") {
    return "APPROVED"
  }

  return status.toUpperCase()
}

export const canApproveKyc = (status: KycStatus) => {
  return status !== "approved" && status !== "verified"
}

export const canRejectKyc = (status: KycStatus) => {
  return status !== "rejected"
}

export const updateCustomerKycStatus = async (
  customerId: string,
  metadata: Record<string, any>,
  status: "approved" | "rejected",
  reviewNotes?: string
) => {
  const now = new Date().toISOString()
  const nextMetadata: Record<string, any> = {
    ...(metadata || {}),
    kyc_status: status,
    kyc_review_notes: reviewNotes || "",
    kyc_reviewed_at: now,
  }

  if (status === "approved") {
    nextMetadata.kyc_approved_at = now
    nextMetadata.kyc_rejected_at = null
    nextMetadata.kyc_rejection_reason = null
  } else {
    nextMetadata.kyc_rejected_at = now
    nextMetadata.kyc_approved_at = null
    nextMetadata.kyc_rejection_reason = reviewNotes || "Rejected by admin"
  }

  const customerResponse = await fetch(`/admin/customers/${customerId}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      metadata: nextMetadata,
    }),
  })

  if (!customerResponse.ok) {
    const errorData = (await customerResponse.json().catch(() => ({}))) as {
      message?: string
    }
    throw new Error(errorData.message || "Failed to update customer metadata")
  }

  const response = await fetch(`/admin/customer-kyc/${customerId}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status,
      review_notes: reviewNotes || "",
    }),
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string
    }
    throw new Error(errorData.message || "Failed to update KYC status")
  }

  return response.json()
}
