export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER'

export interface User {
  id: string
  company_id: string | null
  name: string
  email: string
  phone: string | null
  role: UserRole
  status: 'ACTIVE' | 'INACTIVE'
  must_change_password: boolean
}

// Outcome of a welcome or reset email; the temporary password is present only
// when the email was not delivered (T28).
export interface CredentialDelivery {
  email_sent: boolean
  temporary_password?: string
}

export interface Company {
  id: string
  name: string
  email?: string | null
  contact?: string | null
  address?: string | null
  status: 'ACTIVE' | 'SUSPENDED'
}

export interface CompanyList {
  items: Company[]
  page: number
  page_size: number
  total: number
}

export interface CompanyOnboarded {
  company: Company
  admin: User
  delivery: CredentialDelivery
}

export interface UserList {
  items: User[]
  page: number
  page_size: number
  total: number
}

export interface Customer {
  id: string
  company_id: string
  name: string
  /** Mobile number; unique per company by digits (T33). */
  contact: string
  email: string | null
  address: string | null
}

export interface CustomerList {
  items: Customer[]
  page: number
  page_size: number
  total: number
}

export interface StaffRole {
  id: string
  company_id: string
  name: string
  is_system: boolean
}

export interface Staff {
  id: string
  company_id: string
  name: string
  contact: string
  email: string | null
  specialization: string | null
  status: 'ACTIVE' | 'INACTIVE'
  role_ids: string[]
}

export interface ListResponse<T> {
  items: T[]
  page: number
  page_size: number
  total: number
}

export interface ServiceProfile {
  id: string
  company_id: string
  name: string
  prefix: string
  is_active: boolean
  next_number: number
  out_store_enabled: boolean
  sent_status_id: string | null
  received_status_id: string | null
  core_labels: Record<string, string>
}

export interface ServiceRecordProfileOption {
  id: string
  name: string
  prefix: string
  is_active: boolean
}

export interface ProfileStatus {
  id: string
  company_id: string
  profile_id: string
  name: string
  sort_order: number
  initial: boolean
  closed: boolean
  enabled: boolean
}

export interface ProfileField {
  id: string
  company_id: string
  profile_id: string
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'choice' | 'checkbox' | 'linked_product' | 'linked_charges' | 'staff_role'
  required: boolean
  enabled: boolean
  sort_order: number
  config: Record<string, unknown>
  is_system: boolean
}

export interface FormDefinition {
  id: string
  name: string
  prefix: string
  core_fields: { key: string; label: string; read_only: boolean }[]
  fields: ProfileField[]
  statuses: ProfileStatus[]
  staff_roles: { id: string; name: string; is_system: boolean }[]
}

export interface ServiceRequest {
  id: string
  company_id: string
  profile_id: string
  request_no: string
  service_date: string
  customer_id: string
  status_id: string
  status_name?: string
  customer_name?: string
  profile_name?: string
  // Records list display values (T34).
  closed?: boolean
  customer_contact?: string
  created_by_name?: string | null
  out_store_status?: 'SENT' | 'RECEIVED_BACK' | null
  out_store_due_date?: string | null
  form_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ServiceRequestDetail extends ServiceRequest {
  form_definition: FormDefinition
  customer: Customer
  linked_values: Record<string, { id: string; label: string; selectable: boolean }[]>
}

export interface RequestHistory {
  id: string
  company_id: string
  request_id: string
  field_key: string
  old_value: unknown
  new_value: unknown
  changed_by: string
  /** Null only when the user no longer exists. */
  changed_by_name: string | null
  created_at: string
}

/** new_value (and, for "changed", old_value without event) of a core.out_store history row. */
export interface HistoryOutStoreValue {
  event?: 'sent' | 'changed' | 'received'
  entry_id: string
  shop_id: string
  shop_name: string
  sent_date: string
  due_date: string | null
  price: string | null
  remarks: string | null
  received_back_at: string | null
}

/** new_value of a core.standby history row; days_out is set on return. */
export interface HistoryStandbyValue {
  event: 'issued' | 'returned'
  issue_id: string
  standby_item_id: string
  item_name: string
  serial_no: string | null
  customer_name: string
  customer_contact: string
  issued_date: string
  due_date: string | null
  returned_at: string | null
  days_out: number | null
}

export interface DashboardStatusCount {
  status_id: string
  status_name: string
  count: number
}

export interface DashboardRecentRecord {
  id: string
  request_no: string
  service_date: string
  updated_at: string
  customer_name: string
  customer_contact: string
  profile_name: string
  status_name: string
  closed: boolean
}

export interface DashboardSummary {
  scope: 'platform' | 'company'
  companies?: { total: number; active: number; suspended: number }
  metrics?: { service_records: number; open_records: number; closed_records: number; customers: number; out_store_sent: number; standby_available: number; standby_issued: number }
  features?: { out_store_enabled: boolean }
  records_by_status?: DashboardStatusCount[]
  recent_records?: DashboardRecentRecord[]
}

export interface Product {
  id: string
  company_id: string
  profile_id: string
  name: string
  brand: string | null
  category: string | null
  status: 'ACTIVE' | 'DISCONTINUED'
}

export interface Charge {
  id: string
  company_id: string
  profile_id: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
}

export interface OutStoreShop {
  id: string
  company_id: string
  profile_id: string | null
  shop_name: string
  contact_person: string | null
  contact: string | null
  address: string | null
  status: 'ACTIVE' | 'INACTIVE'
}

export interface OutStoreEntry {
  id: string
  company_id: string
  service_request_id: string
  shop_id: string
  sent_date: string
  due_date: string | null
  price: string | null
  remarks: string | null
  status: 'SENT' | 'RECEIVED_BACK'
  received_back_at: string | null
  // Present on list and detail responses (T38); create/edit responses omit them.
  request_no?: string
  profile_id?: string
  profile_name?: string
  customer_id?: string
  customer_name?: string
  customer_contact?: string
  shop_name?: string
  shop_contact?: string | null
  overdue?: boolean
}

export interface StandbyItem {
  id: string
  company_id: string
  name: string
  serial_no: string | null
  category: string | null
  price: string | null
  status: 'AVAILABLE' | 'ISSUED' | 'UNDER_MAINTENANCE'
}

export interface StandbyIssue {
  id: string
  company_id: string
  standby_item_id: string
  customer_id: string
  service_request_id: string | null
  issued_date: string
  due_date: string | null
  returned_at: string | null
  notes: string | null
  received_product_id: string | null
  /** Null for issues recorded before who-lent tracking (T36). */
  issued_by: string | null
  returned_by: string | null
}

/** A stand-by issue with names; days_out counts to today while the item is out. */
export interface StandbyIssueHistory extends StandbyIssue {
  item_name: string
  serial_no: string | null
  customer_name: string
  customer_contact: string
  request_no: string | null
  issued_by_name: string | null
  returned_by_name: string | null
  days_out: number
  overdue: boolean
}

export interface StandbyResult {
  item: StandbyItem
  issue: StandbyIssue
}

export interface Identity {
  user: User
  company: Company | null
}

export interface LoginResponse extends Identity {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
}

export interface APIErrorPayload {
  error?: {
    code?: string
    message?: string
    fields?: Record<string, string>
  }
}

// Counts for the Records filter chips (T34).
export interface ServiceRequestFacets {
  statuses: { status_name: string; closed: boolean; count: number }[]
  open: number
  closed: number
  creators: { id: string; name: string; count: number }[]
}

