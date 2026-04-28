"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { Session } from "@supabase/supabase-js"
import { supabase, supabaseConfigError } from "./supabaseClient"
import type { Cliente, DB, MetodoPago, Movimiento, MovimientoProducto, Producto, TipoMovimiento } from "./types"

const defaultDB: DB = {
  clientes: [],
  movimientos: [],
  productos: [],
  precioBidon: 2500,
}

type ClientRow = {
  id: string
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  balance: number | string | null
  containers_12_on_loan: number | null
  containers_20_on_loan: number | null
  is_active: boolean | null
  created_at: string | null
}

type ProductRow = {
  id: string
  name: string
  type: string
  size_liters: number | null
  price: number | string | null
  stock: number | null
  is_active: boolean | null
  created_at: string | null
}

type MovementItemRow = {
  id: string
  movement_id: string
  product_id: string | null
  quantity: number
  unit_price: number | string | null
  line_total: number | string | null
  container_type: string | null
  containers_delivered: number | null
  containers_returned: number | null
  products?: ProductRow | null
}

type MovementRow = {
  id: string
  client_id: string
  movement_type: TipoMovimiento
  movement_date: string
  total_amount: number | string | null
  paid_amount: number | string | null
  payment_method: string | null
  balance_after: number | string | null
  notes: string | null
  created_at: string | null
  movement_items?: MovementItemRow[]
}

function numberValue(value: number | string | null | undefined) {
  return Number(value ?? 0) || 0
}

function mapClient(row: ClientRow): Cliente {
  const createdAt = row.created_at ?? new Date().toISOString()
  return {
    id: row.id,
    nombre: row.name,
    telefono: row.phone ?? "",
    direccion: row.address ?? "",
    observaciones: row.notes ?? "",
    activo: row.is_active ?? true,
    saldo: numberValue(row.balance),
    envasesComodato: (row.containers_12_on_loan ?? 0) + (row.containers_20_on_loan ?? 0),
    envasesComodato12: row.containers_12_on_loan ?? 0,
    envasesComodato20: row.containers_20_on_loan ?? 0,
    createdAt,
    updatedAt: createdAt,
  }
}

function mapProduct(row: ProductRow): Producto {
  const createdAt = row.created_at ?? new Date().toISOString()
  return {
    id: row.id,
    nombre: row.name,
    categoria: row.type || "General",
    stockActual: row.stock ?? 0,
    precioVenta: numberValue(row.price),
    activo: row.is_active ?? true,
    createdAt,
    updatedAt: createdAt,
  }
}

function mapMovement(row: MovementRow): Movimiento {
  const productos: MovimientoProducto[] = (row.movement_items ?? [])
    .filter((item) => item.product_id && item.quantity > 0)
    .map((item) => ({
      productoId: item.product_id as string,
      nombre: item.products?.name ?? "Producto eliminado",
      categoria: item.products?.type ?? "General",
      cantidad: item.quantity,
      precioUnitario: numberValue(item.unit_price),
      subtotal: numberValue(item.line_total),
    }))

  const entregados = (row.movement_items ?? []).reduce(
    (sum, item) => sum + (item.containers_delivered ?? 0),
    0,
  )
  const retirados = (row.movement_items ?? []).reduce(
    (sum, item) => sum + (item.containers_returned ?? 0),
    0,
  )
  const entregados12 = (row.movement_items ?? [])
    .filter((item) => item.container_type === "12")
    .reduce((sum, item) => sum + (item.containers_delivered ?? 0), 0)
  const entregados20 = (row.movement_items ?? [])
    .filter((item) => item.container_type !== "12")
    .reduce((sum, item) => sum + (item.containers_delivered ?? 0), 0)
  const retirados12 = (row.movement_items ?? [])
    .filter((item) => item.container_type === "12")
    .reduce((sum, item) => sum + (item.containers_returned ?? 0), 0)
  const retirados20 = (row.movement_items ?? [])
    .filter((item) => item.container_type !== "12")
    .reduce((sum, item) => sum + (item.containers_returned ?? 0), 0)
  const total = numberValue(row.total_amount)
  const pagoRecibido = numberValue(row.paid_amount)
  const fecha = `${row.movement_date}T12:00:00.000Z`
  const fechaCarga = row.created_at ?? fecha

  return {
    id: row.id,
    clienteId: row.client_id,
    fecha,
    fechaVenta: fecha,
    fechaCobro: pagoRecibido > 0 ? fecha : undefined,
    fechaCarga,
    tipo: row.movement_type,
    estado:
      row.movement_type === "entrega"
        ? pagoRecibido >= total
          ? "pagada"
          : "pendiente"
        : undefined,
    bidonesEntregados: entregados,
    envasesRetirados: retirados,
    envasesEntregados12: entregados12,
    envasesEntregados20: entregados20,
    envasesRetirados12: retirados12,
    envasesRetirados20: retirados20,
    precioUnitario: productos.length === 1 ? productos[0].precioUnitario : 0,
    productos,
    total,
    pagoRecibido,
    metodoPago:
      row.payment_method === "transferencia" || row.payment_method === "efectivo"
        ? row.payment_method
        : undefined,
    saldoResultante: numberValue(row.balance_after),
    observacion: row.notes ?? "",
  }
}

function getSupabaseMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return "Ocurrió un error inesperado."
}

function toMovementDate(value?: string) {
  return (value ? new Date(value) : new Date()).toISOString().slice(0, 10)
}

function getContainerBucket(product?: ProductRow | Producto | null) {
  if (!product) return "20"
  const size =
    "size_liters" in product ? product.size_liters : product.nombre.match(/\d+/)?.[0]
  return Number(size) === 12 ? "12" : "20"
}

function isContainerProduct(product: Producto) {
  const value = `${product.nombre} ${product.categoria}`.toLowerCase()
  return value.includes("bidon") || value.includes("bidón") || value.includes("envase")
}

export function useDB() {
  const router = useRouter()
  const [db, setDb] = useState<DB>(defaultDB)
  const [hydrated, setHydrated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [session, setSession] = useState<Session | null>(null)

  const loadDB = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      if (supabaseConfigError) throw new Error(supabaseConfigError)
      const [clientsResult, productsResult, movementsResult] = await Promise.all([
        supabase.from("clients").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase
          .from("movements")
          .select("*, movement_items(*, products(*))")
          .order("created_at", { ascending: false }),
      ])

      if (clientsResult.error) throw clientsResult.error
      if (productsResult.error) throw productsResult.error
      if (movementsResult.error) throw movementsResult.error

      const productos = ((productsResult.data ?? []) as ProductRow[]).map(mapProduct)
      const precioBidon =
        productos.find((producto) => producto.nombre.toLowerCase().includes("20"))?.precioVenta ??
        productos.find((producto) => producto.categoria.toLowerCase().includes("bid"))?.precioVenta ??
        2500

      setDb({
        clientes: ((clientsResult.data ?? []) as ClientRow[]).map(mapClient),
        productos,
        movimientos: ((movementsResult.data ?? []) as MovementRow[]).map(mapMovement),
        precioBidon,
      })
    } catch (err) {
      setError(getSupabaseMessage(err))
    } finally {
      setLoading(false)
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (!data.session) {
        router.replace("/login")
        setHydrated(true)
        setLoading(false)
        return
      }
      loadDB()
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) router.replace("/login")
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadDB, router])

  const runMutation = useCallback(
    async (action: () => Promise<void>) => {
      setError("")
      try {
        await action()
        await loadDB()
      } catch (err) {
        setError(getSupabaseMessage(err))
      }
    },
    [loadDB],
  )

  const setPrecioBidon = useCallback(
    (precio: number) => {
      void runMutation(async () => {
        const bidon = db.productos.find(
          (producto) =>
            producto.nombre.toLowerCase().includes("bid") &&
            producto.nombre.toLowerCase().includes("20"),
        )
        if (!bidon) return
        const { error: updateError } = await supabase
          .from("products")
          .update({ price: Number(precio) || 0 })
          .eq("id", bidon.id)
        if (updateError) throw updateError
      })
    },
    [db.productos, runMutation],
  )

  const agregarProducto = useCallback(
    (data: Pick<Producto, "nombre" | "categoria" | "stockActual" | "precioVenta">) => {
      void runMutation(async () => {
        const { error: insertError } = await supabase.from("products").insert({
          name: data.nombre.trim(),
          type: data.categoria.trim() || "General",
          size_liters: Number(data.nombre.match(/\d+/)?.[0] ?? 0) || null,
          price: Number(data.precioVenta) || 0,
          stock: Number(data.stockActual) || 0,
          is_active: true,
        })
        if (insertError) throw insertError
      })
    },
    [runMutation],
  )

  const editarProducto = useCallback(
    (
      id: string,
      data: Partial<Pick<Producto, "nombre" | "categoria" | "stockActual" | "precioVenta" | "activo">>,
    ) => {
      void runMutation(async () => {
        const patch: Record<string, string | number | boolean | null> = {}
        if (data.nombre !== undefined) {
          patch.name = data.nombre.trim()
          patch.size_liters = Number(data.nombre.match(/\d+/)?.[0] ?? 0) || null
        }
        if (data.categoria !== undefined) patch.type = data.categoria.trim() || "General"
        if (data.stockActual !== undefined) patch.stock = Number(data.stockActual) || 0
        if (data.precioVenta !== undefined) patch.price = Number(data.precioVenta) || 0
        if (data.activo !== undefined) patch.is_active = data.activo

        const { error: updateError } = await supabase.from("products").update(patch).eq("id", id)
        if (updateError) throw updateError
      })
    },
    [runMutation],
  )

  const desactivarProducto = useCallback(
    (id: string) => {
      editarProducto(id, { activo: false })
    },
    [editarProducto],
  )

  const agregarCliente = useCallback(
    (
      data: Pick<Cliente, "nombre" | "telefono" | "direccion" | "observaciones"> &
        Partial<Pick<Cliente, "envasesComodato12" | "envasesComodato20">>,
    ) => {
      void runMutation(async () => {
        const { error: insertError } = await supabase.from("clients").insert({
          name: data.nombre.trim(),
          phone: data.telefono.trim(),
          address: data.direccion.trim(),
          notes: data.observaciones.trim(),
          containers_12_on_loan: Number(data.envasesComodato12) || 0,
          containers_20_on_loan: Number(data.envasesComodato20) || 0,
        })
        if (insertError) throw insertError
      })
    },
    [runMutation],
  )

  const editarCliente = useCallback(
    (
      id: string,
      data: Partial<
        Pick<
          Cliente,
          | "nombre"
          | "telefono"
          | "direccion"
          | "observaciones"
          | "activo"
          | "envasesComodato12"
          | "envasesComodato20"
        >
      >,
    ) => {
      void runMutation(async () => {
        const patch: Record<string, string | number | boolean> = {}
        if (data.nombre !== undefined) patch.name = data.nombre.trim()
        if (data.telefono !== undefined) patch.phone = data.telefono.trim()
        if (data.direccion !== undefined) patch.address = data.direccion.trim()
        if (data.observaciones !== undefined) patch.notes = data.observaciones.trim()
        if (data.activo !== undefined) patch.is_active = data.activo
        if (data.envasesComodato12 !== undefined) {
          patch.containers_12_on_loan = Number(data.envasesComodato12) || 0
        }
        if (data.envasesComodato20 !== undefined) {
          patch.containers_20_on_loan = Number(data.envasesComodato20) || 0
        }

        const { error: updateError } = await supabase.from("clients").update(patch).eq("id", id)
        if (updateError) throw updateError
      })
    },
    [runMutation],
  )

  const eliminarCliente = useCallback(
    (id: string) => {
      void runMutation(async () => {
        const { error: movementsError } = await supabase
          .from("movements")
          .delete()
          .eq("client_id", id)
        if (movementsError) throw movementsError

        const { error: clientError } = await supabase.from("clients").delete().eq("id", id)
        if (clientError) throw clientError
      })
    },
    [runMutation],
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
      metodoPago?: MetodoPago
      envasesRetirados12?: number
      envasesRetirados20?: number
      fechaVenta?: string
      fechaCobro?: string
      fecha?: string
    }) => {
      void runMutation(async () => {
        const cliente = db.clientes.find((c) => c.id === input.clienteId)
        if (!cliente) throw new Error("Cliente no encontrado.")

        const lineas =
          input.tipo === "entrega"
            ? (input.productos ?? [])
                .map((item) => {
                  const producto = db.productos.find((p) => p.id === item.productoId)
                  if (!producto) return null
                  const cantidad = Number(item.cantidad) || 0
                  const precioUnitario = Number(item.precioUnitario) || 0
                  return {
                    producto,
                    cantidad,
                    precioUnitario,
                    subtotal: cantidad * precioUnitario,
                  }
                })
                .filter((item): item is NonNullable<typeof item> => Boolean(item && item.cantidad > 0))
            : []

        const total =
          lineas.length > 0
            ? lineas.reduce((sum, item) => sum + item.subtotal, 0)
            : input.bidonesEntregados * input.precioUnitario
        let deltaSaldo = 0
        if (input.tipo === "entrega") deltaSaldo = input.pagoRecibido - total
        else if (input.tipo === "pago") deltaSaldo = input.pagoRecibido
        else if (input.tipo === "ajuste") deltaSaldo = input.pagoRecibido

        const nuevoSaldo = cliente.saldo + deltaSaldo
        const movementItems: {
          product_id: string | null
          quantity: number
          unit_price: number
          line_total: number
          container_type: string
          containers_delivered: number
          containers_returned: number
        }[] = lineas.map((item) => {
          const isContainer = isContainerProduct(item.producto)
          const containerType = getContainerBucket(item.producto)
          return {
            product_id: item.producto.id,
            quantity: item.cantidad,
            unit_price: item.precioUnitario,
            line_total: item.subtotal,
            container_type: containerType,
            containers_delivered: isContainer ? item.cantidad : 0,
            containers_returned: 0,
          }
        })

        const envasesRetirados12 = Number(input.envasesRetirados12) || 0
        const envasesRetirados20 =
          input.envasesRetirados20 !== undefined
            ? Number(input.envasesRetirados20) || 0
            : Number(input.envasesRetirados) || 0

        if (envasesRetirados12 > 0) {
          movementItems.push({
            product_id: null,
            quantity: 0,
            unit_price: 0,
            line_total: 0,
            container_type: "12",
            containers_delivered: 0,
            containers_returned: envasesRetirados12,
          })
        }

        if (envasesRetirados20 > 0) {
          movementItems.push({
            product_id: null,
            quantity: 0,
            unit_price: 0,
            line_total: 0,
            container_type: "20",
            containers_delivered: 0,
            containers_returned: envasesRetirados20,
          })
        }

        const delta12 = movementItems
          .filter((item) => item.container_type === "12")
          .reduce((sum, item) => sum + item.containers_delivered - item.containers_returned, 0)
        const delta20 = movementItems
          .filter((item) => item.container_type !== "12")
          .reduce((sum, item) => sum + item.containers_delivered - item.containers_returned, 0)

        const { data: movement, error: movementError } = await supabase
          .from("movements")
          .insert({
            client_id: input.clienteId,
            movement_type: input.tipo,
            movement_date: toMovementDate(input.fechaVenta ?? input.fecha),
            total_amount: total,
            paid_amount: input.tipo === "retiro" ? 0 : Number(input.pagoRecibido) || 0,
            payment_method:
              input.tipo !== "retiro" && Number(input.pagoRecibido) > 0
                ? input.metodoPago ?? "efectivo"
                : null,
            balance_after: nuevoSaldo,
            notes: input.observacion.trim(),
          })
          .select("id")
          .single()
        if (movementError) throw movementError

        if (movementItems.length > 0) {
          const { error: itemsError } = await supabase.from("movement_items").insert(
            movementItems.map((item) => ({
              ...item,
              movement_id: movement.id,
            })),
          )
          if (itemsError) throw itemsError
        }

        const stockDeltas = new Map<string, { producto: Producto; cantidad: number }>()
        lineas.forEach((item) => {
          const current = stockDeltas.get(item.producto.id)
          stockDeltas.set(item.producto.id, {
            producto: item.producto,
            cantidad: (current?.cantidad ?? 0) + item.cantidad,
          })
        })

        await Promise.all(
          Array.from(stockDeltas.values()).map(async (item) => {
            const { error: productError } = await supabase
              .from("products")
              .update({ stock: item.producto.stockActual - item.cantidad })
              .eq("id", item.producto.id)
            if (productError) throw productError
          }),
        )

        const { data: currentClient, error: currentClientError } = await supabase
          .from("clients")
          .select("containers_12_on_loan, containers_20_on_loan")
          .eq("id", cliente.id)
          .single()
        if (currentClientError) throw currentClientError

        const { error: clientError } = await supabase
          .from("clients")
          .update({
            balance: nuevoSaldo,
            containers_12_on_loan: Math.max(
              0,
              Number(currentClient.containers_12_on_loan ?? 0) + delta12,
            ),
            containers_20_on_loan: Math.max(
              0,
              Number(currentClient.containers_20_on_loan ?? 0) + delta20,
            ),
          })
          .eq("id", cliente.id)
        if (clientError) throw clientError
      })
    },
    [db.clientes, db.productos, runMutation],
  )

  const eliminarMovimiento = useCallback(
    (movId: string) => {
      void runMutation(async () => {
        const mov = db.movimientos.find((m) => m.id === movId)
        const cliente = mov ? db.clientes.find((c) => c.id === mov.clienteId) : null
        if (!mov || !cliente) return

        let deltaSaldo = 0
        if (mov.tipo === "entrega") deltaSaldo = mov.pagoRecibido - mov.total
        else if (mov.tipo === "pago") deltaSaldo = mov.pagoRecibido
        else if (mov.tipo === "ajuste") deltaSaldo = mov.pagoRecibido

        const { data: itemRows, error: itemsReadError } = await supabase
          .from("movement_items")
          .select("container_type, containers_delivered, containers_returned")
          .eq("movement_id", movId)
        if (itemsReadError) throw itemsReadError

        const reverseDelta12 = ((itemRows ?? []) as MovementItemRow[])
          .filter((item) => item.container_type === "12")
          .reduce(
            (sum, item) => sum - (item.containers_delivered ?? 0) + (item.containers_returned ?? 0),
            0,
          )
        const reverseDelta20 = ((itemRows ?? []) as MovementItemRow[])
          .filter((item) => item.container_type !== "12")
          .reduce(
            (sum, item) => sum - (item.containers_delivered ?? 0) + (item.containers_returned ?? 0),
            0,
          )

        const stockDeltas = new Map<string, number>()
        mov.productos.forEach((item) => {
          stockDeltas.set(item.productoId, (stockDeltas.get(item.productoId) ?? 0) + item.cantidad)
        })

        await Promise.all(
          Array.from(stockDeltas.entries()).map(async ([productoId, cantidad]) => {
            const producto = db.productos.find((p) => p.id === productoId)
            if (!producto) return
            const { error: productError } = await supabase
              .from("products")
              .update({ stock: producto.stockActual + cantidad })
              .eq("id", producto.id)
            if (productError) throw productError
          }),
        )

        const { data: currentClient, error: currentClientError } = await supabase
          .from("clients")
          .select("containers_12_on_loan, containers_20_on_loan")
          .eq("id", cliente.id)
          .single()
        if (currentClientError) throw currentClientError

        const { error: clientError } = await supabase
          .from("clients")
          .update({
            balance: cliente.saldo - deltaSaldo,
            containers_20_on_loan: Math.max(
              0,
              Number(currentClient.containers_20_on_loan ?? 0) + reverseDelta20,
            ),
            containers_12_on_loan: Math.max(
              0,
              Number(currentClient.containers_12_on_loan ?? 0) + reverseDelta12,
            ),
          })
          .eq("id", cliente.id)
        if (clientError) throw clientError

        const { error: deleteError } = await supabase.from("movements").delete().eq("id", movId)
        if (deleteError) throw deleteError
      })
    },
    [db.clientes, db.movimientos, db.productos, runMutation],
  )

  const limpiarTodo = useCallback(() => {
    void runMutation(async () => {
      const { error: movementsError } = await supabase
        .from("movements")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")
      if (movementsError) throw movementsError
      const { error: clientsError } = await supabase
        .from("clients")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")
      if (clientsError) throw clientsError
      const { error: productsError } = await supabase
        .from("products")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")
      if (productsError) throw productsError
    })
  }, [runMutation])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }, [router])

  return useMemo(
    () => ({
      db,
      hydrated,
      loading,
      error,
      session,
      logout,
      refresh: loadDB,
      setPrecioBidon,
      agregarProducto,
      editarProducto,
      desactivarProducto,
      agregarCliente,
      editarCliente,
      eliminarCliente,
      registrarMovimiento,
      eliminarMovimiento,
      limpiarTodo,
    }),
    [
      db,
      hydrated,
      loading,
      error,
      session,
      logout,
      loadDB,
      setPrecioBidon,
      agregarProducto,
      editarProducto,
      desactivarProducto,
      agregarCliente,
      editarCliente,
      eliminarCliente,
      registrarMovimiento,
      eliminarMovimiento,
      limpiarTodo,
    ],
  )
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
