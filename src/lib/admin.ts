import { supabase } from './supabase'
import type { UserRole } from './supabase'

const MIN_PASSWORD_LENGTH = 6

export interface CreateUserPayload {
  email: string
  password: string
  full_name: string
  role: UserRole
}

export interface AdminUserResponse {
  user: {
    id: string
    email: string
    full_name: string
    role: UserRole
  }
}

async function invokeAdminFunction<T>(name: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })

  if (error) {
    throw new Error(error.message || 'فشل الاتصال بالخادم')
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error))
  }

  return data as T
}

export function validatePassword(password: string, confirmPassword: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`
  }
  if (password !== confirmPassword) {
    return 'كلمتا المرور غير متطابقتين'
  }
  return null
}

export async function createUser(payload: CreateUserPayload): Promise<AdminUserResponse> {
  return invokeAdminFunction<AdminUserResponse>('admin-create-user', payload)
}

export async function resetUserPassword(userId: string, password: string): Promise<void> {
  await invokeAdminFunction<{ success: boolean }>('admin-reset-password', {
    user_id: userId,
    password,
  })
}
