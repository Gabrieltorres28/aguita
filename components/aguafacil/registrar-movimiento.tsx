"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatARS } from "@/lib/storage"
import type { Cliente, Producto, TipoMovimiento } from "@/lib/types"
import { Droplets, ArrowLeftRight, Wallet, CheckCircle2, Plus, Trash2 } from "lucide-react"

type Props = {
  clientes: Cliente[]
  productos: Producto[]
  precioBidon: number
  clienteSeleccionadoId?: string
  tipoInicial?: TipoMovimiento
  onRegistrar: (input: {
    clienteId: string
    tipo: TipoMovimiento
    productos?: { productoId: string; cantidad: number; precioUnitario: number }[]
    bidonesEntregados: number
    envasesRetirados: number
    precioUnitario: number
    pagoRecibido: number
    observacion: string
    fechaVenta?: string
    fechaCobro?: string
  }) => void
}

export function RegistrarMovimiento({
  clientes,
  productos,
  precioBidon,
  clienteSeleccionadoId,
  tipoInicial,
  onRegistrar,
}: Props) {
  const [tipo, setTipo] = useState<TipoMovimiento>("entrega")
  const [clienteId, setClienteId] = useState<string>(clienteSeleccionadoId ?? "")
  const [lineas, setLineas] = useState<
    { id: string; productoId: string; cantidad: number; precioUnitario: number }[]
  >([])
  const [envasesRetirados, setEnvasesRetirados] = useState<number>(0)
  const [precio, setPrecio] = useState<number>(precioBidon)
  const [pago, setPago] = useState<number>(0)
  const [observacion, setObservacion] = useState<string>("")
  const [fechaVenta, setFechaVenta] = useState<string>(() => toInputDate(new Date()))
  const [fechaCobro, setFechaCobro] = useState<string>("")
  const [okMsg, setOkMsg] = useState<string>("")

  useEffect(() => {
    setPrecio(precioBidon)
  }, [precioBidon])

  useEffect(() => {
    if (clienteSeleccionadoId) setClienteId(clienteSeleccionadoId)
  }, [clienteSeleccionadoId])

  useEffect(() => {
    if (tipoInicial) setTipo(tipoInicial)
  }, [tipoInicial])

  const cliente = useMemo(
    () => clientes.find((c) => c.id === clienteId) ?? null,
    [clientes, clienteId],
  )
  const clientesActivos = useMemo(
    () => clientes.filter((c) => c.activo || c.id === clienteId),
    [clientes, clienteId],
  )

  const productosActivos = useMemo(
    () => productos.filter((producto) => producto.activo),
    [productos],
  )

  useEffect(() => {
    if (lineas.length === 0 && productosActivos.length > 0) {
      const producto = productosActivos[0]
      setLineas([
        {
          id: crypto.randomUUID(),
          productoId: producto.id,
          cantidad: 1,
          precioUnitario: producto.precioVenta,
        },
      ])
    }
  }, [lineas.length, productosActivos])

  const total =
    tipo === "entrega"
      ? lineas.reduce((sum, linea) => sum + linea.cantidad * linea.precioUnitario, 0)
      : 0
  const unidadesEntregadas =
    tipo === "entrega"
      ? lineas.reduce((sum, linea) => {
          const producto = productos.find((item) => item.id === linea.productoId)
          return sum + (producto && esEnvase(producto) ? linea.cantidad : 0)
        }, 0)
      : 0
  const deudaActual = cliente && cliente.saldo < 0 ? -cliente.saldo : 0

  const reset = () => {
    const producto = productosActivos[0]
    setLineas(
      producto
        ? [
            {
              id: crypto.randomUUID(),
              productoId: producto.id,
              cantidad: 1,
              precioUnitario: producto.precioVenta,
            },
          ]
        : [],
    )
    setEnvasesRetirados(0)
    setPago(0)
    setObservacion("")
    setFechaVenta(toInputDate(new Date()))
    setFechaCobro("")
  }

  const previewSaldo = useMemo(() => {
    if (!cliente) return 0
    let delta = 0
    if (tipo === "entrega") delta = pago - total
    else if (tipo === "pago") delta = pago
    else if (tipo === "ajuste") delta = pago
    return cliente.saldo + delta
  }, [cliente, tipo, total, pago])

  const previewComodato = useMemo(() => {
    if (!cliente) return 0
    return cliente.envasesComodato + unidadesEntregadas - envasesRetirados
  }, [cliente, unidadesEntregadas, envasesRetirados])

  const handleSubmit = () => {
    if (!clienteId) return
    if (tipo === "entrega" && lineas.length === 0) return
    onRegistrar({
      clienteId,
      tipo,
      productos:
        tipo === "entrega"
          ? lineas.map((linea) => ({
              productoId: linea.productoId,
              cantidad: linea.cantidad,
              precioUnitario: linea.precioUnitario,
            }))
          : [],
      bidonesEntregados: tipo === "entrega" ? unidadesEntregadas : 0,
      envasesRetirados: tipo === "retiro" || tipo === "entrega" ? envasesRetirados : 0,
      precioUnitario: tipo === "entrega" ? precio : 0,
      pagoRecibido: tipo === "retiro" ? 0 : pago,
      observacion,
      fechaVenta: fromInputDate(fechaVenta),
      fechaCobro:
        fechaCobro || tipo === "pago" || (tipo === "entrega" && pago >= total)
          ? fromInputDate(fechaCobro || fechaVenta)
          : undefined,
    })
    setOkMsg("Movimiento registrado correctamente.")
    reset()
    setTimeout(() => setOkMsg(""), 2500)
  }

  const tipoOptions: { value: TipoMovimiento; label: string; icon: typeof Droplets }[] = [
    { value: "entrega", label: "Entrega", icon: Droplets },
    { value: "retiro", label: "Retiro", icon: ArrowLeftRight },
    { value: "pago", label: "Pago", icon: Wallet },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Registrar movimiento</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="flex flex-col gap-4">
        <Tabs
          value={tipo}
          onValueChange={(v) => setTipo(v as TipoMovimiento)}
          className="w-full"
        >
          <TabsList className="grid h-12 w-full grid-cols-3">
            {tipoOptions.map((opt) => {
              const Icon = opt.icon
              return (
                <TabsTrigger
                  key={opt.value}
                  value={opt.value}
                  className="h-10 gap-1.5 text-sm"
                >
                  <Icon className="size-4" />
                  {opt.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cliente">Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger id="cliente" className="h-11">
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clientes.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-muted-foreground">
                    No hay clientes cargados.
                  </div>
                ) : (
                clientesActivos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fecha-venta">Fecha de venta</Label>
              <Input
                id="fecha-venta"
                type="date"
                value={fechaVenta}
                onChange={(e) => setFechaVenta(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fecha-cobro">Fecha de cobro</Label>
              <Input
                id="fecha-cobro"
                type="date"
                value={fechaCobro}
                onChange={(e) => setFechaCobro(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        </div>

        {cliente && (
          <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/40 p-3">
            <div>
              <p className="text-[11px] text-muted-foreground">Saldo actual</p>
              <p
                className={`text-sm font-semibold ${
                  cliente.saldo < 0
                    ? "text-destructive"
                    : cliente.saldo > 0
                      ? "text-emerald-600"
                      : ""
                }`}
              >
                {formatARS(cliente.saldo)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">En comodato</p>
              <p className="text-sm font-semibold">
                {cliente.envasesComodato} envase(s)
              </p>
            </div>
          </div>
        )}

        {tipo === "entrega" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Productos vendidos</Label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 gap-2"
                disabled={productosActivos.length === 0}
                onClick={() => {
                  const producto = productosActivos[0]
                  if (!producto) return
                  setLineas((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      productoId: producto.id,
                      cantidad: 1,
                      precioUnitario: producto.precioVenta,
                    },
                  ])
                }}
              >
                <Plus className="size-4" />
                Agregar
              </Button>
            </div>

            {productosActivos.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                No hay productos activos. Cargá productos en Stock para registrar ventas.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {lineas.map((linea) => {
                  const producto = productos.find((item) => item.id === linea.productoId)
                  return (
                    <div
                      key={linea.id}
                      className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-[minmax(180px,1fr)_90px_120px_36px]"
                    >
                      <div className="flex flex-col gap-1.5">
                        <Label>Producto</Label>
                        <Select
                          value={linea.productoId}
                          onValueChange={(productoId) => {
                            const seleccionado = productos.find((item) => item.id === productoId)
                            setLineas((prev) =>
                              prev.map((item) =>
                                item.id === linea.id
                                  ? {
                                      ...item,
                                      productoId,
                                      precioUnitario:
                                        seleccionado?.precioVenta ?? item.precioUnitario,
                                    }
                                  : item,
                              ),
                            )
                          }}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {productosActivos.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.nombre} · stock {item.stockActual}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-[11px] text-muted-foreground">
                          {producto?.categoria ?? "Sin categoría"} · disponible {producto?.stockActual ?? 0}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={linea.cantidad}
                          onChange={(e) =>
                            setLineas((prev) =>
                              prev.map((item) =>
                                item.id === linea.id
                                  ? { ...item, cantidad: Number(e.target.value) || 0 }
                                  : item,
                              ),
                            )
                          }
                          className="h-11"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Precio</Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={linea.precioUnitario}
                          onChange={(e) =>
                            setLineas((prev) =>
                              prev.map((item) =>
                                item.id === linea.id
                                  ? { ...item, precioUnitario: Number(e.target.value) || 0 }
                                  : item,
                              ),
                            )
                          }
                          className="h-11"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-10 text-destructive hover:text-destructive"
                          onClick={() =>
                            setLineas((prev) => prev.filter((item) => item.id !== linea.id))
                          }
                          aria-label="Quitar producto"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="retirados">Envases retirados</Label>
              <Input
                id="retirados"
                type="number"
                inputMode="numeric"
                min={0}
                value={envasesRetirados}
                onChange={(e) =>
                  setEnvasesRetirados(Number(e.target.value) || 0)
                }
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pago">Pago recibido</Label>
              <Input
                id="pago"
                type="number"
                inputMode="numeric"
                min={0}
                value={pago}
                onChange={(e) => setPago(Number(e.target.value) || 0)}
                className="h-11"
              />
            </div>
          </div>
          </div>
        )}

        {tipo === "retiro" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="retirados-only">Envases retirados</Label>
            <Input
              id="retirados-only"
              type="number"
              inputMode="numeric"
              min={0}
              value={envasesRetirados}
              onChange={(e) => setEnvasesRetirados(Number(e.target.value) || 0)}
              className="h-11"
            />
          </div>
        )}

        {tipo === "pago" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pago-only">Monto del pago</Label>
            <Input
              id="pago-only"
              type="number"
              inputMode="numeric"
              min={0}
              value={pago}
              onChange={(e) => setPago(Number(e.target.value) || 0)}
              className="h-11"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="obs">Observación</Label>
          <Textarea
            id="obs"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Notas opcionales..."
            rows={2}
          />
        </div>
        </div>

        <div className="flex flex-col gap-4">
        {cliente && (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 lg:sticky lg:top-28">
            {tipo === "entrega" && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total a cobrar</span>
                <span className="font-semibold">{formatARS(total)}</span>
              </div>
            )}
            {tipo === "entrega" && pago < total && pago > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Faltante</span>
                <span className="font-semibold text-destructive">
                  {formatARS(total - pago)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Saldo después del movimiento
              </span>
              <span
                className={`font-semibold ${
                  previewSaldo < 0
                    ? "text-destructive"
                    : previewSaldo > 0
                      ? "text-emerald-600"
                      : ""
                }`}
              >
                {formatARS(previewSaldo)}
              </span>
            </div>
            {(tipo === "entrega" || tipo === "retiro") && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Envases en comodato (después)
                </span>
                <span className="font-semibold">{previewComodato}</span>
              </div>
            )}
            {tipo === "pago" && deudaActual > 0 && pago > deudaActual && (
              <p className="text-xs text-muted-foreground">
                El pago supera la deuda. Quedará saldo a favor del cliente.
              </p>
            )}
          </div>
        )}

        {okMsg && (
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" />
            {okMsg}
          </div>
        )}

        <Button
          size="lg"
          className="h-12 w-full text-base"
          onClick={handleSubmit}
          disabled={!clienteId || (tipo === "entrega" && lineas.length === 0)}
        >
          Registrar movimiento
        </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function fromInputDate(value: string) {
  return new Date(`${value}T12:00:00`).toISOString()
}

function esEnvase(producto: Producto) {
  const value = `${producto.nombre} ${producto.categoria}`.toLowerCase()
  return value.includes("bidon") || value.includes("bidón") || value.includes("envase")
}
