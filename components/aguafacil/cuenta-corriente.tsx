"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Trash2, Phone, MapPin, MessageCircle, ShoppingCart, Wallet, FileText, Search } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Cliente, Movimiento } from "@/lib/types"
import { formatARS, formatFechaHora } from "@/lib/storage"
import { Label } from "@/components/ui/label"
import { crearMensajeDeuda, crearUrlWhatsApp } from "@/lib/whatsapp"
import type { TipoMovimiento } from "@/lib/types"

type Props = {
  clientes: Cliente[]
  movimientos: Movimiento[]
  clienteSeleccionadoId: string | null
  onSeleccionarCliente: (id: string) => void
  onVolver: () => void
  onEliminarMovimiento: (id: string) => void
  onIrRegistrar: (clienteId: string, tipo?: TipoMovimiento) => void
}

const tipoLabel: Record<Movimiento["tipo"], string> = {
  entrega: "Entrega",
  retiro: "Retiro de envases",
  pago: "Pago recibido",
  ajuste: "Ajuste",
}

const tipoColor: Record<Movimiento["tipo"], string> = {
  entrega: "bg-primary/10 text-primary",
  retiro: "bg-amber-100 text-amber-800",
  pago: "bg-emerald-100 text-emerald-700",
  ajuste: "bg-muted text-muted-foreground",
}

export function CuentaCorriente({
  clientes,
  movimientos,
  clienteSeleccionadoId,
  onSeleccionarCliente,
  onVolver,
  onEliminarMovimiento,
  onIrRegistrar,
}: Props) {
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [aviso, setAviso] = useState("")
  const [busquedaCliente, setBusquedaCliente] = useState("")

  const cliente = useMemo(
    () => clientes.find((c) => c.id === clienteSeleccionadoId) ?? null,
    [clientes, clienteSeleccionadoId],
  )

  const movs = useMemo(
    () =>
      movimientos
        .filter((m) => m.clienteId === clienteSeleccionadoId)
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
    [movimientos, clienteSeleccionadoId],
  )

  const ventas = movs.filter((m) => m.tipo === "entrega")
  const cobros = movs.filter((m) => m.tipo === "pago" || m.pagoRecibido > 0)
  const deudaActual = cliente && cliente.saldo < 0 ? -cliente.saldo : 0
  const clientesFiltrados = useMemo(() => {
    const q = busquedaCliente.toLowerCase().trim()
    if (!q) return clientes
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.telefono.toLowerCase().includes(q) ||
        c.direccion.toLowerCase().includes(q),
    )
  }, [clientes, busquedaCliente])

  const enviarDeuda = () => {
    if (!cliente) return
    const url = crearUrlWhatsApp(cliente.telefono, crearMensajeDeuda(cliente, movimientos))
    if (!url) {
      setAviso("El cliente no tiene un teléfono válido para WhatsApp.")
      setTimeout(() => setAviso(""), 2500)
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  if (!cliente) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuenta corriente</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 lg:max-w-xl">
          <Label>Seleccioná un cliente</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              placeholder="Buscar por nombre, teléfono o dirección..."
              className="h-11 pl-9"
            />
          </div>
          <Select
            value={clienteSeleccionadoId ?? ""}
            onValueChange={onSeleccionarCliente}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Elegir cliente..." />
            </SelectTrigger>
            <SelectContent>
              {clientesFiltrados.length === 0 ? (
                <div className="px-2 py-2 text-sm text-muted-foreground">
                  No hay clientes cargados.
                </div>
              ) : (
                clientesFiltrados.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-10 shrink-0"
          onClick={onVolver}
          aria-label="Volver"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold leading-tight">{cliente.nombre}</h2>
          <span className="text-xs text-muted-foreground">
            {cliente.activo ? "Cliente activo" : "Cliente inactivo"}
          </span>
        </div>
      </div>
      {aviso && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {aviso}
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {cliente.telefono && (
              <span className="flex items-center gap-2">
                <Phone className="size-3.5" />
                {cliente.telefono}
              </span>
            )}
            {cliente.direccion && (
              <span className="flex items-center gap-2">
                <MapPin className="size-3.5" />
                {cliente.direccion}
              </span>
            )}
            {cliente.observaciones && (
              <span className="flex items-start gap-2">
                <FileText className="mt-0.5 size-3.5" />
                {cliente.observaciones}
              </span>
            )}
            <span>
              Creado: {formatFechaHora(cliente.createdAt)} · Actualizado:{" "}
              {formatFechaHora(cliente.updatedAt)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
              <p className="text-xs text-muted-foreground">Deuda actual</p>
              <p
                className={`text-lg font-bold ${
                  cliente.saldo < 0
                    ? "text-destructive"
                    : cliente.saldo > 0
                      ? "text-emerald-600"
                      : "text-foreground"
                }`}
              >
                {formatARS(deudaActual)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {cliente.saldo < 0
                  ? "Debe"
                  : cliente.saldo > 0
                    ? "A favor"
                    : "Al día"}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
              <p className="text-xs text-muted-foreground">Envases en calle</p>
              <p className="text-lg font-bold">{cliente.envasesComodato}</p>
              <p className="text-[11px] text-muted-foreground">
                12L: {cliente.envasesComodato12} · 20L: {cliente.envasesComodato20}
              </p>
            </div>
          </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:w-fit">
            <Button
              size="lg"
              className="h-11 gap-2"
              onClick={() => onIrRegistrar(cliente.id, "entrega")}
            >
              <ShoppingCart className="size-4" />
              Registrar venta
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="h-11 gap-2"
              onClick={() => onIrRegistrar(cliente.id, "pago")}
            >
              <Wallet className="size-4" />
              Registrar cobro
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 gap-2"
              onClick={enviarDeuda}
            >
              <MessageCircle className="size-4" />
              Enviar deuda
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Historial de ventas ({ventas.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-4 pt-0">
            {ventas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas registradas.</p>
            ) : (
              ventas.slice(0, 8).map((m) => (
                <div key={m.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{formatARS(m.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFechaHora(m.fechaVenta ?? m.fecha)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-700">
                      Pago {formatARS(m.pagoRecibido)}
                    </span>
                  </div>
                  {m.productos?.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {m.productos.map((item) => `${item.cantidad} ${item.nombre}`).join(", ")}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Historial de cobros ({cobros.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-4 pt-0">
            {cobros.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin cobros registrados.</p>
            ) : (
              cobros.slice(0, 8).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-emerald-700">
                      {formatARS(m.pagoRecibido)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFechaHora(m.fechaCobro ?? m.fechaVenta ?? m.fecha)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Carga {formatFechaHora(m.fechaCarga ?? m.fecha)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Historial ({movs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-4 pt-0">
          {movs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin movimientos para este cliente.
            </p>
          ) : (
            movs.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-2 rounded-md border border-border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tipoColor[m.tipo]}`}
                    >
                      {tipoLabel[m.tipo]}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Venta: {formatFechaHora(m.fechaVenta ?? m.fecha)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Carga: {formatFechaHora(m.fechaCarga ?? m.fecha)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => setEliminandoId(m.id)}
                    aria-label="Eliminar movimiento"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  {m.bidonesEntregados > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unidades</span>
                      <span className="font-medium">
                        {m.bidonesEntregados}
                      </span>
                    </div>
                  )}
                  {m.envasesRetirados > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Envases ret.
                      </span>
                      <span className="font-medium">{m.envasesRetirados}</span>
                    </div>
                  )}
                  {(m.envasesEntregados12 > 0 || m.envasesEntregados20 > 0) && (
                    <div className="col-span-2 flex justify-between">
                      <span className="text-muted-foreground">Entregados</span>
                      <span className="font-medium">
                        12L: {m.envasesEntregados12} · 20L: {m.envasesEntregados20}
                      </span>
                    </div>
                  )}
                  {(m.envasesRetirados12 > 0 || m.envasesRetirados20 > 0) && (
                    <div className="col-span-2 flex justify-between">
                      <span className="text-muted-foreground">Retirados</span>
                      <span className="font-medium">
                        12L: {m.envasesRetirados12} · 20L: {m.envasesRetirados20}
                      </span>
                    </div>
                  )}
                  {m.total > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-medium">
                        {formatARS(m.total)}
                      </span>
                    </div>
                  )}
                  {m.pagoRecibido !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pago</span>
                      <span className="font-medium text-emerald-700">
                        {formatARS(m.pagoRecibido)}
                      </span>
                    </div>
                  )}
                  {m.metodoPago && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Método</span>
                      <span className="font-medium capitalize">{m.metodoPago}</span>
                    </div>
                  )}
                  <div className="col-span-2 flex justify-between border-t border-border pt-1">
                    <span className="text-muted-foreground">
                      Saldo resultante
                    </span>
                    <span
                      className={`font-semibold ${
                        m.saldoResultante < 0
                          ? "text-destructive"
                          : m.saldoResultante > 0
                            ? "text-emerald-600"
                            : ""
                      }`}
                    >
                      {formatARS(m.saldoResultante)}
                    </span>
                  </div>
                </div>

                {m.productos?.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {m.productos
                      .map((item) => `${item.cantidad} ${item.nombre}`)
                      .join(", ")}
                  </p>
                )}

                {m.observacion && (
                  <p className="border-t border-border pt-2 text-xs text-muted-foreground">
                    {m.observacion}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={eliminandoId !== null}
        onOpenChange={(open) => !open && setEliminandoId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              El saldo y los envases en comodato del cliente se ajustarán
              automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (eliminandoId) onEliminarMovimiento(eliminandoId)
                setEliminandoId(null)
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
