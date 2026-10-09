import type { Database } from './database'

export type UserRole = 'admin' | 'superadmin' | 'employee'

export type AttendanceStatus = 'ontime' | 'late' | 'absent'

export type KasbonStatus = 'pending' | 'approved' | 'deducted' | 'rejected'

export type PayrollStatus = 'pending' | 'paid'

export type UserStatus = 'active' | 'inactive'

type HrSchema = Database['hr']['Tables']

export type User = Omit<HrSchema['users']['Row'], 'role' | 'status'> & {
  role: UserRole
  status: UserStatus
}

export type Attendance = Omit<HrSchema['attendance']['Row'], 'status'> & {
  status: AttendanceStatus
}

export type Kasbon = Omit<HrSchema['kasbon']['Row'], 'status'> & {
  status: KasbonStatus
}

export type Payroll = Omit<HrSchema['payroll']['Row'], 'status'> & {
  status: PayrollStatus
}