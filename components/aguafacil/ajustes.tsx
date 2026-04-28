"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CheckCircle2, Download, Trash2 } from "lucide-react"
import type { DB } from "@/lib/types"
import { supabase } from "@/lib/supabaseClient"

type Props = {
  db: DB
  precioBidon: number
  onActualizarPrecio: (precio: number) => void
  onLimpiarTodo: () => void
}

export function Ajustes({
  db,
  precioBidon,
  onActualizarPrecio,
  onLimpiarTodo,
}: Props) {
  const [precio, setPrecio] = useState(precioBidon)
  const [okMsg, setOkMsg] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [securityMsg, setSecurityMsg] = useState("")
  const [securityError, setSecurityError] = useState("")
  const [securityLoading, setSecurityLoading] = useState(false)

  useEffect(() => setPrecio(precioBidon), [precioBidon])

  const guardar = () => {
    onActualizarPrecio(precio)
    setOkMsg("Precio actualizado")
    setTimeout(() => setOkMsg(""), 2000)
  }

  const exportarCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`clientes-${stamp}.csv`, [
      [
        "id",
        "nombre",
        "telefono",
        "direccion",
        "observaciones",
        "saldo",
        "envases_12_en_comodato",
        "envases_20_en_comodato",
        "activo",
        "created_at",
      ],
      ...db.clientes.map((cliente) => [
        cliente.id,
        cliente.nombre,
        cliente.telefono,
        cliente.direccion,
        cliente.observaciones,
        cliente.saldo,
        cliente.envasesComodato12,
        cliente.envasesComodato20,
        cliente.activo,
        cliente.createdAt,
      ]),
    ])
    downloadCsv(`productos-${stamp}.csv`, [
      ["id", "nombre", "tipo", "stock", "precio", "activo", "created_at"],
      ...db.productos.map((producto) => [
        producto.id,
        producto.nombre,
        producto.categoria,
        producto.stockActual,
        producto.precioVenta,
        producto.activo,
        producto.createdAt,
      ]),
    ])
    downloadCsv(`movimientos-${stamp}.csv`, [
      [
        "id",
        "client_id",
        "tipo",
        "fecha_venta",
        "fecha_cobro",
        "total",
        "pago_recibido",
        "metodo_pago",
        "saldo_resultante",
        "envases_entregados_12",
        "envases_entregados_20",
        "envases_retirados_12",
        "envases_retirados_20",
        "observacion",
      ],
      ...db.movimientos.map((movimiento) => [
        movimiento.id,
        movimiento.clienteId,
        movimiento.tipo,
        movimiento.fechaVenta,
        movimiento.fechaCobro ?? "",
        movimiento.total,
        movimiento.pagoRecibido,
        movimiento.metodoPago ?? "",
        movimiento.saldoResultante,
        movimiento.envasesEntregados12,
        movimiento.envasesEntregados20,
        movimiento.envasesRetirados12,
        movimiento.envasesRetirados20,
        movimiento.observacion,
      ]),
    ])
    downloadCsv(`movement_items-${stamp}.csv`, [
      [
        "movement_id",
        "product_id",
        "producto",
        "cantidad",
        "precio_unitario",
        "subtotal",
        "container_type",
        "containers_delivered",
        "containers_returned",
      ],
      ...db.movimientos.flatMap((movimiento) => {
        const productRows = movimiento.productos.map((item) => [
          movimiento.id,
          item.productoId,
          item.nombre,
          item.cantidad,
          item.precioUnitario,
          item.subtotal,
          getContainerType(item.nombre, item.categoria),
          isContainerItem(item.nombre, item.categoria) ? item.cantidad : 0,
          0,
        ])
        const returnRows = [
          movimiento.envasesRetirados12 > 0
            ? [movimiento.id, "", "Retiro envase 12L", 0, 0, 0, "12", 0, movimiento.envasesRetirados12]
            : null,
          movimiento.envasesRetirados20 > 0
            ? [movimiento.id, "", "Retiro envase 20L", 0, 0, 0, "20", 0, movimiento.envasesRetirados20]
            : null,
        ].filter((row): row is (string | number)[] => Boolean(row))
        return [...productRows, ...returnRows]
      }),
    ])
  }

  const cambiarPassword = async () => {
    setSecurityMsg("")
    setSecurityError("")

    if (!currentPassword) {
      setSecurityError("Ingresá tu contraseña actual.")
      return
    }
    if (newPassword.length < 8) {
      setSecurityError("La nueva contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("La nueva contraseña y la confirmación no coinciden.")
      return
    }

    setSecurityLoading(true)
    try {
      const withCurrentPassword = await supabase.auth.updateUser({
        password: newPassword,
        currentPassword,
      } as Parameters<typeof supabase.auth.updateUser>[0])

      let updateError = withCurrentPassword.error
      if (updateError && mentionsUnsupportedCurrentPassword(updateError.message)) {
        const fallback = await supabase.auth.updateUser({ password: newPassword })
        updateError = fallback.error
      }

      if (updateError) {
        setSecurityError(updateError.message)
        return
      }

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setSecurityMsg("Contraseña actualizada correctamente.")
      setTimeout(() => setSecurityMsg(""), 2500)
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : "No se pudo actualizar la contraseña.")
    } finally {
      setSecurityLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Precio del bidón</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="precio-default">Precio por bidón (por defecto)</Label>
            <Input
              id="precio-default"
              type="number"
              inputMode="numeric"
              value={precio}
              onChange={(e) => setPrecio(Number(e.target.value) || 0)}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Se usa al registrar nuevas entregas. Podés cambiarlo en cada movimiento.
            </p>
          </div>
          <Button onClick={guardar} size="lg" className="h-11">
            Guardar
          </Button>
          {okMsg && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="size-4" />
              {okMsg}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportación</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Descarga clientes, productos, movimientos e items en CSV compatible con Excel.
          </p>
          <Button variant="secondary" size="lg" className="h-11 gap-2" onClick={exportarCsv}>
            <Download className="size-4" />
            Exportar CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seguridad</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="current-password">Contraseña actual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="h-11"
              />
            </div>
          </div>
          <Button
            size="lg"
            className="h-11 md:w-fit"
            onClick={cambiarPassword}
            disabled={securityLoading}
          >
            {securityLoading ? "Actualizando..." : "Cambiar contraseña"}
          </Button>
          {securityError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {securityError}
            </div>
          )}
          {securityMsg && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="size-4" />
              {securityMsg}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">Zona peligrosa</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="lg" className="h-11 w-full gap-2">
                <Trash2 className="size-4" />
                Borrar todos los datos
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Borrar todo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán todos los clientes y movimientos. Esta acción
                  no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onLimpiarTodo}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Sí, borrar todo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}

function downloadCsv(filename: string, rows: (string | number | boolean)[][]) {
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n")
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeCsv(value: string | number | boolean) {
  const text = String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function isContainerItem(nombre: string, categoria: string) {
  const value = `${nombre} ${categoria}`.toLowerCase()
  return value.includes("bidon") || value.includes("bidón") || value.includes("envase")
}

function getContainerType(nombre: string, categoria: string) {
  if (!isContainerItem(nombre, categoria)) return ""
  return Number(nombre.match(/\d+/)?.[0] ?? 20) === 12 ? "12" : "20"
}

function mentionsUnsupportedCurrentPassword(message: string) {
  const value = message.toLowerCase()
  return (
    value.includes("currentpassword") ||
    value.includes("current_password") ||
    value.includes("unrecognized") ||
    value.includes("unsupported") ||
    value.includes("invalid keys")
  )
}
