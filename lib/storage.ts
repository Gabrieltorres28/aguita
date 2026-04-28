"use client"

import { useCallback, useEffect, useState } from "react"
import type { Cliente, DB, Movimiento, TipoMovimiento } from "./types"

const STORAGE_KEY = "aguafacil_db_v1"

const defaultDB: DB = {
  clientes: [],
  movimientos: [],
  precioBidon: 2500,
}

function readDB(): DB {
  if (typeof window === "undefined") return defaultDB
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultDB
    const parsed = JSON.parse(raw) as DB
    return {
      clientes: parsed.clientes ?? [],
      movimientos: parsed.movimientos ?? [],
      precioBidon: parsed.precioBidon ?? 2500,
    }
  } catch {
    return defaultDB
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

  const agregarCliente = useCallback(
    (data: Pick<Cliente, "nombre" | "telefono" | "direccion">) => {
      const cliente: Cliente = {
        id: uid(),
        nombre: data.nombre.trim(),
        telefono: data.telefono.trim(),
        direccion: data.direccion.trim(),
        saldo: 0,
        envasesComodato: 0,
        createdAt: new Date().toISOString(),
      }
      persist((p) => ({ ...p, clientes: [cliente, ...p.clientes] }))
      return cliente
    },
    [persist],
  )

  const editarCliente = useCallback(
    (id: string, data: Partial<Pick<Cliente, "nombre" | "telefono" | "direccion">>) => {
      persist((p) => ({
        ...p,
        clientes: p.clientes.map((c) => (c.id === id ? { ...c, ...data } : c)),
      }))
    },
    [persist],
  )

  const eliminarCliente = useCallback(
    (id: string) => {
      persist((p) => ({
        ...p,
        clientes: p.clientes.filter((c) => c.id !== id),
        movimientos: p.movimientos.filter((m) => m.clienteId !== id),
      }))
    },
    [persist],
  )

  const registrarMovimiento = useCallback(
    (input: {
      clienteId: string
      tipo: TipoMovimiento
      bidonesEntregados: number
      envasesRetirados: number
      precioUnitario: number
      pagoRecibido: number
      observacion: string
      fecha?: string
    }) => {
      persist((p) => {
        const cliente = p.clientes.find((c) => c.id === input.clienteId)
        if (!cliente) return p

        const total = input.bidonesEntregados * input.precioUnitario
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
          fecha: input.fecha ?? new Date().toISOString(),
          tipo: input.tipo,
          bidonesEntregados: input.bidonesEntregados,
          envasesRetirados: input.envasesRetirados,
          precioUnitario: input.precioUnitario,
          total,
          pagoRecibido: input.pagoRecibido,
          saldoResultante: nuevoSaldo,
          observacion: input.observacion,
        }

        return {
          ...p,
          movimientos: [mov, ...p.movimientos],
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
      saldo: 0,
      envasesComodato: 0,
      createdAt: fecha(20),
    }
    const c2: Cliente = {
      id: uid(),
      nombre: "Restaurante La Esquina",
      telefono: "11 4422-9988",
      direccion: "Rivadavia 4500",
      saldo: 0,
      envasesComodato: 0,
      createdAt: fecha(15),
    }
    const c3: Cliente = {
      id: uid(),
      nombre: "Carlos Pérez",
      telefono: "11 3344-5566",
      direccion: "Belgrano 870",
      saldo: 0,
      envasesComodato: 0,
      createdAt: fecha(10),
    }

    const precio = 2500
    const movs: Movimiento[] = []
    const clientes = [c1, c2, c3]

    function addMov(
      cliente: Cliente,
      partial: Omit<Movimiento, "id" | "saldoResultante" | "clienteId" | "total">,
    ) {
      const total = partial.bidonesEntregados * partial.precioUnitario
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
        saldoResultante: cliente.saldo,
        ...partial,
      })
    }

    addMov(c1, {
      fecha: fecha(8),
      tipo: "entrega",
      bidonesEntregados: 2,
      envasesRetirados: 0,
      precioUnitario: precio,
      pagoRecibido: 5000,
      observacion: "Primera entrega",
    })
    addMov(c1, {
      fecha: fecha(3),
      tipo: "entrega",
      bidonesEntregados: 2,
      envasesRetirados: 2,
      precioUnitario: precio,
      pagoRecibido: 3000,
      observacion: "Pago parcial",
    })

    addMov(c2, {
      fecha: fecha(7),
      tipo: "entrega",
      bidonesEntregados: 6,
      envasesRetirados: 0,
      precioUnitario: precio,
      pagoRecibido: 0,
      observacion: "Pedido grande, paga después",
    })
    addMov(c2, {
      fecha: fecha(2),
      tipo: "pago",
      bidonesEntregados: 0,
      envasesRetirados: 0,
      precioUnitario: 0,
      pagoRecibido: 10000,
      observacion: "Abono parcial",
    })

    addMov(c3, {
      fecha: fecha(5),
      tipo: "entrega",
      bidonesEntregados: 3,
      envasesRetirados: 0,
      precioUnitario: precio,
      pagoRecibido: 7500,
      observacion: "Pago al contado",
    })
    addMov(c3, {
      fecha: fecha(1),
      tipo: "retiro",
      bidonesEntregados: 0,
      envasesRetirados: 2,
      precioUnitario: 0,
      pagoRecibido: 0,
      observacion: "Devolución de envases",
    })

    const next: DB = {
      clientes,
      movimientos: movs.sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
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
