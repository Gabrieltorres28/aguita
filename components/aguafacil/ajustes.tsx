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
import { CheckCircle2, Trash2 } from "lucide-react"

type Props = {
  precioBidon: number
  onActualizarPrecio: (precio: number) => void
  onLimpiarTodo: () => void
}

export function Ajustes({
  precioBidon,
  onActualizarPrecio,
  onLimpiarTodo,
}: Props) {
  const [precio, setPrecio] = useState(precioBidon)
  const [okMsg, setOkMsg] = useState("")

  useEffect(() => setPrecio(precioBidon), [precioBidon])

  const guardar = () => {
    onActualizarPrecio(precio)
    setOkMsg("Precio actualizado")
    setTimeout(() => setOkMsg(""), 2000)
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
