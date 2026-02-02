"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SessionStatus } from "@/types/database";

interface SessionData {
  id: string;
  table_id: string;
  status: SessionStatus;
  is_rodizio: boolean;
  num_people: number;
  created_at: string;
  closed_at: string | null;
  total_amount: number;
}

interface UseSessionOptions {
  tableNumber?: number;
  autoRecover?: boolean;
}

const SESSION_STORAGE_KEY = "sushi-active-session";

export function useSession(options: UseSessionOptions = {}) {
  const { tableNumber, autoRecover = true } = options;
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recover session from localStorage
  useEffect(() => {
    if (!autoRecover) {
      setIsLoading(false);
      return;
    }

    const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (storedSessionId) {
      fetchSession(storedSessionId);
    } else {
      setIsLoading(false);
    }
  }, [autoRecover]);

  const fetchSession = async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (fetchError || !data) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSession(null);
      setError(fetchError?.message || "Sessão não encontrada");
    } else if (data.status === "closed") {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSession(null);
    } else {
      setSession(data);
    }

    setIsLoading(false);
  };

  const createSession = useCallback(
    async (params: {
      tableId: string;
      isRodizio: boolean;
      numPeople: number;
    }) => {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: createError } = await supabase
        .from("sessions")
        .insert({
          table_id: params.tableId,
          is_rodizio: params.isRodizio,
          num_people: params.numPeople,
          status: "active",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !data) {
        setError(createError?.message || "Erro ao criar sessão");
        setIsLoading(false);
        return null;
      }

      setSession(data);
      localStorage.setItem(SESSION_STORAGE_KEY, data.id);
      setIsLoading(false);
      return data;
    },
    []
  );

  const updateSession = useCallback(
    async (updates: Partial<Pick<SessionData, "status" | "num_people" | "is_rodizio">>) => {
      if (!session) return null;

      setError(null);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from("sessions")
        .update(updates)
        .eq("id", session.id)
        .select()
        .single();

      if (updateError || !data) {
        setError(updateError?.message || "Erro ao atualizar sessão");
        return null;
      }

      setSession(data);
      return data;
    },
    [session]
  );

  const requestBill = useCallback(async () => {
    return updateSession({ status: "pending_payment" });
  }, [updateSession]);

  const endSession = useCallback(async () => {
    if (!session) return;

    setError(null);
    const supabase = createClient();

    const { error: closeError } = await supabase
      .from("sessions")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (closeError) {
      setError(closeError.message);
      return false;
    }

    setSession(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return true;
  }, [session]);

  const clearSession = useCallback(() => {
    setSession(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  return {
    session,
    isLoading,
    error,
    createSession,
    updateSession,
    requestBill,
    endSession,
    clearSession,
    refetch: session ? () => fetchSession(session.id) : undefined,
  };
}
