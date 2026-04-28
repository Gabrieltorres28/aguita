"use client"

import { useCallback, useEffect, useState } from "react"
import type { Cliente, DB, Movimiento, MovimientoProducto, Producto, TipoMovimiento } from "./types"

const STORAGE_KEY = "aguafacil_db_v1"

const defaultDB: DB = {
  clientes: [],
  movimientos: [],
  productos: [],
  precioBidon: 2500,
}

const defaultProductos = (precioBidon = 2500): Producto[] => [
  {
    id: "prod-bidon-20",
    nombre: "Bidón de 20 litros",
    categoria: "Bidones",
    stockActual: 0,
    precioVenta: precioBidon,
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function readDB(): DB {
  if (typeof window === "undefined") return defaultDB
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultDB
    const parsed = JSON.parse(raw) as DB
    const precioBidon = parsed.precioBidon ?? 2500
    const productos = (parsed.productos?.length ? parsed.productos : defaultProductos(precioBidon)).map(
      (p) => ({
        ...p,
        categoria: p.categoria || "General",
        stockActual: Number(p.stockActual) || 0,
        precioVenta: Number(p.precioVenta) || 0,
        activo: p.activo ?? true,
        createdAt: p.createdAt ?? new Date().toISOString(),
        updatedAt: p.updatedAt ?? new Date().toISOString(),
      }),
    )
    const fallbackProducto = productos[0]
    return {
      clientes: (parsed.clientes ?? []).map((cliente) => ({
        ...cliente,
        observaciones: cliente.observaciones ?? "",
        activo: cliente.activo ?? true,
        createdAt: cliente.createdAt ?? new Date().toISOString(),
        updatedAt: cliente.updatedAt ?? cliente.createdAt ?? new Date().toISOString(),
      })),
      movimientos: (parsed.movimientos ?? []).map((m) => migrateMovimiento(m, fallbackProducto)),
      productos,
      precioBidon,
    }
  } catch {
    return defaultDB
  }
}

function migrateMovimiento(m: Movimiento, fallbackProducto?: Producto): Movimiento {
  const fechaMovimiento = m.fechaVenta ?? m.fecha ?? new Date().toISOString()
  const productos =
    m.productos ??
    (m.tipo === "entrega" && m.bidonesEntregados > 0 && fallbackProducto
      ? [
          {
            productoId: fallbackProducto.id,
            nombre: fallbackProducto.nombre,
            categoria: fallbackProducto.categoria,
            cantidad: m.bidonesEntregados,
            precioUnitario: m.precioUnitario,
            subtotal: m.total,
          },
        ]
      : [])

  return {
    ...m,
    fecha: m.fecha ?? fechaMovimiento,
    fechaVenta: fechaMovimiento,
    fechaCobro: m.fechaCobro,
    fechaCarga: m.fechaCarga ?? m.fecha ?? fechaMovimiento,
    estado:
      m.estado ??
      (m.tipo === "entrega"
        ? m.pagoRecibido >= m.total
          ? "pagada"
          : "pendiente"
        : undefined),
    productos,
  }
}

function writeDB(db: DB) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function useDB() {
  const [db, setDb] = useState<DB>(defaultDB)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setDb(readDB())
    setHydrated(true)
  }, [])

  const persist = useCallback((updater: (prev: DB) => DB) => {
    setDb((prev) => {
      const next = updater(prev)
      writeDB(next)
      return next
    })
  }, [])

  const setPrecioBidon = useCallback(
    (precio: number) => persist((p) => ({ ...p, precioBidon: precio })),
    [persist],
  )

  const agregarProducto = useCallback(
    (data: Pick<Producto, "nombre" | "categoria" | "stockActual" | "precioVenta">) => {
      const ahora = new Date().toISOString()
      const producto: Producto = {
        id: uid(),
        nombre: data.nombre.trim(),
        categoria: data.categoria.trim() || "General",
        stockActual: Number(data.stockActual) || 0,
        precioVenta: Number(data.precioVenta) || 0,
        activo: true,
        createdAt: ahora,
        updatedAt: ahora,
      }
      persist((p) => ({ ...p, productos: [producto, ...p.productos] }))
      return producto
    },
    [persist],
  )

  const editarProducto = useCallback(
    (
      id: string,
      data: Partial<Pick<Producto, "nombre" | "categoria" | "stockActual" | "precioVenta" | "activo">>,
    ) => {
      persist((p) => ({
        ...p,
        productos: p.productos.map((producto) =>
          producto.id === id
            ? {
                ...producto,
                ...data,
                nombre: data.nombre?.trim() ?? producto.nombre,
                categoria: data.categoria?.trim() || producto.categoria,
                stockActual:
                  data.stockActual !== undefined
                    ? Number(data.stockActual) || 0
                    : producto.stockActual,
                precioVenta:
                  data.precioVenta !== undefined
                    ? Number(data.precioVenta) || 0
                    : producto.precioVenta,
                activo: data.activo ?? producto.activo,
                updatedAt: new Date().toISOString(),
              }
            : producto,
        ),
      }))
    },
    [persist],
  )

  const desactivarProducto = useCallback(
    (id: string) => {
      editarProducto(id, { activo: false })
    },
    [editarProducto],
  )

  const agregarCliente = useCallback(
    (data: Pick<Cliente, "nombre" | "telefono" | "direccion" | "observaciones">) => {
      const ahora = new Date().toISOString()
      const cliente: Cliente = {
        id: uid(),
        nombre: data.nombre.trim(),
        telefono: data.telefono.trim(),
        direccion: data.direccion.trim(),
        observaciones: data.observaciones.trim(),
        activo: true,
        saldo: 0,
        envasesComodato: 0,
        createdAt: ahora,
        updatedAt: ahora,
      }
      persist((p) => ({ ...p, clientes: [cliente, ...p.clientes] }))
      return cliente
    },
    [persist],
  )

  const editarCliente = useCallback(
    (
      id: string,
      data: Partial<Pick<Cliente, "nombre" | "telefono" | "direccion" | "observaciones" | "activo">>,
    ) => {
      persist((p) => ({
        ...p,
        clientes: p.clientes.map((c) =>
          c.id === id
            ? {
                ...c,
                ...data,
                nombre: data.nombre?.trim() ?? c.nombre,
                telefono: data.telefono?.trim() ?? c.telefono,
                direccion: data.direccion?.trim() ?? c.direccion,
                observaciones: data.observaciones?.trim() ?? c.observaciones,
                activo: data.activo ?? c.activo,
                updatedAt: new Date().toISOString(),
              }
            : c,
        ),
      }))
    },
    [persist],
  )

  const eliminarCliente = useCallback(
    (id: string) => {
      persist((p) => ({
        ...p,
        clientes: p.clientes.map((c) =>
          c.id === id ? { ...c, activo: false, updatedAt: new Date().toISOString() } : c,
        ),
      }))
    },
    [persist],
  )

  const registrarMovimiento = useCallback(
    (input: {
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
      fecha?: string
    }) => {
      persist((p) => {
        const cliente = p.clientes.find((c) => c.id === input.clienteId)
        if (!cliente) return p

        const productos: MovimientoProducto[] =
          input.tipo === "entrega"
            ? (input.productos ?? [])
                .map((item) => {
                  const producto = p.productos.find((prod) => prod.id === item.productoId)
                  if (!producto) return null
                  const cantidad = Number(item.cantidad) || 0
                  const precioUnitario = Number(item.precioUnitario) || 0
                  return {
                    productoId: producto.id,
                    nombre: producto.nombre,
                    categoria: producto.categoria,
                    cantidad,
                    precioUnitario,
                    subtotal: cantidad * precioUnitario,
                  }
                })
                .filter((item): item is MovimientoProducto => Boolean(item && item.cantidad > 0))
            : []

        const total =
          productos.length > 0
            ? productos.reduce((sum, item) => sum + item.subtotal, 0)
            : input.bidonesEntregados * input.precioUnitario
        // saldo positivo = a favor del cliente, negativo = deuda
        // entrega: resta total, suma pago
        // pago: solo suma pago
        // retiro: no afecta dinero (solo envases)
        // ajuste: usa pagoRecibido como ajuste de saldo (+ a favor / - deuda)
        let deltaSaldo = 0
        if (input.tipo === "entrega") {
          deltaSaldo = input.pagoRecibido - total
        } else if (input.tipo === "pago") {
          deltaSaldo = input.pagoRecibido
        } else if (input.tipo === "ajuste") {
          deltaSaldo = input.pagoRecibido
        }

        const deltaComodato = input.bidonesEntregados - input.envasesRetirados
        const nuevoSaldo = cliente.saldo + deltaSaldo
        const nuevoComodato = cliente.envasesComodato + deltaComodato

        const mov: Movimiento = {
          id: uid(),
          clienteId: input.clienteId,
          fecha: input.fechaVenta ?? input.fecha ?? new Date().toISOString(),
          fechaVenta: input.fechaVenta ?? input.fecha ?? new Date().toISOString(),
          fechaCobro: input.fechaCobro || undefined,
          fechaCarga: new Date().toISOString(),
          tipo: input.tipo,
          estado:
            input.tipo === "entrega"
              ? input.pagoRecibido >= total
                ? "pagada"
                : "pendiente"
              : undefined,
          bidonesEntregados: input.bidonesEntregados,
          envasesRetirados: input.envasesRetirados,
          precioUnitario:
            productos.length === 1 ? productos[0].precioUnitario : input.precioUnitario,
          productos,
          total,
          pagoRecibido: input.pagoRecibido,
          saldoResultante: nuevoSaldo,
          observacion: input.observacion,
        }

        return {
          ...p,
          movimientos: [mov, ...p.movimientos],
          productos: p.productos.map((producto) => {
            const vendido = productos
              .filter((item) => item.productoId === producto.id)
              .reduce((sum, item) => sum + item.cantidad, 0)
            return vendido > 0
              ? { ...producto, stockActual: producto.stockActual - vendido, updatedAt: new Date().toISOString() }
              : producto
          }),
          clientes: p.clientes.map((c) =>
            c.id === cliente.id
              ? { ...c, saldo: nuevoSaldo, envasesComodato: nuevoComodato }
              : c,
          ),
        }
      })
    },
    [persist],
  )

  const eliminarMovimiento = useCallback(
    (movId: string) => {
      persist((p) => {
        const mov = p.movimientos.find((m) => m.id === movId)
        if (!mov) return p
        const cliente = p.clientes.find((c) => c.id === mov.clienteId)
        if (!cliente) {
          return { ...p, movimientos: p.movimientos.filter((m) => m.id !== movId) }
        }

        let deltaSaldo = 0
        if (mov.tipo === "entrega") {
          deltaSaldo = mov.pagoRecibido - mov.total
        } else if (mov.tipo === "pago") {
          deltaSaldo = mov.pagoRecibido
        } else if (mov.tipo === "ajuste") {
          deltaSaldo = mov.pagoRecibido
        }
        const deltaComodato = mov.bidonesEntregados - mov.envasesRetirados

        return {
          ...p,
          movimientos: p.movimientos.filter((m) => m.id !== movId),
          productos: p.productos.map((producto) => {
            const devuelto = (mov.productos ?? [])
              .filter((item) => item.productoId === producto.id)
              .reduce((sum, item) => sum + item.cantidad, 0)
            return devuelto > 0
              ? { ...producto, stockActual: producto.stockActual + devuelto, updatedAt: new Date().toISOString() }
              : producto
          }),
          clientes: p.clientes.map((c) =>
            c.id === cliente.id
              ? {
                  ...c,
                  saldo: c.saldo - deltaSaldo,
                  envasesComodato: c.envasesComodato - deltaComodato,
                }
              : c,
          ),
        }
      })
    },
    [persist],
  )

  const resetDemo = useCallback(() => {
    const ahora = new Date()
    const fecha = (offsetDays: number) => {
      const d = new Date(ahora)
      d.setDate(d.getDate() - offsetDays)
      return d.toISOString()
    }

    const c1: Cliente = {
      id: uid(),
      nombre: "María González",
      telefono: "11 5555-1234",
      direccion: "Av. Siempre Viva 123",
      observaciones: "Entrega por la mañana.",
      activo: true,
      saldo: 0,
      envasesComodato: 0,
      createdAt: fecha(20),
      updatedAt: fecha(1),
    }
    const c2: Cliente = {
      id: uid(),
      nombre: "Restaurante La Esquina",
      telefono: "11 4422-9988",
      direccion: "Rivadavia 4500",
      observaciones: "Cliente comercial.",
      activo: true,
      saldo: 0,
      envasesComodato: 0,
      createdAt: fecha(15),
      updatedAt: fecha(2),
    }
    const c3: Cliente = {
      id: uid(),
      nombre: "Carlos Pérez",
      telefono: "11 3344-5566",
      direccion: "Belgrano 870",
      observaciones: "",
      activo: true,
      saldo: 0,
      envasesComodato: 0,
      createdAt: fecha(10),
      updatedAt: fecha(1),
    }

    const precio = 2500
    const ahoraIso = ahora.toISOString()
    const producto20: Producto = {
      id: uid(),
      nombre: "Bidón de 20 litros",
      categoria: "Bidones",
      stockActual: 80,
      precioVenta: precio,
      activo: true,
      createdAt: fecha(20),
      updatedAt: ahoraIso,
    }
    const producto12: Producto = {
      id: uid(),
      nombre: "Bidón de 12 litros",
      categoria: "Bidones",
      stockActual: 35,
      precioVenta: 1900,
      activo: true,
      createdAt: fecha(20),
      updatedAt: ahoraIso,
    }
    const dispenser: Producto = {
      id: uid(),
      nombre: "Dispenser",
      categoria: "Accesorios",
      stockActual: 6,
      precioVenta: 35000,
      activo: true,
      createdAt: fecha(20),
      updatedAt: ahoraIso,
    }
    const movs: Movimiento[] = []
    const clientes = [c1, c2, c3]
    const productos = [producto20, producto12, dispenser]

    function addMov(
      cliente: Cliente,
      partial: Omit<Movimiento, "id" | "saldoResultante" | "clienteId" | "total" | "fechaCarga">,
    ) {
      const total =
        partial.productos.length > 0
          ? partial.productos.reduce((sum, item) => sum + item.subtotal, 0)
          : partial.bidonesEntregados * partial.precioUnitario
      let delta = 0
      if (partial.tipo === "entrega") delta = partial.pagoRecibido - total
      else if (partial.tipo === "pago") delta = partial.pagoRecibido
      else if (partial.tipo === "ajuste") delta = partial.pagoRecibido
      cliente.saldo += delta
      cliente.envasesComodato += partial.bidonesEntregados - partial.envasesRetirados
      movs.push({
        id: uid(),
        clienteId: cliente.id,
        total,
        fechaCarga: partial.fecha,
        saldoResultante: cliente.saldo,
        ...partial,
      })
      partial.productos.forEach((item) => {
        const producto = productos.find((p) => p.id === item.productoId)
        if (producto) producto.stockActual -= item.cantidad
      })
    }

    addMov(c1, {
      fecha: fecha(8),
      fechaVenta: fecha(8),
      fechaCobro: fecha(8),
      tipo: "entrega",
      estado: "pagada",
      bidonesEntregados: 2,
      envasesRetirados: 0,
      precioUnitario: precio,
      productos: [
        {
          productoId: producto20.id,
          nombre: producto20.nombre,
          categoria: producto20.categoria,
          cantidad: 2,
          precioUnitario: precio,
          subtotal: 2 * precio,
        },
      ],
      pagoRecibido: 5000,
      observacion: "Primera entrega",
    })
    addMov(c1, {
      fecha: fecha(3),
      fechaVenta: fecha(3),
      tipo: "entrega",
      estado: "pendiente",
      bidonesEntregados: 2,
      envasesRetirados: 2,
      precioUnitario: precio,
      productos: [
        {
          productoId: producto20.id,
          nombre: producto20.nombre,
          categoria: producto20.categoria,
          cantidad: 2,
          precioUnitario: precio,
          subtotal: 2 * precio,
        },
      ],
      pagoRecibido: 3000,
      observacion: "Pago parcial",
    })

    addMov(c2, {
      fecha: fecha(7),
      fechaVenta: fecha(7),
      tipo: "entrega",
      estado: "pendiente",
      bidonesEntregados: 6,
      envasesRetirados: 0,
      precioUnitario: precio,
      productos: [
        {
          productoId: producto20.id,
          nombre: producto20.nombre,
          categoria: producto20.categoria,
          cantidad: 5,
          precioUnitario: precio,
          subtotal: 5 * precio,
        },
        {
          productoId: producto12.id,
          nombre: producto12.nombre,
          categoria: producto12.categoria,
          cantidad: 1,
          precioUnitario: producto12.precioVenta,
          subtotal: producto12.precioVenta,
        },
      ],
      pagoRecibido: 0,
      observacion: "Pedido grande, paga después",
    })
    addMov(c2, {
      fecha: fecha(2),
      fechaVenta: fecha(2),
      fechaCobro: fecha(2),
      tipo: "pago",
      estado: undefined,
      bidonesEntregados: 0,
      envasesRetirados: 0,
      precioUnitario: 0,
      productos: [],
      pagoRecibido: 10000,
      observacion: "Abono parcial",
    })

    addMov(c3, {
      fecha: fecha(5),
      fechaVenta: fecha(5),
      fechaCobro: fecha(5),
      tipo: "entrega",
      estado: "pagada",
      bidonesEntregados: 3,
      envasesRetirados: 0,
      precioUnitario: precio,
      productos: [
        {
          productoId: producto20.id,
          nombre: producto20.nombre,
          categoria: producto20.categoria,
          cantidad: 3,
          precioUnitario: precio,
          subtotal: 3 * precio,
        },
      ],
      pagoRecibido: 7500,
      observacion: "Pago al contado",
    })
    addMov(c3, {
      fecha: fecha(1),
      fechaVenta: fecha(1),
      tipo: "retiro",
      estado: undefined,
      bidonesEntregados: 0,
      envasesRetirados: 2,
      precioUnitario: 0,
      productos: [],
      pagoRecibido: 0,
      observacion: "Devolución de envases",
    })

    const next: DB = {
      clientes,
      movimientos: movs.sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
      productos,
      precioBidon: precio,
    }
    writeDB(next)
    setDb(next)
  }, [])

  const limpiarTodo = useCallback(() => {
    writeDB(defaultDB)
    setDb(defaultDB)
  }, [])

  return {
    db,
    hydrated,
    setPrecioBidon,
    agregarProducto,
    editarProducto,
    desactivarProducto,
    agregarCliente,
    editarCliente,
    eliminarCliente,
    registrarMovimiento,
    eliminarMovimiento,
    resetDemo,
    limpiarTodo,
  }
}

export function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
}

export function formatFechaHora(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
