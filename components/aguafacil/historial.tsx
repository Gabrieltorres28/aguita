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
import { Search } from "lucide-react"
import type { Cliente, Movimiento, TipoMovimiento } from "@/lib/types"
import { formatARS, formatFechaHora } from "@/lib/storage"

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
  const [busqueda, setBusqueda] = useState("")

  const clienteById = useMemo(() => {
    const map = new Map<string, Cliente>()
    clientes.forEach((c) => map.set(c.id, c))
    return map
  }, [clientes])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return movimientos
      .filter((m) => (filtroTipo === "todos" ? true : m.tipo === filtroTipo))
      .filter((m) => {
        if (!q) return true
        const c = clienteById.get(m.clienteId)
        return (
          c?.nombre.toLowerCase().includes(q) ||
          m.observacion.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
  }, [movimientos, filtroTipo, busqueda, clienteById])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Historial general ({filtrados.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4 pt-0">
        <div className="flex flex-col gap-2 sm:flex-row">
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
            <SelectTrigger className="h-11 sm:w-44">
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
        </div>

        {filtrados.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay movimientos que coincidan.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
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
                        {formatFechaHora(m.fecha)}
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
                        <span className="text-muted-foreground">Bidones: </span>
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
                  {m.observacion && (
                    <p className="text-xs text-muted-foreground">
                      {m.observacion}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
