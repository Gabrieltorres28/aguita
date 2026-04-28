export type Cliente = {
  id: string
  nombre: string
  telefono: string
  direccion: string
  observaciones: string
  activo: boolean
  saldo: number // positivo = a favor, negativo = deuda
  envasesComodato: number
  envasesComodato12: number
  envasesComodato20: number
  createdAt: string
  updatedAt: string
}

export type TipoMovimiento = "entrega" | "retiro" | "pago" | "ajuste"
export type MetodoPago = "efectivo" | "transferencia"

export type Producto = {
  id: string
  nombre: string
  categoria: string
  stockActual: number
  precioVenta: number
  activo: boolean
  createdAt: string
  updatedAt: string
}

export type MovimientoProducto = {
  productoId: string
  nombre: string
  categoria: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export type Movimiento = {
  id: string
  clienteId: string
  fechaVenta: string
  fechaCobro?: string
  fechaCarga: string
  productos: MovimientoProducto[]
  fecha: string
  tipo: TipoMovimiento
  estado?: "pagada" | "pendiente"
  bidonesEntregados: number
  envasesRetirados: number
  envasesEntregados12: number
  envasesEntregados20: number
  envasesRetirados12: number
  envasesRetirados20: number
  precioUnitario: number
  total: number
  pagoRecibido: number
  metodoPago?: MetodoPago
  saldoResultante: number
  observacion: string
}

export type DB = {
  clientes: Cliente[]
  movimientos: Movimiento[]
  productos: Producto[]
  precioBidon: number
}
