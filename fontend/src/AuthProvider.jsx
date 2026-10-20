import { useMemo, useState } from 'react'
import { AuthContext } from './auth-context'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const value = useMemo(() => ({ user, setUser }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
