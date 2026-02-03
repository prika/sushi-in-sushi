"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SessionParticipant } from "@/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const INACTIVE_THRESHOLD = 60000; // 1 minute

interface UseSessionParticipantsProps {
  sessionId: string | null;
  deviceId: string | null;
  deviceName: string;
}

export function useSessionParticipants({
  sessionId,
  deviceId,
  deviceName,
}: UseSessionParticipantsProps) {
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSomeoneElseSending, setIsSomeoneElseSending] = useState(false);
  const [sendingParticipant, setSendingParticipant] = useState<SessionParticipant | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Register or update participant
  const registerParticipant = useCallback(async () => {
    if (!sessionId || !deviceId) return;

    const supabase = createClient();

    // Upsert participant
    const { error } = await supabase
      .from("session_participants")
      .upsert(
        {
          session_id: sessionId,
          device_id: deviceId,
          device_name: deviceName,
          last_seen: new Date().toISOString(),
          is_sending: false,
        },
        {
          onConflict: "session_id,device_id",
        }
      );

    if (error) {
      console.error("Error registering participant:", error);
    }
  }, [sessionId, deviceId, deviceName]);

  // Update last_seen (heartbeat)
  const updateHeartbeat = useCallback(async () => {
    if (!sessionId || !deviceId) return;

    const supabase = createClient();
    await supabase
      .from("session_participants")
      .update({ last_seen: new Date().toISOString() })
      .eq("session_id", sessionId)
      .eq("device_id", deviceId);
  }, [sessionId, deviceId]);

  // Set is_sending flag
  const setIsSending = useCallback(
    async (isSending: boolean) => {
      if (!sessionId || !deviceId) return;

      const supabase = createClient();
      await supabase
        .from("session_participants")
        .update({ is_sending: isSending })
        .eq("session_id", sessionId)
        .eq("device_id", deviceId);
    },
    [sessionId, deviceId]
  );

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    if (!sessionId) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("session_participants")
      .select("*")
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error fetching participants:", error);
      return;
    }

    // Filter out inactive participants
    const now = Date.now();
    const activeParticipants = (data || []).filter((p) => {
      const lastSeen = new Date(p.last_seen).getTime();
      return now - lastSeen < INACTIVE_THRESHOLD;
    });

    setParticipants(activeParticipants);

    // Check if someone else is sending
    const senderOther = activeParticipants.find(
      (p) => p.is_sending && p.device_id !== deviceId
    );
    setIsSomeoneElseSending(!!senderOther);
    setSendingParticipant(senderOther || null);

    setIsLoading(false);
  }, [sessionId, deviceId]);

  // Leave session (cleanup)
  const leaveSession = useCallback(async () => {
    if (!sessionId || !deviceId) return;

    const supabase = createClient();
    await supabase
      .from("session_participants")
      .delete()
      .eq("session_id", sessionId)
      .eq("device_id", deviceId);
  }, [sessionId, deviceId]);

  // Setup real-time subscription and heartbeat
  useEffect(() => {
    if (!sessionId || !deviceId) return;

    const supabase = createClient();

    // Register participant first
    registerParticipant();

    // Fetch initial participants
    fetchParticipants();

    // Setup heartbeat
    heartbeatRef.current = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL);

    // Setup real-time subscription
    channelRef.current = supabase
      .channel(`session_participants:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      leaveSession();
    };
  }, [sessionId, deviceId, registerParticipant, fetchParticipants, updateHeartbeat, leaveSession]);

  // Update device name when it changes
  useEffect(() => {
    if (sessionId && deviceId && deviceName) {
      const supabase = createClient();
      supabase
        .from("session_participants")
        .update({ device_name: deviceName })
        .eq("session_id", sessionId)
        .eq("device_id", deviceId);
    }
  }, [sessionId, deviceId, deviceName]);

  const activeParticipantCount = participants.length;
  const otherParticipants = participants.filter((p) => p.device_id !== deviceId);

  return {
    participants,
    activeParticipantCount,
    otherParticipants,
    isLoading,
    isSomeoneElseSending,
    sendingParticipant,
    setIsSending,
    leaveSession,
    refetch: fetchParticipants,
  };
}
