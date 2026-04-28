"use client"

import { useState } from "react"
import { useDB } from "@/lib/storage"
import { Dashboard } from "@/components/aguafacil/dashboard"
import { ClientesView } from "@/components/aguafacil/clientes"
import { RegistrarMovimiento } from "@/components/aguafacil/registrar-movimiento"
import { CuentaCorriente } from "@/components/aguafacil/cuenta-corriente"
import { Historial } from "@/components/aguafacil/historial"
import { Ajustes } from "@/components/aguafacil/ajustes"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  FileText,
  History,
  Settings,
  Droplets,
} from "lucide-react"

type Tab =
  | "dashboard"
  | "clientes"
  | "registrar"
  | "cuenta"
  | "historial"
  | "ajustes"

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "registrar", label: "Registrar", icon: PlusCircle },
  { id: "cuenta", label: "Cuenta", icon: FileText },
  { id: "historial", label: "Historial", icon: History },
  { id: "ajustes", label: "Ajustes", icon: Settings },
]

export default function Page() {
  const {
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
  } = useDB()

  const [tab, setTab] = useState<Tab>("dashboard")
  const [clienteCuentaId, setClienteCuentaId] = useState<string | null>(null)
  const [clientePreseleccionado, setClientePreseleccionado] = useState<
    string | undefined
  >(undefined)

  const irACuenta = (clienteId: string) => {
    setClienteCuentaId(clienteId)
    setTab("cuenta")
  }

  const irARegistrar = (clienteId?: string) => {
    setClientePreseleccionado(clienteId)
    setTab("registrar")
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Droplets className="size-8 animate-pulse text-primary" />
          <p className="text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Droplets className="size-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold">AguaFácil</span>
              <span className="text-[11px] text-muted-foreground">
                Sistema de reparto
              </span>
            </div>
          </div>
          <span className="hidden rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground sm:inline">
            Demo · datos locales
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="mx-auto hidden w-full max-w-5xl gap-1 overflow-x-auto px-4 pb-2 md:flex">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <Button
                key={t.id}
                variant={active ? "default" : "ghost"}
                size="sm"
                className="h-9 gap-1.5"
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4">
        {tab === "dashboard" && <Dashboard db={db} />}
        {tab === "clientes" && (
          <ClientesView
            clientes={db.clientes}
            onAgregar={agregarCliente}
            onEditar={editarCliente}
            onEliminar={eliminarCliente}
            onVerCuenta={irACuenta}
          />
        )}
        {tab === "registrar" && (
          <RegistrarMovimiento
            clientes={db.clientes}
            precioBidon={db.precioBidon}
            clienteSeleccionadoId={clientePreseleccionado}
            onRegistrar={(input) => {
              registrarMovimiento(input)
              setClientePreseleccionado(undefined)
            }}
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
            precioBidon={db.precioBidon}
            onActualizarPrecio={setPrecioBidon}
            onResetDemo={resetDemo}
            onLimpiarTodo={limpiarTodo}
          />
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card md:hidden"
        aria-label="Navegación principal"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-6">
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
        </div>
      </nav>
    </div>
  )
}
