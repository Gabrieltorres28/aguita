import type { Movimiento } from "./types"

export type VentaConSaldoPendiente = {
  movimiento: Movimiento
  saldoPendiente: number
}

function fechaOrdenable(movimiento: Movimiento) {
  return movimiento.fechaVenta ?? movimiento.fecha ?? movimiento.fechaCarga
}

function ordenarPorFechaAsc(a: Movimiento, b: Movimiento) {
  const fechaA = new Date(fechaOrdenable(a)).getTime()
  const fechaB = new Date(fechaOrdenable(b)).getTime()
  if (fechaA !== fechaB) return fechaA - fechaB

  const cargaA = new Date(a.fechaCarga ?? a.fecha).getTime()
  const cargaB = new Date(b.fechaCarga ?? b.fecha).getTime()
  return cargaA - cargaB
}

export function obtenerVentasConSaldoPendiente(
  clienteId: string,
  movimientos: Movimiento[],
): VentaConSaldoPendiente[] {
  const pendientes: VentaConSaldoPendiente[] = []
  let creditoDisponible = 0

  const aplicarCobro = (monto: number) => {
    let restante = monto

    while (restante > 0 && pendientes.length > 0) {
      const venta = pendientes[0]
      const aplicado = Math.min(restante, venta.saldoPendiente)
      venta.saldoPendiente -= aplicado
      restante -= aplicado

      if (venta.saldoPendiente <= 0) {
        pendientes.shift()
      }
    }

    if (restante > 0) creditoDisponible += restante
  }

  movimientos
    .filter((mov) => mov.clienteId === clienteId)
    .sort(ordenarPorFechaAsc)
    .forEach((mov) => {
      if (mov.tipo === "entrega") {
        const pendienteVenta = mov.total - mov.pagoRecibido

        if (pendienteVenta > 0) {
          const cubiertoConCredito = Math.min(creditoDisponible, pendienteVenta)
          const saldoPendiente = pendienteVenta - cubiertoConCredito
          creditoDisponible -= cubiertoConCredito

          if (saldoPendiente > 0) {
            pendientes.push({ movimiento: mov, saldoPendiente })
          }
        } else if (pendienteVenta < 0) {
          creditoDisponible += Math.abs(pendienteVenta)
        }

        return
      }

      if ((mov.tipo === "pago" || mov.tipo === "ajuste") && mov.pagoRecibido > 0) {
        aplicarCobro(mov.pagoRecibido)
      }
    })

  return pendientes
}
