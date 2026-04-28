"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Plus, Pencil, Trash2, Phone, MapPin, Search, MessageCircle } from "lucide-react"
import type { Cliente, Movimiento } from "@/lib/types"
import { formatARS } from "@/lib/storage"
import { crearMensajeDeuda, crearUrlWhatsApp } from "@/lib/whatsapp"

type Props = {
  clientes: Cliente[]
  movimientos: Movimiento[]
  onAgregar: (data: Pick<Cliente, "nombre" | "telefono" | "direccion" | "observaciones">) => void
  onEditar: (
    id: string,
    data: Partial<Pick<Cliente, "nombre" | "telefono" | "direccion" | "observaciones" | "activo">>,
  ) => void
  onEliminar: (id: string) => void
  onVerCuenta: (id: string) => void
}

export function ClientesView({
  clientes,
  movimientos,
  onAgregar,
  onEditar,
  onEliminar,
  onVerCuenta,
}: Props) {
  const [busqueda, setBusqueda] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [aviso, setAviso] = useState("")
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    observaciones: "",
  })

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ nombre: "", telefono: "", direccion: "", observaciones: "" })
    setDialogOpen(true)
  }

  const abrirEditar = (c: Cliente) => {
    setEditando(c)
    setForm({
      nombre: c.nombre,
      telefono: c.telefono,
      direccion: c.direccion,
      observaciones: c.observaciones,
    })
    setDialogOpen(true)
  }

  const guardar = () => {
    if (!form.nombre.trim()) return
    if (editando) {
      onEditar(editando.id, form)
    } else {
      onAgregar(form)
    }
    setDialogOpen(false)
  }

  const filtrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return true
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.telefono.toLowerCase().includes(q) ||
      c.direccion.toLowerCase().includes(q) ||
      c.observaciones.toLowerCase().includes(q)
    )
  })

  const enviarDeuda = (cliente: Cliente) => {
    const url = crearUrlWhatsApp(
      cliente.telefono,
      crearMensajeDeuda(cliente, movimientos),
    )
    if (!url) {
      setAviso("El cliente no tiene un teléfono válido para WhatsApp.")
      setTimeout(() => setAviso(""), 2500)
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente..."
            className="h-11 pl-9"
          />
        </div>
        <Button onClick={abrirNuevo} size="lg" className="h-11 gap-2">
          <Plus className="size-4" />
          Nuevo cliente
        </Button>
      </div>
      {aviso && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {aviso}
        </div>
      )}

      {filtrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm font-medium">No hay clientes</p>
            <p className="text-xs text-muted-foreground">
              Agregá tu primer cliente para empezar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
        <Card className="hidden lg:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead className="text-right">Deuda</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-48 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.nombre}</div>
                      {c.observaciones && (
                        <div className="max-w-72 truncate text-xs text-muted-foreground">
                          {c.observaciones}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{c.telefono || "-"}</TableCell>
                    <TableCell>{c.direccion || "-"}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatARS(c.saldo < 0 ? -c.saldo : 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.activo ? "default" : "secondary"}>
                        {c.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => onVerCuenta(c.id)}
                          aria-label="Ver ficha"
                        >
                          <Search className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => enviarDeuda(c)}
                          aria-label="Enviar deuda por WhatsApp"
                        >
                          <MessageCircle className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => abrirEditar(c)}
                          aria-label="Editar"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        {c.activo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => setEliminandoId(c.id)}
                            aria-label="Borrar"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
          {filtrados.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">
                    {c.nombre}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => abrirEditar(c)}
                      aria-label="Editar"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setEliminandoId(c.id)}
                      aria-label="Borrar"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-0">
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {c.telefono && (
                    <span className="flex items-center gap-2">
                      <Phone className="size-3.5" />
                      {c.telefono}
                    </span>
                  )}
                  {c.direccion && (
                    <span className="flex items-center gap-2">
                      <MapPin className="size-3.5" />
                      {c.direccion}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Saldo</p>
                    <p
                      className={`text-sm font-bold ${
                        c.saldo < 0
                          ? "text-destructive"
                          : c.saldo > 0
                            ? "text-emerald-600"
                            : "text-foreground"
                      }`}
                    >
                      {formatARS(c.saldo)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">
                      En comodato
                    </p>
                    <p className="text-sm font-bold">
                      {c.envasesComodato} envase(s)
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  className="h-11 w-full"
                  onClick={() => onVerCuenta(c.id)}
                >
                  Ver cuenta corriente
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 w-full gap-2"
                  onClick={() => enviarDeuda(c)}
                >
                  <MessageCircle className="size-4" />
                  Enviar deuda por WhatsApp
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar cliente" : "Nuevo cliente"}
            </DialogTitle>
            <DialogDescription>
              Completá los datos del cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Juan Pérez"
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="11 5555-5555"
                className="h-11"
                inputMode="tel"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={form.direccion}
                onChange={(e) =>
                  setForm({ ...form, direccion: e.target.value })
                }
                placeholder="Calle 123"
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={form.observaciones}
                onChange={(e) =>
                  setForm({ ...form, observaciones: e.target.value })
                }
                placeholder="Notas internas del cliente..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setDialogOpen(false)}
              className="h-11"
            >
              Cancelar
            </Button>
            <Button onClick={guardar} size="lg" className="h-11">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={eliminandoId !== null}
        onOpenChange={(open) => !open && setEliminandoId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el cliente junto con sus movimientos e historial.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (eliminandoId) onEliminar(eliminandoId)
                setEliminandoId(null)
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
