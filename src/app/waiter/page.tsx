"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequireWaiter } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { Session, Table } from "@/types/database";

interface TableWithSession extends Table {
  activeSession?: Session | null;
}

export default function WaiterDashboard() {
  const { user, logout, isLoading: authLoading } = useRequireWaiter();
  const router = useRouter();
  const [tables, setTables] = useState<TableWithSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchTables = async () => {
      try {
        const supabase = createClient();

        // For waiters, fetch only their assigned tables
        // For admins, fetch all tables
        if (user.role === "waiter") {
          const { data: assignments } = await supabase
            .from("waiter_tables")
            .select(`
              table:tables(*)
            `)
            .eq("staff_id", user.id);

          if (assignments) {
            const tableList = assignments
              .filter((a) => a.table)
              .map((a) => a.table as Table);

            // Fetch active sessions for these tables
            const tableIds = tableList.map((t) => t.id);
            const { data: sessions } = await supabase
              .from("sessions")
              .select("*")
              .in("table_id", tableIds)
              .eq("status", "active");

            const tablesWithSessions = tableList.map((table) => ({
              ...table,
              activeSession: sessions?.find((s) => s.table_id === table.id) || null,
            }));

            setTables(tablesWithSessions);
          }
        } else {
          // Admin sees all tables
          const { data: tableList } = await supabase
            .from("tables")
            .select("*")
            .eq("is_active", true)
            .order("number");

          if (tableList) {
            const tableIds = tableList.map((t) => t.id);
            const { data: sessions } = await supabase
              .from("sessions")
              .select("*")
              .in("table_id", tableIds)
              .eq("status", "active");

            const tablesWithSessions = tableList.map((table) => ({
              ...table,
              activeSession: sessions?.find((s) => s.table_id === table.id) || null,
            }));

            setTables(tablesWithSessions);
          }
        }
      } catch (error) {
        console.error("Error fetching tables:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTables();

    // Set up real-time subscription for sessions
    const supabase = createClient();
    const subscription = supabase
      .channel("waiter-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => {
          fetchTables();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeTables = tables.filter((t) => t.activeSession);
  const availableTables = tables.filter((t) => !t.activeSession);

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-2xl">🍣</span>
            <div>
              <h1 className="text-lg font-bold text-white">Minhas Mesas</h1>
              <p className="text-sm text-gray-400">
                {user?.name} • {user?.location === "circunvalacao" ? "Circunvalação" : "Boavista"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Admin
              </Link>
            )}
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {tables.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Nenhuma mesa atribuída
            </h2>
            <p className="text-gray-400">
              Contacte o administrador para atribuir mesas.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                <p className="text-sm text-gray-400">Total de Mesas</p>
                <p className="text-2xl font-bold text-white">{tables.length}</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                <p className="text-sm text-gray-400">Mesas Ocupadas</p>
                <p className="text-2xl font-bold text-[#D4AF37]">{activeTables.length}</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                <p className="text-sm text-gray-400">Mesas Livres</p>
                <p className="text-2xl font-bold text-green-500">{availableTables.length}</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                <p className="text-sm text-gray-400">Pessoas Sentadas</p>
                <p className="text-2xl font-bold text-white">
                  {activeTables.reduce((sum, t) => sum + (t.activeSession?.num_people || 0), 0)}
                </p>
              </div>
            </div>

            {/* Active Tables */}
            {activeTables.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#D4AF37] rounded-full" />
                  Mesas Ativas
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {activeTables.map((table) => (
                    <Link
                      key={table.id}
                      href={`/waiter/mesa/${table.id}`}
                      className="bg-[#1a1a1a] rounded-xl p-4 border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-bold text-[#D4AF37]">
                          #{table.number}
                        </span>
                        <span className="px-2 py-1 text-xs bg-[#D4AF37]/20 text-[#D4AF37] rounded-full">
                          Ativa
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{table.name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {table.activeSession?.num_people || 0} pessoas
                      </div>
                      {table.activeSession?.is_rodizio && (
                        <span className="mt-2 inline-block px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                          Rodízio
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Available Tables */}
            {availableTables.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Mesas Disponíveis
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {availableTables.map((table) => (
                    <Link
                      key={table.id}
                      href={`/waiter/mesa/${table.id}`}
                      className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800 hover:border-green-500/50 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-bold text-white">
                          #{table.number}
                        </span>
                        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
                          Livre
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{table.name}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
