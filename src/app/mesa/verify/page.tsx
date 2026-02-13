"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#2a2a2a] rounded-2xl shadow-2xl border border-[#D4AF37]/20 overflow-hidden">
        <div className="bg-gradient-to-r from-[#D4AF37] to-[#F4E5B8] p-6 text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a]">🍣 Sushi in Sushi</h1>
          <p className="text-sm text-[#2a2a2a] mt-1">Verificação de Email</p>
        </div>
        <div className="p-8 text-center">
          <Loader2 className="w-16 h-16 text-[#D4AF37] mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-white mb-2">A carregar...</h2>
        </div>
      </div>
    </div>
  );
}

// Main verification component that uses useSearchParams
function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get("token");
      const customerId = searchParams.get("customerId");

      if (!token || !customerId) {
        setStatus("error");
        setMessage("Link de verificação inválido. Por favor, copie o código manualmente.");
        return;
      }

      try {
        const response = await fetch("/api/verification/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionCustomerId: customerId,
            token,
          }),
        });

        const data = await response.json();

        if (response.ok && data.verified) {
          setStatus("success");
          setMessage(
            data.associatedCount > 0
              ? `✅ Email verificado com sucesso! ${data.associatedCount} outra(s) pessoa(s) na mesa também foram verificadas.`
              : "✅ Email verificado com sucesso!"
          );

          // Get session from customer to redirect to correct table
          const supabase = createClient();
          const { data: customer } = await supabase
            .from("session_customers")
            .select("session:sessions!inner(table:tables!inner(number))")
            .eq("id", customerId)
            .single();

          // Redirect to table page after 2 seconds
          setTimeout(() => {
            if (customer?.session?.table?.number) {
              router.push(`/mesa/${customer.session.table.number}`);
            } else {
              router.push("/");
            }
          }, 2000);
        } else {
          setStatus("error");
          setMessage(data.error || "Erro ao verificar código. Por favor, tente novamente.");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage("Erro ao processar verificação. Por favor, tente copiar o código manualmente.");
      }
    };

    verify();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#2a2a2a] rounded-2xl shadow-2xl border border-[#D4AF37]/20 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#D4AF37] to-[#F4E5B8] p-6 text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a]">🍣 Sushi in Sushi</h1>
          <p className="text-sm text-[#2a2a2a] mt-1">Verificação de Email</p>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 text-[#D4AF37] mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold text-white mb-2">
                A verificar...
              </h2>
              <p className="text-gray-400">
                Por favor aguarde enquanto processamos a sua verificação.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Verificação Completa!
              </h2>
              <p className="text-gray-300 mb-4">{message}</p>
              <p className="text-sm text-gray-500">
                A redirecionar para a sua mesa...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Erro na Verificação
              </h2>
              <p className="text-gray-300 mb-6">{message}</p>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-[#D4AF37] text-[#1a1a1a] rounded-lg font-semibold hover:bg-[#F4E5B8] transition-colors"
              >
                Voltar ao Início
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#1a1a1a] px-6 py-4 text-center border-t border-[#D4AF37]/20">
          <p className="text-xs text-gray-500">
            Se tiver problemas, copie o código do email manualmente
          </p>
        </div>
      </div>
    </div>
  );
}

// Page component with Suspense boundary
export default function VerifyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyContent />
    </Suspense>
  );
}
