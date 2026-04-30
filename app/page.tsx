"use client"

import { useState } from "react"
import { useDB } from "@/lib/storage"
import { BrandLogo } from "@/components/brand-logo"
import { Dashboard } from "@/components/aguafacil/dashboard"
import { ClientesView } from "@/components/aguafacil/clientes"
import { RegistrarMovimiento } from "@/components/aguafacil/registrar-movimiento"
import { CuentaCorriente } from "@/components/aguafacil/cuenta-corriente"
import { Historial } from "@/components/aguafacil/historial"
import { Ajustes } from "@/components/aguafacil/ajustes"
import { StockView } from "@/components/aguafacil/stock"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  FileText,
  History,
  Settings,
  Package,
  LogOut,
} from "lucide-react"
import type { TipoMovimiento } from "@/lib/types"

type Tab =
  | "dashboard"
  | "clientes"
  | "registrar"
  | "stock"
  | "cuenta"
  | "historial"
  | "ajustes"

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "registrar", label: "Registrar", icon: PlusCircle },
  { id: "stock", label: "Stock", icon: Package },
  { id: "cuenta", label: "Cuenta", icon: FileText },
  { id: "historial", label: "Historial", icon: History },
  { id: "ajustes", label: "Ajustes", icon: Settings },
]

export default function Page() {
  const {
    db,
    hydrated,
    loading,
    error,
    logout,
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
  } = useDB()

  const [tab, setTab] = useState<Tab>("dashboard")
  const [clienteCuentaId, setClienteCuentaId] = useState<string | null>(null)
  const [clientePreseleccionado, setClientePreseleccionado] = useState<
    string | undefined
  >(undefined)
  const [tipoPreseleccionado, setTipoPreseleccionado] = useState<TipoMovimiento | undefined>(
    undefined,
  )

  const irACuenta = (clienteId: string) => {
    setClienteCuentaId(clienteId)
    setTab("cuenta")
  }

  const irARegistrar = (clienteId?: string, tipo?: TipoMovimiento) => {
    setClientePreseleccionado(clienteId)
    setTipoPreseleccionado(tipo)
    setTab("registrar")
  }

  if (!hydrated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <BrandLogo className="size-12 animate-pulse" priority />
          <p className="text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20 md:pb-0 lg:flex-row">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card lg:fixed lg:bottom-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:mx-0 lg:max-w-none lg:px-5 lg:py-5">
          <div className="flex min-w-0 items-center">
            <BrandLogo className="size-16 shrink-0 sm:size-20 lg:size-24" priority />
          </div>
          <div className="flex items-center gap-1">
            <span className="hidden rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground sm:inline lg:hidden">
              Supabase
            </span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-9 gap-2 lg:flex"
              onClick={logout}
            >
              <LogOut className="size-4" />
              Salir
            </Button>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="mx-auto hidden w-full max-w-7xl gap-1 overflow-x-auto px-4 pb-2 md:flex lg:mx-0 lg:max-w-none lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-5">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <Button
                key={t.id}
                variant={active ? "default" : "ghost"}
                size="sm"
                className="h-9 gap-1.5 lg:h-10 lg:justify-start"
                onClick={() => setTab(t.id)}
              >
                <Icon className="size-4" />
                {t.label}
              </Button>
            )
          })}
        </nav>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 md:py-6 lg:ml-64 lg:px-6 xl:px-8">
        {tab === "dashboard" && <Dashboard db={db} />}
        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {db.clientes.length === 0 && db.productos.length === 0 && db.movimientos.length === 0 && tab === "dashboard" && (
          <div className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            No hay datos cargados todavía. Creá productos y clientes para empezar.
          </div>
        )}
        {tab === "clientes" && (
          <ClientesView
            clientes={db.clientes}
            movimientos={db.movimientos}
            onAgregar={agregarCliente}
            onEditar={editarCliente}
            onEliminar={eliminarCliente}
            onVerCuenta={irACuenta}
          />
        )}
        {tab === "registrar" && (
          <RegistrarMovimiento
            clientes={db.clientes}
            productos={db.productos}
            precioBidon={db.precioBidon}
            clienteSeleccionadoId={clientePreseleccionado}
            tipoInicial={tipoPreseleccionado}
            onRegistrar={(input) => {
              registrarMovimiento(input)
              setClientePreseleccionado(undefined)
              setTipoPreseleccionado(undefined)
            }}
          />
        )}
        {tab === "stock" && (
          <StockView
            productos={db.productos}
            onAgregar={agregarProducto}
            onEditar={editarProducto}
            onDesactivar={desactivarProducto}
          />
        )}
        {tab === "cuenta" && (
          <CuentaCorriente
            clientes={db.clientes}
            movimientos={db.movimientos}
            clienteSeleccionadoId={clienteCuentaId}
            onSeleccionarCliente={setClienteCuentaId}
            onVolver={() => setClienteCuentaId(null)}
            onEliminarMovimiento={eliminarMovimiento}
            onIrRegistrar={irARegistrar}
          />
        )}
        {tab === "historial" && (
          <Historial clientes={db.clientes} movimientos={db.movimientos} />
        )}
        {tab === "ajustes" && (
          <Ajustes
            db={db}
            precioBidon={db.precioBidon}
            onActualizarPrecio={setPrecioBidon}
            onLimpiarTodo={limpiarTodo}
          />
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card md:hidden"
        aria-label="Navegación principal"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-8">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={`size-5 ${active ? "stroke-[2.4]" : ""}`} />
                <span className="leading-none">{t.label}</span>
              </button>
            )
          })}
          <button
            onClick={logout}
            className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="size-5" />
            <span className="leading-none">Salir</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
