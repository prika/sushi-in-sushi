"use client";

import { useState, useEffect, useCallback } from "react";
import type { GameQuestion, GameType } from "@/domain/entities/GameQuestion";

type TabType = "quiz" | "preference";

const CATEGORIES = [
  { value: "sushi_knowledge", label: "Sushi Knowledge" },
  { value: "ingredients", label: "Ingredientes" },
  { value: "culture", label: "Cultura" },
  { value: "techniques", label: "Técnicas" },
  { value: "preferences", label: "Preferências" },
];

const EMPTY_QUIZ_FORM = {
  questionText: "",
  options: ["", "", "", ""],
  correctAnswerIndex: 0,
  category: "sushi_knowledge",
  difficulty: 1,
  points: 10,
  isActive: true,
};

const EMPTY_PREF_FORM = {
  questionText: "Preferes...",
  optionALabel: "",
  optionAImage: "",
  optionBLabel: "",
  optionBImage: "",
  category: "preferences",
  points: 10,
  isActive: true,
};

type PageView = "perguntas" | "analytics";

export default function JogosPage() {
  const [pageView, setPageView] = useState<PageView>("perguntas");
  const [tab, setTab] = useState<TabType>("quiz");
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Quiz form
  const [quizForm, setQuizForm] = useState(EMPTY_QUIZ_FORM);
  // Preference form
  const [prefForm, setPrefForm] = useState(EMPTY_PREF_FORM);

  // Preview state
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/game-questions?gameType=${tab}`);
      if (!res.ok) throw new Error("Erro ao carregar perguntas");
      const data = await res.json();
      setQuestions(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Close preview when the referenced question was deleted
  useEffect(() => {
    if (previewId && !questions.some((q) => q.id === previewId)) {
      setPreviewId(null);
    }
  }, [previewId, questions]);

  const handleOpenCreate = () => {
    setEditingId(null);
    if (tab === "quiz") {
      setQuizForm(EMPTY_QUIZ_FORM);
    } else {
      setPrefForm(EMPTY_PREF_FORM);
    }
    setShowModal(true);
  };

  const handleOpenEdit = (q: GameQuestion) => {
    setEditingId(q.id);
    if (tab === "quiz") {
      setQuizForm({
        questionText: q.questionText,
        options:
          q.options && q.options.length >= 4
            ? [...q.options]
            : ["", "", "", ""],
        correctAnswerIndex: q.correctAnswerIndex ?? 0,
        category: q.category ?? "sushi_knowledge",
        difficulty: q.difficulty,
        points: q.points,
        isActive: q.isActive,
      });
    } else {
      setPrefForm({
        questionText: q.questionText,
        optionALabel: q.optionA?.label ?? "",
        optionAImage: q.optionA?.imageUrl ?? "",
        optionBLabel: q.optionB?.label ?? "",
        optionBImage: q.optionB?.imageUrl ?? "",
        category: q.category ?? "preferences",
        points: q.points,
        isActive: q.isActive,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let body: Record<string, unknown>;

      if (tab === "quiz") {
        if (!quizForm.questionText.trim()) {
          alert("Pergunta é obrigatória");
          setIsSaving(false);
          return;
        }
        const filledOptions = quizForm.options.filter((o) => o.trim());
        if (filledOptions.length < 2) {
          alert("Mínimo 2 opções");
          setIsSaving(false);
          return;
        }
        body = {
          gameType: "quiz" as GameType,
          questionText: quizForm.questionText,
          options: quizForm.options.filter((o) => o.trim()),
          correctAnswerIndex: quizForm.correctAnswerIndex,
          category: quizForm.category,
          difficulty: quizForm.difficulty,
          points: quizForm.points,
          isActive: quizForm.isActive,
        };
      } else {
        if (!prefForm.optionALabel.trim() || !prefForm.optionBLabel.trim()) {
          alert("Ambas as opções são obrigatórias");
          setIsSaving(false);
          return;
        }
        body = {
          gameType: "preference" as GameType,
          questionText: prefForm.questionText || "Preferes...",
          optionA: {
            label: prefForm.optionALabel,
            ...(prefForm.optionAImage
              ? { imageUrl: prefForm.optionAImage }
              : {}),
          },
          optionB: {
            label: prefForm.optionBLabel,
            ...(prefForm.optionBImage
              ? { imageUrl: prefForm.optionBImage }
              : {}),
          },
          category: prefForm.category,
          points: prefForm.points,
          isActive: prefForm.isActive,
        };
      }

      if (editingId) {
        body.id = editingId;
        const res = await fetch("/api/admin/game-questions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Erro ao atualizar");
      } else {
        const res = await fetch("/api/admin/game-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Erro ao criar");
      }

      setShowModal(false);
      fetchQuestions();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (q: GameQuestion) => {
    try {
      const res = await fetch("/api/admin/game-questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: q.id, isActive: !q.isActive }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      fetchQuestions();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/game-questions?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao eliminar");
      setDeleteId(null);
      fetchQuestions();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const filteredQuestions = questions;
  const activeCount = questions.filter((q) => q.isActive).length;
  const inactiveCount = questions.length - activeCount;
  const previewQuestion = questions.find((q) => q.id === previewId);

  return (
    <div className="space-y-6">
      {/* Page-level Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 pb-0">
        <button
          onClick={() => setPageView("perguntas")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            pageView === "perguntas"
              ? "border-[#D4AF37] text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Perguntas
        </button>
        <button
          onClick={() => setPageView("analytics")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            pageView === "analytics"
              ? "border-[#D4AF37] text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Analytics View */}
      {pageView === "analytics" && <GameAnalytics />}

      {/* Perguntas View */}
      {pageView === "perguntas" && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Gestão de Perguntas
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {questions.length} perguntas ({activeCount} ativas,{" "}
                {inactiveCount} inativas)
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-[#D4AF37] text-black rounded-lg font-semibold hover:bg-[#C4A030] transition-colors"
            >
              + Nova Pergunta
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setTab("quiz")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === "quiz"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Quiz ({tab === "quiz" ? questions.length : "..."})
            </button>
            <button
              onClick={() => setTab("preference")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === "preference"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Preferência ({tab === "preference" ? questions.length : "..."})
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
            </div>
          )}

          {/* Questions list */}
          {!isLoading && filteredQuestions.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">
                Sem perguntas de {tab === "quiz" ? "quiz" : "preferência"}
              </p>
              <p className="text-sm mt-1">
                Clica em &quot;Nova Pergunta&quot; para começar
              </p>
            </div>
          )}

          {!isLoading && filteredQuestions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                      Pergunta
                    </th>
                    {tab === "quiz" && (
                      <>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 w-24">
                          Categoria
                        </th>
                        <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3 w-20">
                          Dificuldade
                        </th>
                      </>
                    )}
                    {tab === "preference" && (
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 w-48">
                        Opções
                      </th>
                    )}
                    <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3 w-16">
                      Pts
                    </th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3 w-20">
                      Estado
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3 w-32">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredQuestions.map((q) => (
                    <tr
                      key={q.id}
                      className={`hover:bg-gray-50 ${!q.isActive ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {q.questionText}
                        </p>
                        {tab === "quiz" && q.options && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {q.options.length} opções · Resposta:{" "}
                            {String.fromCharCode(
                              65 + (q.correctAnswerIndex ?? 0),
                            )}
                          </p>
                        )}
                      </td>
                      {tab === "quiz" && (
                        <>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {q.category?.replace(/_/g, " ") ?? "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs">
                            {"⭐".repeat(q.difficulty)}
                          </td>
                        </>
                      )}
                      {tab === "preference" && (
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">
                            {q.optionA?.label ?? "?"}{" "}
                            <span className="text-gray-400">vs</span>{" "}
                            {q.optionB?.label ?? "?"}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-medium text-[#D4AF37]">
                          {q.points}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(q)}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                            q.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {q.isActive ? "Ativa" : "Inativa"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              setPreviewId(previewId === q.id ? null : q.id)
                            }
                            className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Pré-visualizar"
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
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(q)}
                            className="p-1.5 text-gray-400 hover:text-[#D4AF37] rounded-lg hover:bg-amber-50 transition-colors"
                            title="Editar"
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
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteId(q.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                            title="Eliminar"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Preview inline */}
          {previewQuestion && (
            <PreviewCard
              question={previewQuestion}
              tab={tab}
              onClose={() => setPreviewId(null)}
            />
          )}

          {/* Create/Edit Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingId ? "Editar Pergunta" : "Nova Pergunta"}{" "}
                    <span className="text-sm text-gray-400 font-normal">
                      ({tab === "quiz" ? "Quiz" : "Preferência"})
                    </span>
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="px-6 py-4 space-y-4">
                  {tab === "quiz" ? (
                    <QuizForm form={quizForm} onChange={setQuizForm} />
                  ) : (
                    <PreferenceForm form={prefForm} onChange={setPrefForm} />
                  )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] disabled:opacity-50 transition-colors"
                  >
                    {isSaving
                      ? "A guardar..."
                      : editingId
                        ? "Guardar"
                        : "Criar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirm Dialog */}
          {deleteId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-xl w-full max-w-sm mx-4 p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Eliminar pergunta?
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Esta ação não pode ser revertida.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteId(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Game Analytics ──────────────────────────────────────

interface GameStats {
  overview: {
    totalSessions: number;
    completedSessions: number;
    abandonedSessions: number;
    activeSessions: number;
    completionRate: number;
    uniqueTableSessions: number;
    totalAnswers: number;
    quizAnswers: number;
    preferenceAnswers: number;
    avgScore: number;
    quizAccuracy: number;
  };
  prizes: {
    totalPrizes: number;
    redeemedPrizes: number;
    prizesByType: Record<string, number>;
  };
  ratings: {
    totalRatings: number;
    topRatedProducts: {
      productId: string;
      avgRating: number;
      voteCount: number;
    }[];
    bottomRatedProducts: {
      productId: string;
      avgRating: number;
      voteCount: number;
    }[];
  };
  questions: {
    hardestQuestions: {
      questionId: string;
      totalAnswers: number;
      accuracy: number;
    }[];
    easiestQuestions: {
      questionId: string;
      totalAnswers: number;
      accuracy: number;
    }[];
  };
  dailyActivity: { date: string; count: number }[];
}

function GameAnalytics() {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [questionTexts, setQuestionTexts] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/admin/game-stats");
        if (!res.ok) throw new Error("Erro ao carregar");
        const data = await res.json();
        setStats(data);

        // Fetch product names for top/bottom rated
        const allProductIds = [
          ...(data.ratings?.topRatedProducts ?? []),
          ...(data.ratings?.bottomRatedProducts ?? []),
        ].map((p: { productId: string }) => p.productId);

        if (allProductIds.length > 0) {
          const prodRes = await fetch("/api/products");
          if (prodRes.ok) {
            const products = await prodRes.json();
            const nameMap: Record<string, string> = {};
            for (const p of products) {
              nameMap[String(p.id)] = p.name;
            }
            setProductNames(nameMap);
          }
        }

        // Fetch question texts
        const allQuestionIds = [
          ...(data.questions?.hardestQuestions ?? []),
          ...(data.questions?.easiestQuestions ?? []),
        ].map((q: { questionId: string }) => q.questionId);

        if (allQuestionIds.length > 0) {
          const qRes = await fetch("/api/admin/game-questions");
          if (qRes.ok) {
            const questions = await qRes.json();
            const textMap: Record<string, string> = {};
            for (const q of questions) {
              textMap[q.id] = q.questionText;
            }
            setQuestionTexts(textMap);
          }
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error || "Sem dados"}
      </div>
    );
  }

  const { overview, prizes, ratings, questions, dailyActivity } = stats;
  const maxDaily = Math.max(...dailyActivity.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sessões de Jogo" value={overview.totalSessions} />
        <StatCard
          label="Mesas Participantes"
          value={overview.uniqueTableSessions}
        />
        <StatCard
          label="Taxa de Conclusão"
          value={`${overview.completionRate}%`}
        />
        <StatCard label="Respostas Totais" value={overview.totalAnswers} />
        <StatCard label="Quiz Respostas" value={overview.quizAnswers} />
        <StatCard
          label="Preferência Respostas"
          value={overview.preferenceAnswers}
        />
        <StatCard label="Precisão Quiz" value={`${overview.quizAccuracy}%`} />
        <StatCard label="Score Médio" value={overview.avgScore} />
      </div>

      {/* Prizes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prémios</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Distribuídos" value={prizes.totalPrizes} />
          <StatCard label="Resgatados" value={prizes.redeemedPrizes} />
          <StatCard
            label="Taxa Resgate"
            value={
              prizes.totalPrizes > 0
                ? `${Math.round((prizes.redeemedPrizes / prizes.totalPrizes) * 100)}%`
                : "N/A"
            }
          />
        </div>
        {Object.keys(prizes.prizesByType).length > 0 && (
          <div className="mt-4 flex gap-3">
            {Object.entries(prizes.prizesByType).map(([type, count]) => (
              <span
                key={type}
                className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full"
              >
                {type.replace(/_/g, " ")}: {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Product Ratings */}
      {(ratings.topRatedProducts.length > 0 ||
        ratings.bottomRatedProducts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ratings.topRatedProducts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Mais Votados
              </h3>
              <div className="space-y-2">
                {ratings.topRatedProducts.map((p, i) => (
                  <div
                    key={p.productId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400 w-5">
                        {i + 1}.
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {productNames[p.productId] ?? `#${p.productId}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#D4AF37]">
                        {p.avgRating}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({p.voteCount} votos)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ratings.bottomRatedProducts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Menos Votados
              </h3>
              <div className="space-y-2">
                {ratings.bottomRatedProducts.map((p, i) => (
                  <div
                    key={p.productId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400 w-5">
                        {i + 1}.
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {productNames[p.productId] ?? `#${p.productId}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-red-500">
                        {p.avgRating}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({p.voteCount} votos)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Question Stats */}
      {(questions.hardestQuestions.length > 0 ||
        questions.easiestQuestions.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {questions.hardestQuestions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Perguntas Mais Difíceis
              </h3>
              <div className="space-y-2">
                {questions.hardestQuestions.map((q) => (
                  <div
                    key={q.questionId}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {questionTexts[q.questionId] ?? q.questionId.slice(0, 8)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-red-500">
                        {q.accuracy}%
                      </span>
                      <span className="text-xs text-gray-400">
                        ({q.totalAnswers}x)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {questions.easiestQuestions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Perguntas Mais Fáceis
              </h3>
              <div className="space-y-2">
                {questions.easiestQuestions.map((q) => (
                  <div
                    key={q.questionId}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {questionTexts[q.questionId] ?? q.questionId.slice(0, 8)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-green-500">
                        {q.accuracy}%
                      </span>
                      <span className="text-xs text-gray-400">
                        ({q.totalAnswers}x)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Activity Chart */}
      {dailyActivity.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Atividade Diária (últimos 30 dias)
          </h3>
          <div className="flex items-end gap-1 h-32">
            {dailyActivity.map((d) => (
              <div
                key={d.date}
                className="flex-1 group relative"
                title={`${d.date}: ${d.count} sessões`}
              >
                <div
                  className="bg-[#D4AF37]/70 hover:bg-[#D4AF37] rounded-t transition-colors w-full"
                  style={{
                    height: `${Math.max((d.count / maxDaily) * 100, 4)}%`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400">
              {dailyActivity[0]?.date ?? ""}
            </span>
            <span className="text-xs text-gray-400">
              {dailyActivity[dailyActivity.length - 1]?.date ?? ""}
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {overview.totalSessions === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Sem dados de jogos ainda</p>
          <p className="text-sm mt-1">
            As estatísticas aparecerão assim que os clientes comecem a jogar
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

// ─── Quiz Form ───────────────────────────────────────────

function QuizForm({
  form,
  onChange,
}: {
  form: typeof EMPTY_QUIZ_FORM;
  onChange: (f: typeof EMPTY_QUIZ_FORM) => void;
}) {
  return (
    <>
      {/* Question text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pergunta
        </label>
        <textarea
          value={form.questionText}
          onChange={(e) => onChange({ ...form, questionText: e.target.value })}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          placeholder="Ex: Qual é o peixe mais popular no sushi?"
        />
      </div>

      {/* Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Opções
        </label>
        <div className="space-y-2">
          {form.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...form, correctAnswerIndex: i })}
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  form.correctAnswerIndex === i
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
                title={
                  form.correctAnswerIndex === i
                    ? "Resposta correta"
                    : "Marcar como correta"
                }
              >
                {String.fromCharCode(65 + i)}
              </button>
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const opts = [...form.options];
                  opts[i] = e.target.value;
                  onChange({ ...form, options: opts });
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                placeholder={`Opção ${String.fromCharCode(65 + i)}`}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Clica na letra para marcar como resposta correta
        </p>
      </div>

      {/* Category + Difficulty row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoria
          </label>
          <select
            value={form.category}
            onChange={(e) => onChange({ ...form, category: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dificuldade
          </label>
          <select
            value={form.difficulty}
            onChange={(e) =>
              onChange({ ...form, difficulty: Number(e.target.value) })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          >
            <option value={1}>⭐ Fácil</option>
            <option value={2}>⭐⭐ Médio</option>
            <option value={3}>⭐⭐⭐ Difícil</option>
          </select>
        </div>
      </div>

      {/* Points + Active */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pontos
          </label>
          <input
            type="number"
            value={form.points}
            onChange={(e) =>
              onChange({ ...form, points: Number(e.target.value) })
            }
            min={1}
            max={100}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                onChange({ ...form, isActive: e.target.checked })
              }
              className="rounded border-gray-300 text-[#D4AF37] focus:ring-[#D4AF37]"
            />
            <span className="text-sm text-gray-700">Ativa</span>
          </label>
        </div>
      </div>
    </>
  );
}

// ─── Preference Form ─────────────────────────────────────

function PreferenceForm({
  form,
  onChange,
}: {
  form: typeof EMPTY_PREF_FORM;
  onChange: (f: typeof EMPTY_PREF_FORM) => void;
}) {
  return (
    <>
      {/* Question text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Texto da pergunta
        </label>
        <input
          type="text"
          value={form.questionText}
          onChange={(e) => onChange({ ...form, questionText: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          placeholder="Preferes..."
        />
      </div>

      {/* Option A */}
      <div className="rounded-xl border border-gray-200 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Opção A</h4>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Label</label>
          <input
            type="text"
            value={form.optionALabel}
            onChange={(e) =>
              onChange({ ...form, optionALabel: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            placeholder="Ex: Nigiri"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            URL da imagem (opcional)
          </label>
          <input
            type="text"
            value={form.optionAImage}
            onChange={(e) =>
              onChange({ ...form, optionAImage: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* VS divider */}
      <div className="flex items-center justify-center">
        <span className="text-sm font-bold text-gray-300">VS</span>
      </div>

      {/* Option B */}
      <div className="rounded-xl border border-gray-200 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Opção B</h4>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Label</label>
          <input
            type="text"
            value={form.optionBLabel}
            onChange={(e) =>
              onChange({ ...form, optionBLabel: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            placeholder="Ex: Maki"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            URL da imagem (opcional)
          </label>
          <input
            type="text"
            value={form.optionBImage}
            onChange={(e) =>
              onChange({ ...form, optionBImage: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Points + Active */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pontos
          </label>
          <input
            type="number"
            value={form.points}
            onChange={(e) =>
              onChange({ ...form, points: Number(e.target.value) })
            }
            min={1}
            max={100}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                onChange({ ...form, isActive: e.target.checked })
              }
              className="rounded border-gray-300 text-[#D4AF37] focus:ring-[#D4AF37]"
            />
            <span className="text-sm text-gray-700">Ativa</span>
          </label>
        </div>
      </div>
    </>
  );
}

// ─── Preview Card ────────────────────────────────────────

function PreviewCard({
  question,
  tab,
  onClose,
}: {
  question: GameQuestion;
  tab: TabType;
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl bg-[#0D0D0D] p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500 uppercase">
          Pré-visualização · {tab === "quiz" ? "Quiz" : "Preferência"}
        </span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-xs"
        >
          Fechar
        </button>
      </div>

      {tab === "quiz" ? (
        <div className="space-y-3">
          {/* Category + difficulty */}
          <div className="flex items-center gap-2">
            {question.category && (
              <span className="text-xs text-gray-500 uppercase">
                {question.category.replace(/_/g, " ")}
              </span>
            )}
            <span className="text-xs text-gray-600">
              {"⭐".repeat(question.difficulty)}
            </span>
          </div>
          {/* Question */}
          <div className="rounded-xl bg-[#1A1A1A] border border-gray-700 p-4">
            <p className="text-white font-medium">{question.questionText}</p>
          </div>
          {/* Options */}
          <div className="space-y-2">
            {(question.options ?? []).map((opt, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm ${
                  i === question.correctAnswerIndex
                    ? "border-green-500 bg-green-500/10 text-green-400"
                    : "border-gray-700 bg-[#1A1A1A] text-gray-400"
                }`}
              >
                <span
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === question.correctAnswerIndex
                      ? "bg-green-500 text-white"
                      : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {i === question.correctAnswerIndex
                    ? "✓"
                    : String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#D4AF37] text-center">
            {question.points} pontos
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-gray-400 text-sm">
            {question.questionText}
          </p>
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl border-2 border-gray-700 bg-[#1A1A1A] p-4 text-center">
              {question.optionA?.imageUrl && (
                <img
                  src={question.optionA.imageUrl}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover mx-auto mb-2"
                />
              )}
              <span className="text-white font-semibold">
                {question.optionA?.label ?? "A"}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-600 font-bold text-sm">VS</span>
            </div>
            <div className="flex-1 rounded-xl border-2 border-gray-700 bg-[#1A1A1A] p-4 text-center">
              {question.optionB?.imageUrl && (
                <img
                  src={question.optionB.imageUrl}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover mx-auto mb-2"
                />
              )}
              <span className="text-white font-semibold">
                {question.optionB?.label ?? "B"}
              </span>
            </div>
          </div>
          <p className="text-xs text-[#D4AF37] text-center">
            {question.points} pontos
          </p>
        </div>
      )}
    </div>
  );
}
