"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Droplets, Users, Wallet, Package, TrendingUp, AlertCircle } from "lucide-react"
import { formatARS, formatFecha } from "@/lib/storage"
import type { DB } from "@/lib/types"

type Rango = "hoy" | "semana" | "mes" | "custom"

export function Dashboard({ db }: { db: DB }) {
  const [rango, setRango] = useState<Rango>("hoy")
  const [desde, setDesde] = useState(() => toInputDate(new Date()))
  const [hasta, setHasta] = useState(() => toInputDate(new Date()))

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

  const rangoFechas = useMemo(
    () => getDateRange(rango, desde, hasta),
    [rango, desde, hasta],
  )
  const movsPeriodo = db.movimientos.filter((m) =>
    inRange(m.fechaVenta ?? m.fecha, rangoFechas.start, rangoFechas.end),
  )
  const cobrosPeriodo = db.movimientos.filter(
    (m) => m.fechaCobro && inRange(m.fechaCobro, rangoFechas.start, rangoFechas.end),
  )
  const unidadesPeriodo = movsPeriodo.reduce((s, m) => s + m.bidonesEntregados, 0)
  const vendidoPeriodo = movsPeriodo.reduce((s, m) => s + m.total, 0)
  const cobradoPeriodo = cobrosPeriodo.reduce((s, m) => s + m.pagoRecibido, 0)
  const stockTotal = db.productos
    .filter((producto) => producto.activo)
    .reduce((sum, producto) => sum + producto.stockActual, 0)

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
      label: "Unidades vendidas",
      valor: unidadesPeriodo.toString(),
      icon: Droplets,
      tone: "text-primary",
    },
    {
      label: "Cobrado periodo",
      valor: formatARS(cobradoPeriodo),
      icon: TrendingUp,
      tone: "text-emerald-600",
    },
    {
      label: "Stock activo",
      valor: stockTotal.toString(),
      icon: Package,
      tone: "text-foreground",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Ventas por fecha real de venta y cobros por fecha real de cobro.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:w-[560px]">
          <Select value={rango} onValueChange={(value) => setRango(value as Rango)}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="custom">Rango personalizado</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={desde}
            disabled={rango !== "custom"}
            onChange={(e) => setDesde(e.target.value)}
            className="h-10"
          />
          <Input
            type="date"
            value={hasta}
            disabled={rango !== "custom"}
            onChange={(e) => setHasta(e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
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
            <CardTitle className="text-base">Ventas del periodo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-4 pt-0">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Facturado</span>
              <span className="font-semibold">{formatARS(vendidoPeriodo)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Movimientos de venta</span>
              <span className="font-semibold">
                {movsPeriodo.filter((m) => m.tipo === "entrega").length}
              </span>
            </div>
          </CardContent>
        </Card>

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

function getDateRange(rango: Rango, desde: string, hasta: string) {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  if (rango === "semana") {
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
  } else if (rango === "mes") {
    start.setDate(1)
  } else if (rango === "custom") {
    return {
      start: startOfInputDate(desde),
      end: endOfInputDate(hasta),
    }
  }

  return { start, end }
}

function inRange(iso: string, start: Date, end: Date) {
  const date = new Date(iso)
  return date >= start && date <= end
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfInputDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? new Date(0) : date
}

function endOfInputDate(value: string) {
  const date = new Date(`${value}T23:59:59`)
  return Number.isNaN(date.getTime()) ? new Date() : date
}
