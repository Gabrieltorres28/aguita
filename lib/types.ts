export type Cliente = {
  id: string
  nombre: string
  telefono: string
  direccion: string
  saldo: number // positivo = a favor, negativo = deuda
  envasesComodato: number
  createdAt: string
}

export type TipoMovimiento = "entrega" | "retiro" | "pago" | "ajuste"

export type Movimiento = {
  id: string
  clienteId: string
  fecha: string
  tipo: TipoMovimiento
  bidonesEntregados: number
  envasesRetirados: number
  precioUnitario: number
  total: number
  pagoRecibido: number
  saldoResultante: number
  observacion: string
}

export type DB = {
  clientes: Cliente[]
  movimientos: Movimiento[]
  precioBidon: number
}
