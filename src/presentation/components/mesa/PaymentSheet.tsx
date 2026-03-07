"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

type Step = "choice" | "tip" | "nif" | "payment" | "success";

const TIP_OPTIONS = [
  { label: "0%", value: 0 },
  { label: "5%", value: 0.05 },
  { label: "10%", value: 0.1 },
  { label: "15%", value: 0.15 },
] as const;

interface PaymentSheetProps {
  sessionId: string;
  subtotal: number;
  isGuest: boolean;
  sessionCustomerId: string | null;
  onSuccess: () => void;
  onCallWaiter: () => void;
  onClose: () => void;
}

export function PaymentSheet({
  sessionId,
  subtotal,
  isGuest,
  sessionCustomerId,
  onSuccess: _onSuccess,
  onCallWaiter,
  onClose,
}: PaymentSheetProps) {
  const [step, setStep] = useState<Step>("choice");
  const [tipPercent, setTipPercent] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [wantsNif, setWantsNif] = useState(false);
  const [nif, setNif] = useState("");
  const [email, setEmail] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const tipAmount =
    customTip !== ""
      ? parseFloat(customTip) || 0
      : tipPercent !== null
        ? Math.round(subtotal * tipPercent * 100) / 100
        : 0;

  const total = subtotal + tipAmount;

  const createPaymentIntent = useCallback(async () => {
    setIsCreatingIntent(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tipAmount,
          customerNif: wantsNif ? nif : undefined,
          customerEmail: email || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar pagamento");
      }

      setClientSecret(data.clientSecret);
      setStep("payment");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao criar pagamento",
      );
    } finally {
      setIsCreatingIntent(false);
    }
  }, [sessionId, tipAmount, wantsNif, nif, email]);

  // Step 1: Choice — pay online or call waiter
  if (step === "choice") {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-400 mb-1">Total a pagar</p>
          <p className="text-4xl font-bold text-[#D4AF37]">
            {subtotal.toFixed(2)}
          </p>
        </div>

        <button
          onClick={() => setStep("tip")}
          className="w-full p-5 rounded-2xl bg-[#D4AF37] text-black font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#C4A030] transition-colors cursor-pointer"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          Pagar agora
        </button>

        <button
          onClick={onCallWaiter}
          className="w-full p-5 rounded-2xl border-2 border-gray-700 text-gray-300 font-semibold text-lg flex items-center justify-center gap-3 hover:border-gray-600 transition-colors cursor-pointer"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Chamar empregado
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 text-gray-500 text-sm cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    );
  }

  // Step 2: Tip selection
  if (step === "tip") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setStep("choice")}
          className="text-gray-400 text-sm flex items-center gap-1 cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Voltar
        </button>

        <h3 className="text-lg font-semibold text-center">
          Quer deixar gorjeta?
        </h3>
        <p className="text-sm text-gray-400 text-center">Opcional</p>

        <div className="grid grid-cols-4 gap-2">
          {TIP_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                setTipPercent(opt.value);
                setCustomTip("");
              }}
              className={`py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer ${
                tipPercent === opt.value && customTip === ""
                  ? "bg-[#D4AF37] text-black"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">

          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="Outro valor"
            value={customTip}
            onChange={(e) => {
              setCustomTip(e.target.value);
              setTipPercent(null);
            }}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 rounded-xl text-white placeholder-gray-500 border border-gray-700 focus:border-[#D4AF37] focus:outline-none"
          />
        </div>

        <div className="bg-gray-900 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          {tipAmount > 0 && (
            <div className="flex justify-between text-sm text-gray-400">
              <span>Gorjeta</span>
              <span>{tipAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-800">
            <span>Total</span>
            <span className="text-[#D4AF37]">{total.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={() => setStep("nif")}
          className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-bold text-lg hover:bg-[#C4A030] transition-colors cursor-pointer"
        >
          Continuar
        </button>
      </div>
    );
  }

  // Step 3: NIF (optional)
  if (step === "nif") {
    const nifValid = !wantsNif || nif.length === 0 || /^\d{9}$/.test(nif);

    return (
      <div className="space-y-4">
        <button
          onClick={() => setStep("tip")}
          className="text-gray-400 text-sm flex items-center gap-1 cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Voltar
        </button>

        <h3 className="text-lg font-semibold text-center">
          Fatura com NIF?
        </h3>

        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">
              Quero fatura com contribuinte
            </span>
            <button
              onClick={() => setWantsNif(!wantsNif)}
              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                wantsNif ? "bg-[#D4AF37]" : "bg-gray-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  wantsNif ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {wantsNif && (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={9}
                placeholder="NIF (9 digitos)"
                value={nif}
                onChange={(e) => setNif(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3 bg-gray-800 rounded-xl text-white placeholder-gray-500 text-lg tracking-wider text-center border border-gray-700 focus:border-[#D4AF37] focus:outline-none"
              />
              {nif.length > 0 && !nifValid && (
                <p className="text-red-400 text-xs text-center">
                  NIF deve ter 9 digitos
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl p-4">
          <label className="text-sm text-gray-400 block mb-2">
            Email para recibo (opcional)
          </label>
          <input
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 rounded-xl text-white placeholder-gray-500 border border-gray-700 focus:border-[#D4AF37] focus:outline-none"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          onClick={createPaymentIntent}
          disabled={isCreatingIntent || (wantsNif && nif.length > 0 && !nifValid)}
          className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-bold text-lg hover:bg-[#C4A030] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isCreatingIntent ? (
            <Spinner />
          ) : (
            `Pagar ${total.toFixed(2)}\u20AC`
          )}
        </button>
      </div>
    );
  }

  // Step 4: Stripe Payment Element
  if (step === "payment" && clientSecret) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setStep("nif")}
          className="text-gray-400 text-sm flex items-center gap-1 cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Voltar
        </button>

        <div className="bg-gray-900 rounded-xl p-4 flex justify-between items-center">
          <span className="text-gray-400">Total</span>
          <span className="text-xl font-bold text-[#D4AF37]">
            {total.toFixed(2)}
          </span>
        </div>

        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "night",
              variables: {
                colorPrimary: "#D4AF37",
                colorBackground: "#1A1A1A",
                colorText: "#ffffff",
                colorDanger: "#ef4444",
                borderRadius: "12px",
              },
            },
          }}
        >
          <CheckoutForm
            total={total}
            sessionId={sessionId}
            onSuccess={(receipt) => {
              setReceiptUrl(receipt);
              setStep("success");
            }}
          />
        </Elements>
      </div>
    );
  }

  // Step 5: Success
  if (step === "success") {
    return (
      <SuccessStep
        receiptUrl={receiptUrl}
        isGuest={isGuest}
        sessionCustomerId={sessionCustomerId}
        sessionId={sessionId}
      />
    );
  }

  return null;
}

// Checkout form (uses Stripe hooks, must be inside Elements provider)
type CheckoutFormProps = {
  total: number;
  sessionId: string;
  // eslint-disable-next-line no-unused-vars
  onSuccess: (receiptUrl: string | null) => void;
};

function CheckoutForm({ total, sessionId, onSuccess }: CheckoutFormProps) {
  const stripeHook = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const MAX_POLL_ATTEMPTS = 30; // 30 x 2s = 60s max

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!stripeHook || !elements) return;

      setIsProcessing(true);
      setPaymentError(null);

      const { error } = await stripeHook.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        setPaymentError(error.message || "Pagamento falhou");
        setIsProcessing(false);
        return;
      }

      // Payment submitted — poll for webhook confirmation
      pollCountRef.current = 0;
      pollingRef.current = setInterval(async () => {
        pollCountRef.current += 1;

        if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsProcessing(false);
          setPaymentError(
            "Tempo esgotado a aguardar confirmacao. Se foi cobrado, o pagamento sera processado automaticamente.",
          );
          return;
        }

        try {
          const res = await fetch(
            `/api/payments/${sessionId}/status`,
          );
          const data = await res.json();

          if (data.status === "succeeded") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsProcessing(false);
            onSuccess(data.receiptUrl);
          } else if (data.status === "failed") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsProcessing(false);
            setPaymentError("O pagamento falhou. Tente novamente.");
          }
        } catch {
          // Polling error — keep retrying
        }
      }, 2000);
    },
    [stripeHook, elements, sessionId, onSuccess],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {paymentError && (
        <p className="text-red-400 text-sm text-center">{paymentError}</p>
      )}

      <button
        type="submit"
        disabled={!stripeHook || isProcessing}
        className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-bold text-lg hover:bg-[#C4A030] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isProcessing ? (
          <>
            <Spinner />
            A processar...
          </>
        ) : (
          `Confirmar pagamento de ${total.toFixed(2)}\u20AC`
        )}
      </button>
    </form>
  );
}

function SuccessStep({
  receiptUrl,
  isGuest,
  sessionCustomerId,
  sessionId,
}: {
  receiptUrl: string | null;
  isGuest: boolean;
  sessionCustomerId: string | null;
  sessionId: string;
}) {
  const [googleReviewsUrl, setGoogleReviewsUrl] = useState<string | null>(null);
  const [gamePoints, setGamePoints] = useState<number>(0);

  useEffect(() => {
    // Fetch Google Reviews URL
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.google_reviews_url) setGoogleReviewsUrl(data.google_reviews_url);
      })
      .catch(() => {});

    // Fetch game points for this session customer
    if (sessionCustomerId) {
      fetch(`/api/mesa/game-points?sessionCustomerId=${sessionCustomerId}&sessionId=${sessionId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.totalPoints > 0) setGamePoints(data.totalPoints);
        })
        .catch(() => {});
    }
  }, [sessionCustomerId, sessionId]);

  return (
    <div className="text-center space-y-5 py-4">
      <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
        <svg
          className="w-10 h-10 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-2">
          Pagamento confirmado!
        </h3>
        <p className="text-gray-400">
          Obrigado pela sua visita
        </p>
      </div>

      {/* Guest registration CTA with points incentive */}
      {isGuest && (
        <div className="bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 rounded-2xl p-5 border border-[#D4AF37]/20 text-left space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="font-semibold text-white">
              Nao perca os seus pontos!
            </span>
          </div>
          <p className="text-sm text-gray-300">
            {gamePoints > 0
              ? `Ganhou ${gamePoints} pontos nos jogos, mais os pontos desta visita. Crie conta para os guardar e acumular recompensas!`
              : "Crie uma conta para acumular pontos a cada visita e desbloquear recompensas exclusivas!"
            }
          </p>
          <a
            href="/registar"
            className="block w-full py-3 rounded-xl bg-[#D4AF37] text-black font-bold text-center hover:bg-[#C4A030] transition-colors cursor-pointer"
          >
            Criar conta gratuita
          </a>
        </div>
      )}

      {/* Google Review CTA */}
      {googleReviewsUrl && (
        <a
          href={googleReviewsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full p-4 rounded-2xl bg-white/5 border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <svg className="w-6 h-6 text-[#FBBC04]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-[#D4AF37] font-semibold">
              Gostou da experiencia?
            </span>
          </div>
          <p className="text-sm text-gray-400">
            Deixe-nos uma review no Google — demora menos de 1 minuto!
          </p>
        </a>
      )}

      {receiptUrl && (
        <a
          href={receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-gray-500 text-sm hover:text-gray-400 cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          Ver recibo
        </a>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
