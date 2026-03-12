'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Search } from 'lucide-react'

type UserRow = {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
}

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  SUPERADMIN: { label: 'Super Admin', className: 'bg-red-100 text-red-700 border-red-200' },
  ADMIN: { label: 'Instructor', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  STUDENT: { label: 'Estudiante', className: 'bg-blue-100 text-blue-700 border-blue-200' },
}

export function UserTable({
  users: initialUsers,
  currentUserId,
}: {
  users: UserRow[]
  currentUserId: string
}) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId)
    try {
      const res = await fetch('/api/admin/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole }),
        credentials: 'include',
      })
      if (res.ok) {
        const { user } = (await res.json()) as { user: UserRow }
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: user.role } : u)))
        toast.success(`Rol actualizado a ${ROLE_CONFIG[user.role]?.label || user.role}`)
      } else {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error || 'Error al actualizar rol')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Registrado</TableHead>
              <TableHead className="w-[180px]">Cambiar rol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => {
                const config = ROLE_CONFIG[user.role] || ROLE_CONFIG.STUDENT
                const isCurrentUser = user.id === currentUserId
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name || 'Sin nombre'}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-gray-400">(tú)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={config.className}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(user.createdAt).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(val) => handleRoleChange(user.id, val)}
                        disabled={isCurrentUser || updating === user.id}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STUDENT">Estudiante</SelectItem>
                          <SelectItem value="ADMIN">Instructor</SelectItem>
                          <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-gray-400">
        {filtered.length} usuario{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
