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
import type { Cliente, TipoMovimiento } from "@/lib/types"
import { Droplets, ArrowLeftRight, Wallet, CheckCircle2 } from "lucide-react"

type Props = {
  clientes: Cliente[]
  precioBidon: number
  clienteSeleccionadoId?: string
  onRegistrar: (input: {
    clienteId: string
    tipo: TipoMovimiento
    bidonesEntregados: number
    envasesRetirados: number
    precioUnitario: number
    pagoRecibido: number
    observacion: string
  }) => void
}

export function RegistrarMovimiento({
  clientes,
  precioBidon,
  clienteSeleccionadoId,
  onRegistrar,
}: Props) {
  const [tipo, setTipo] = useState<TipoMovimiento>("entrega")
  const [clienteId, setClienteId] = useState<string>(clienteSeleccionadoId ?? "")
  const [bidones, setBidones] = useState<number>(1)
  const [envasesRetirados, setEnvasesRetirados] = useState<number>(0)
  const [precio, setPrecio] = useState<number>(precioBidon)
  const [pago, setPago] = useState<number>(0)
  const [observacion, setObservacion] = useState<string>("")
  const [okMsg, setOkMsg] = useState<string>("")

  useEffect(() => {
    setPrecio(precioBidon)
  }, [precioBidon])

  useEffect(() => {
    if (clienteSeleccionadoId) setClienteId(clienteSeleccionadoId)
  }, [clienteSeleccionadoId])

  const cliente = useMemo(
    () => clientes.find((c) => c.id === clienteId) ?? null,
    [clientes, clienteId],
  )

  const total = tipo === "entrega" ? bidones * precio : 0
  const deudaActual = cliente && cliente.saldo < 0 ? -cliente.saldo : 0

  const reset = () => {
    setBidones(1)
    setEnvasesRetirados(0)
    setPago(0)
    setObservacion("")
  }

  const previewSaldo = useMemo(() => {
    if (!cliente) return 0
    let delta = 0
    if (tipo === "entrega") delta = pago - bidones * precio
    else if (tipo === "pago") delta = pago
    else if (tipo === "ajuste") delta = pago
    return cliente.saldo + delta
  }, [cliente, tipo, bidones, precio, pago])

  const previewComodato = useMemo(() => {
    if (!cliente) return 0
    return cliente.envasesComodato + bidones - envasesRetirados
  }, [cliente, bidones, envasesRetirados])

  const handleSubmit = () => {
    if (!clienteId) return
    onRegistrar({
      clienteId,
      tipo,
      bidonesEntregados: tipo === "entrega" ? bidones : 0,
      envasesRetirados: tipo === "retiro" || tipo === "entrega" ? envasesRetirados : 0,
      precioUnitario: tipo === "entrega" ? precio : 0,
      pagoRecibido: tipo === "retiro" ? 0 : pago,
      observacion,
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
      <CardContent className="flex flex-col gap-4">
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
                clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bidones">Bidones entregados</Label>
              <Input
                id="bidones"
                type="number"
                inputMode="numeric"
                min={0}
                value={bidones}
                onChange={(e) => setBidones(Number(e.target.value) || 0)}
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="precio">Precio por bidón</Label>
              <Input
                id="precio"
                type="number"
                inputMode="numeric"
                min={0}
                value={precio}
                onChange={(e) => setPrecio(Number(e.target.value) || 0)}
                className="h-11"
              />
            </div>
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

        {cliente && (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
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
          disabled={!clienteId}
        >
          Registrar movimiento
        </Button>
      </CardContent>
    </Card>
  )
}
