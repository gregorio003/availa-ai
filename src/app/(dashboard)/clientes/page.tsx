'use client'

import { useState } from 'react'
import { Search, Phone, Calendar, MessageCircle } from 'lucide-react'

const mockCustomers = [
  { id: '1', name: 'Carlos Silva', phone: '(11) 99999-0001', appointments: 8, lastAppointment: '12/05/2026', totalSpent: 'R$ 480' },
  { id: '2', name: 'Maria Oliveira', phone: '(11) 99999-0002', appointments: 5, lastAppointment: '10/05/2026', totalSpent: 'R$ 200' },
  { id: '3', name: 'João Pereira', phone: '(11) 99999-0003', appointments: 12, lastAppointment: '14/05/2026', totalSpent: 'R$ 1.200' },
  { id: '4', name: 'Ana Costa', phone: '(11) 99999-0004', appointments: 3, lastAppointment: '08/05/2026', totalSpent: 'R$ 300' },
  { id: '5', name: 'Pedro Santos', phone: '(11) 99999-0005', appointments: 6, lastAppointment: '15/05/2026', totalSpent: 'R$ 360' },
  { id: '6', name: 'Fernanda Lima', phone: '(11) 99999-0006', appointments: 2, lastAppointment: '01/05/2026', totalSpent: 'R$ 120' },
]

export default function ClientesPage() {
  const [search, setSearch] = useState('')

  const filtered = mockCustomers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500">{mockCustomers.length} clientes cadastrados</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Cliente</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Telefone</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Agendamentos</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Último atendimento</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Total gasto</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(customer => (
              <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-semibold text-green-700">
                      {customer.name[0]}
                    </div>
                    <span className="font-medium text-gray-900">{customer.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.phone}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-900">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {customer.appointments}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.lastAppointment}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{customer.totalSpent}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="Ver conversas">
                      <MessageCircle className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="WhatsApp">
                      <Phone className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
