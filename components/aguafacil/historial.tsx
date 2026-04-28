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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search } from "lucide-react"
import type { Cliente, Movimiento, TipoMovimiento } from "@/lib/types"
import { formatARS, formatFechaHora } from "@/lib/storage"

type Rango = "todos" | "hoy" | "semana" | "mes" | "custom"

const tipoLabel: Record<TipoMovimiento, string> = {
  entrega: "Entrega",
  retiro: "Retiro",
  pago: "Pago",
  ajuste: "Ajuste",
}

const tipoColor: Record<TipoMovimiento, string> = {
  entrega: "bg-primary/10 text-primary",
  retiro: "bg-amber-100 text-amber-800",
  pago: "bg-emerald-100 text-emerald-700",
  ajuste: "bg-muted text-muted-foreground",
}

export function Historial({
  clientes,
  movimientos,
}: {
  clientes: Cliente[]
  movimientos: Movimiento[]
}) {
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [rango, setRango] = useState<Rango>("todos")
  const [desde, setDesde] = useState(() => toInputDate(new Date()))
  const [hasta, setHasta] = useState(() => toInputDate(new Date()))
  const [busqueda, setBusqueda] = useState("")

  const clienteById = useMemo(() => {
    const map = new Map<string, Cliente>()
    clientes.forEach((c) => map.set(c.id, c))
    return map
  }, [clientes])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    const rangoFechas = getDateRange(rango, desde, hasta)
    return movimientos
      .filter((m) => (filtroTipo === "todos" ? true : m.tipo === filtroTipo))
      .filter((m) => {
        if (!rangoFechas) return true
        const fechaBase = m.tipo === "pago" && m.fechaCobro ? m.fechaCobro : m.fechaVenta ?? m.fecha
        return inRange(fechaBase, rangoFechas.start, rangoFechas.end)
      })
      .filter((m) => {
        if (!q) return true
        const c = clienteById.get(m.clienteId)
        return (
          c?.nombre.toLowerCase().includes(q) ||
          m.observacion.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => ((a.fechaVenta ?? a.fecha) < (b.fechaVenta ?? b.fecha) ? 1 : -1))
  }, [movimientos, filtroTipo, rango, desde, hasta, busqueda, clienteById])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Historial general ({filtrados.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4 pt-0">
        <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_180px_190px_160px_160px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente u observación..."
              className="h-11 pl-9"
            />
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="entrega">Entregas</SelectItem>
              <SelectItem value="retiro">Retiros</SelectItem>
              <SelectItem value="pago">Pagos</SelectItem>
              <SelectItem value="ajuste">Ajustes</SelectItem>
            </SelectContent>
          </Select>
          <Select value={rango} onValueChange={(value) => setRango(value as Rango)}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las fechas</SelectItem>
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
            className="h-11"
          />
          <Input
            type="date"
            value={hasta}
            disabled={rango !== "custom"}
            onChange={(e) => setHasta(e.target.value)}
            className="h-11"
          />
        </div>

        {filtrados.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay movimientos que coincidan.
          </p>
        ) : (
          <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha real</TableHead>
                  <TableHead>Fecha carga</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((m) => {
                  const cliente = clienteById.get(m.clienteId)
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{formatFechaHora(m.fechaVenta ?? m.fecha)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatFechaHora(m.fechaCarga ?? m.fecha)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {cliente?.nombre ?? "Cliente eliminado"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tipoColor[m.tipo]}`}
                        >
                          {tipoLabel[m.tipo]}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                        {m.productos?.length
                          ? m.productos.map((item) => `${item.cantidad} ${item.nombre}`).join(", ")
                          : m.bidonesEntregados > 0
                            ? `${m.bidonesEntregados} bidón(es)`
                            : "-"}
                      </TableCell>
                      <TableCell className="text-right">{m.total > 0 ? formatARS(m.total) : "-"}</TableCell>
                      <TableCell className="text-right text-emerald-700">
                        {m.pagoRecibido > 0 ? formatARS(m.pagoRecibido) : "-"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-2 lg:hidden">
            {filtrados.map((m) => {
              const cliente = clienteById.get(m.clienteId)
              return (
                <div
                  key={m.id}
                  className="flex flex-col gap-1 rounded-md border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {cliente?.nombre ?? "Cliente eliminado"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Venta: {formatFechaHora(m.fechaVenta ?? m.fecha)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Carga: {formatFechaHora(m.fechaCarga ?? m.fecha)}
                      </span>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tipoColor[m.tipo]}`}
                    >
                      {tipoLabel[m.tipo]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 text-xs">
                    {m.bidonesEntregados > 0 && (
                      <span>
                        <span className="text-muted-foreground">Unidades: </span>
                        <span className="font-medium">
                          {m.bidonesEntregados}
                        </span>
                      </span>
                    )}
                    {m.envasesRetirados > 0 && (
                      <span>
                        <span className="text-muted-foreground">
                          Retirados:{" "}
                        </span>
                        <span className="font-medium">
                          {m.envasesRetirados}
                        </span>
                      </span>
                    )}
                    {m.total > 0 && (
                      <span>
                        <span className="text-muted-foreground">Total: </span>
                        <span className="font-medium">{formatARS(m.total)}</span>
                      </span>
                    )}
                    {m.pagoRecibido > 0 && (
                      <span>
                        <span className="text-muted-foreground">Pago: </span>
                        <span className="font-medium text-emerald-700">
                          {formatARS(m.pagoRecibido)}
                        </span>
                      </span>
                    )}
                  </div>
                  {m.productos?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {m.productos
                        .map((item) => `${item.cantidad} ${item.nombre}`)
                        .join(", ")}
                    </p>
                  )}
                  {m.observacion && (
                    <p className="text-xs text-muted-foreground">
                      {m.observacion}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function getDateRange(rango: Rango, desde: string, hasta: string) {
  if (rango === "todos") return null
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
