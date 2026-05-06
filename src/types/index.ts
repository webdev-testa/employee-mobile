import type { Database } from './database'

export type UserRole = 'admin' | 'superadmin' | 'employee'

export type AttendanceStatus = 'ontime' | 'late' | 'absent'

export type KasbonStatus = 'pending' | 'approved' | 'deducted'

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

export interface Employee extends Omit<User, 'status' | 'role'> {
  email: string
  jabatan: string
  role: 'admin' | 'employee'
  phone: string
  shift: string
  address: string
  joined: string
  status: UserStatus
  absen?: number
  kasbon_used?: number
  last_slip?: string
}

export interface EmployeeFormData {
  name: string
  emp_id: string
  email: string
  password?: string
  phone: string
  address: string
  dept: string
  jabatan: string
  role: 'admin' | 'employee'
  salary: string | number
  shift: string
  kasbon_limit: string | number
  status: UserStatus
  joined: string
}