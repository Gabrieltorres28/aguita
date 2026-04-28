"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Droplets, Users, Wallet, Package, TrendingUp, AlertCircle } from "lucide-react"
import { formatARS, formatFecha } from "@/lib/storage"
import type { DB } from "@/lib/types"

export function Dashboard({ db }: { db: DB }) {
  const totalClientes = db.clientes.length
  const totalDeuda = db.clientes.reduce(
    (sum, c) => sum + (c.saldo < 0 ? -c.saldo : 0),
    0,
  )
  const totalAFavor = db.clientes.reduce(
    (sum, c) => sum + (c.saldo > 0 ? c.saldo : 0),
    0,
  )
  const totalComodato = db.clientes.reduce((sum, c) => sum + c.envasesComodato, 0)

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const movsHoy = db.movimientos.filter((m) => new Date(m.fecha) >= hoy)
  const bidonesHoy = movsHoy.reduce((s, m) => s + m.bidonesEntregados, 0)
  const cobradoHoy = movsHoy.reduce((s, m) => s + m.pagoRecibido, 0)

  const clientesConDeuda = db.clientes
    .filter((c) => c.saldo < 0)
    .sort((a, b) => a.saldo - b.saldo)
    .slice(0, 5)

  const ultimosMovs = db.movimientos.slice(0, 5)

  const metricas = [
    {
      label: "Clientes",
      valor: totalClientes.toString(),
      icon: Users,
      tone: "text-foreground",
    },
    {
      label: "Deuda total",
      valor: formatARS(totalDeuda),
      icon: AlertCircle,
      tone: totalDeuda > 0 ? "text-destructive" : "text-foreground",
    },
    {
      label: "A favor",
      valor: formatARS(totalAFavor),
      icon: Wallet,
      tone: "text-emerald-600",
    },
    {
      label: "Envases en calle",
      valor: totalComodato.toString(),
      icon: Package,
      tone: "text-foreground",
    },
    {
      label: "Bidones hoy",
      valor: bidonesHoy.toString(),
      icon: Droplets,
      tone: "text-primary",
    },
    {
      label: "Cobrado hoy",
      valor: formatARS(cobradoHoy),
      icon: TrendingUp,
      tone: "text-emerald-600",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {metricas.map((m) => {
          const Icon = m.icon
          return (
            <Card key={m.label} className="border-border">
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {m.label}
                  </span>
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <span className={`text-xl font-bold leading-tight ${m.tone}`}>
                  {m.valor}
                </span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Clientes con mayor deuda</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-4 pt-0">
            {clientesConDeuda.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin deudas pendientes.
              </p>
            ) : (
              clientesConDeuda.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{c.nombre}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.telefono || "Sin teléfono"}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-destructive">
                    {formatARS(c.saldo)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Últimos movimientos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-4 pt-0">
            {ultimosMovs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin movimientos aún.
              </p>
            ) : (
              ultimosMovs.map((m) => {
                const cliente = db.clientes.find((c) => c.id === m.clienteId)
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {cliente?.nombre ?? "Cliente eliminado"}
                      </span>
                      <span className="text-xs capitalize text-muted-foreground">
                        {m.tipo} · {formatFecha(m.fecha)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      {m.bidonesEntregados > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {m.bidonesEntregados} bidón(es)
                        </span>
                      )}
                      {m.pagoRecibido > 0 && (
                        <span className="text-sm font-semibold text-emerald-600">
                          {formatARS(m.pagoRecibido)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
