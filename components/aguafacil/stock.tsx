"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Package, Search } from "lucide-react"
import type { Producto } from "@/lib/types"
import { formatARS } from "@/lib/storage"

type Props = {
  productos: Producto[]
  onAgregar: (data: Pick<Producto, "nombre" | "categoria" | "stockActual" | "precioVenta">) => void
  onEditar: (
    id: string,
    data: Partial<Pick<Producto, "nombre" | "categoria" | "stockActual" | "precioVenta" | "activo">>,
  ) => void
  onDesactivar: (id: string) => void
}

const emptyForm = {
  nombre: "",
  categoria: "",
  stockActual: 0,
  precioVenta: 0,
  activo: true,
}

export function StockView({ productos, onAgregar, onEditar, onDesactivar }: Props) {
  const [busqueda, setBusqueda] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [desactivandoId, setDesactivandoId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return productos.filter((producto) => {
      if (!q) return true
      return (
        producto.nombre.toLowerCase().includes(q) ||
        producto.categoria.toLowerCase().includes(q)
      )
    })
  }, [productos, busqueda])

  const abrirNuevo = () => {
    setEditando(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const abrirEditar = (producto: Producto) => {
    setEditando(producto)
    setForm({
      nombre: producto.nombre,
      categoria: producto.categoria,
      stockActual: producto.stockActual,
      precioVenta: producto.precioVenta,
      activo: producto.activo,
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

  const totalUnidades = productos
    .filter((producto) => producto.activo)
    .reduce((sum, producto) => sum + producto.stockActual, 0)
  const valorStock = productos
    .filter((producto) => producto.activo)
    .reduce((sum, producto) => sum + producto.stockActual * producto.precioVenta, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Productos activos</p>
              <p className="text-2xl font-bold">
                {productos.filter((producto) => producto.activo).length}
              </p>
            </div>
            <Package className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unidades en stock</p>
            <p className="text-2xl font-bold">{totalUnidades}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Valor de venta</p>
            <p className="text-2xl font-bold">{formatARS(valorStock)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto o categoría..."
            className="h-11 pl-9"
          />
        </div>
        <Button onClick={abrirNuevo} size="lg" className="h-11 gap-2">
          <Plus className="size-4" />
          Nuevo producto
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stock de productos ({filtrados.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtrados.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No hay productos cargados.
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-24 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map((producto) => (
                      <TableRow key={producto.id}>
                        <TableCell className="font-medium">{producto.nombre}</TableCell>
                        <TableCell>{producto.categoria}</TableCell>
                        <TableCell className="text-right font-medium">
                          {producto.stockActual}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatARS(producto.precioVenta)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={producto.activo ? "default" : "secondary"}>
                            {producto.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => abrirEditar(producto)}
                              aria-label="Editar producto"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            {producto.activo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                onClick={() => setDesactivandoId(producto.id)}
                                aria-label="Desactivar producto"
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
              </div>

              <div className="flex flex-col gap-2 p-4 md:hidden">
                {filtrados.map((producto) => (
                  <div
                    key={producto.id}
                    className="rounded-md border border-border bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{producto.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {producto.categoria}
                        </p>
                      </div>
                      <Badge variant={producto.activo ? "default" : "secondary"}>
                        {producto.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-md bg-muted/40 px-3 py-2">
                        <p className="text-[11px] text-muted-foreground">Stock</p>
                        <p className="font-bold">{producto.stockActual}</p>
                      </div>
                      <div className="rounded-md bg-muted/40 px-3 py-2">
                        <p className="text-[11px] text-muted-foreground">Precio</p>
                        <p className="font-bold">{formatARS(producto.precioVenta)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="secondary"
                        className="h-10 flex-1 gap-2"
                        onClick={() => abrirEditar(producto)}
                      >
                        <Pencil className="size-4" />
                        Editar
                      </Button>
                      {producto.activo && (
                        <Button
                          variant="outline"
                          className="h-10 text-destructive hover:text-destructive"
                          onClick={() => setDesactivandoId(producto.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            <DialogDescription>
              Definí nombre, categoría, stock disponible y precio de venta.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="producto-nombre">Nombre</Label>
              <Input
                id="producto-nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Bidón de 12 litros"
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="producto-categoria">Categoría</Label>
              <Input
                id="producto-categoria"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Bidones, Accesorios, Otros"
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="producto-stock">Stock actual</Label>
              <Input
                id="producto-stock"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.stockActual}
                onChange={(e) =>
                  setForm({ ...form, stockActual: Number(e.target.value) || 0 })
                }
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="producto-precio">Precio de venta</Label>
              <Input
                id="producto-precio"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.precioVenta}
                onChange={(e) =>
                  setForm({ ...form, precioVenta: Number(e.target.value) || 0 })
                }
                className="h-11"
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
        open={desactivandoId !== null}
        onOpenChange={(open) => !open && setDesactivandoId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              El producto dejará de aparecer para nuevas ventas, pero se conserva en
              movimientos anteriores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (desactivandoId) onDesactivar(desactivandoId)
                setDesactivandoId(null)
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
