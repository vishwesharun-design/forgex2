import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  RotateCcw, 
  Award, 
  ChevronRight, 
  ChevronLeft, 
  Globe, 
  Share2, 
  Check, 
  ListOrdered, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { ForgeXTheme } from '../types';
import { FormattedMathText } from './MathView';

export interface QuizQuestion {
  id?: number | string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  source?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

export interface QuizConfig {
  title: string;
  topic?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  description?: string;
  questions: QuizQuestion[];
  verifiedFromWeb?: boolean;
}

interface InteractiveQuizProps {
  quiz: QuizConfig;
  theme?: ForgeXTheme;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({ quiz, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const questions = quiz.questions || [];
  const totalQuestions = questions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [viewMode, setViewMode] = useState<'step' | 'list'>('step');
  const [copiedSummary, setCopiedSummary] = useState(false);

  if (totalQuestions === 0) {
    return null;
  }

  const currentQ = questions[currentIndex] || questions[0];
  const hasAnsweredCurrent = selectedAnswers[currentIndex] !== undefined;
  const answeredCount = Object.keys(selectedAnswers).length;

  // Calculate score
  const correctCount = Object.entries(selectedAnswers).reduce((acc, [qIdxStr, optIdx]) => {
    const qIdx = parseInt(qIdxStr, 10);
    const q = questions[qIdx];
    return q && q.correctIndex === optIdx ? acc + 1 : acc;
  }, 0);

  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    // Only allow selecting once per question for authentic quiz feel
    if (selectedAnswers[questionIdx] !== undefined) return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIdx]: optionIdx,
    }));
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setShowSummary(false);
  };

  const handleCopyResults = () => {
    const text = `🎯 Quiz Results: ${quiz.title}\nScore: ${correctCount}/${totalQuestions} (${scorePercentage}%)\nTopic: ${quiz.topic || 'General Knowledge'}\nCompleted via ForgeX`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const diffBadgeColor = (diff?: string) => {
    const d = (diff || quiz.difficulty || 'Medium').toLowerCase();
    if (d === 'easy') {
      return isDark 
        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
        : 'bg-emerald-50 text-emerald-700 border-emerald-300';
    }
    if (d === 'hard') {
      return isDark 
        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
        : 'bg-rose-50 text-rose-700 border-rose-300';
    }
    return isDark 
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
      : 'bg-amber-50 text-amber-700 border-amber-300';
  };

  return (
    <div
      className={`my-3 sm:my-4 rounded-xl sm:rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
        isDark ? 'bg-neutral-900/80 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
      }`}
    >
      {/* Quiz Header Bar */}
      <div
        className={`px-3.5 py-3 sm:px-5 sm:py-3.5 border-b flex flex-wrap items-center justify-between gap-2.5 ${
          isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-neutral-50/90 border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/15 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold tracking-tight truncate font-display">
                {quiz.title}
              </h3>
              {(quiz.difficulty || currentQ.difficulty) && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${diffBadgeColor(currentQ.difficulty || quiz.difficulty)}`}>
                  {currentQ.difficulty || quiz.difficulty}
                </span>
              )}
            </div>
            {quiz.topic && (
              <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">
                Topic: {quiz.topic}
              </p>
            )}
          </div>
        </div>

        {/* View mode toggle & reset */}
        <div className="flex items-center gap-1.5 shrink-0">
          {quiz.verifiedFromWeb && (
            <span
              className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                isDark ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' : 'bg-sky-50 text-sky-700 border-sky-200'
              }`}
              title="Verified using real-time live search"
            >
              <Globe className="w-2.5 h-2.5" />
              <span>Web Verified</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setViewMode((prev) => (prev === 'step' ? 'list' : 'step'))}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
            title={viewMode === 'step' ? 'Switch to All Questions list' : 'Switch to Step-by-Step cards'}
          >
            {viewMode === 'step' ? <ListOrdered className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleResetQuiz}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
            title="Reset Quiz"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress & Live Score Bar */}
      <div className={`px-3.5 sm:px-5 py-2 border-b flex items-center justify-between text-[11px] sm:text-xs ${
        isDark ? 'bg-neutral-950/40 border-neutral-800/60 text-neutral-400' : 'bg-neutral-50/60 border-neutral-200 text-neutral-600'
      }`}>
        <div className="flex items-center gap-2">
          <span>Question <strong>{currentIndex + 1}</strong> of {totalQuestions}</span>
          <span className="text-neutral-500">•</span>
          <span>Answered: <strong>{answeredCount}</strong>/{totalQuestions}</span>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span>Score: <strong className={scorePercentage >= 70 ? 'text-emerald-500' : scorePercentage >= 40 ? 'text-amber-500' : 'text-neutral-400'}>{correctCount}/{answeredCount}</strong></span>
          {answeredCount > 0 && <span>({scorePercentage}%)</span>}
        </div>
      </div>

      {/* Animated Progress Track */}
      <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* MAIN CONTENT AREA */}
      {showSummary ? (
        /* Final Score & Summary View */
        <div className="p-4 sm:p-6 text-center space-y-4 animate-in fade-in duration-200">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Award className="w-8 h-8 sm:w-9 sm:h-9" />
          </div>

          <div>
            <h4 className="text-base sm:text-lg font-bold font-display">
              {scorePercentage >= 80 ? 'Outstanding Mastery! 🌟' : scorePercentage >= 50 ? 'Great Effort! 👍' : 'Keep Practicing! 💡'}
            </h4>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              You scored <span className="font-bold text-neutral-900 dark:text-white">{correctCount}</span> out of{' '}
              <span className="font-bold text-neutral-900 dark:text-white">{totalQuestions}</span> ({scorePercentage}%)
            </p>
          </div>

          {/* Score Bar Breakdown */}
          <div className={`p-3.5 rounded-xl border max-w-sm mx-auto flex items-center justify-around text-xs ${
            isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}>
            <div>
              <div className="text-[10px] text-neutral-500 uppercase font-semibold">Correct</div>
              <div className="text-base font-bold text-emerald-500 mt-0.5">{correctCount}</div>
            </div>
            <div className="w-px h-8 bg-neutral-700/50" />
            <div>
              <div className="text-[10px] text-neutral-500 uppercase font-semibold">Incorrect</div>
              <div className="text-base font-bold text-rose-500 mt-0.5">{answeredCount - correctCount}</div>
            </div>
            <div className="w-px h-8 bg-neutral-700/50" />
            <div>
              <div className="text-[10px] text-neutral-500 uppercase font-semibold">Accuracy</div>
              <div className="text-base font-bold text-amber-500 mt-0.5">{scorePercentage}%</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleResetQuiz}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Quiz</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSummary(false);
                setViewMode('list');
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                isDark ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200' : 'border-neutral-300 hover:bg-neutral-100 text-neutral-800'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Review Answers</span>
            </button>

            <button
              type="button"
              onClick={handleCopyResults}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200' : 'border-neutral-300 hover:bg-neutral-100 text-neutral-800'
              }`}
              title="Copy Results"
            >
              {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : viewMode === 'step' ? (
        /* STEP-BY-STEP QUESTION CARD */
        <div className="p-3.5 sm:p-5 space-y-3.5">
          {/* Question Text */}
          <div className="text-xs sm:text-sm md:text-base font-semibold leading-relaxed text-left">
            <span className="text-amber-500 mr-1.5 font-bold">Q{currentIndex + 1}.</span>
            <FormattedMathText text={currentQ.question} inlineOnly={false} />
          </div>

          {/* Option Buttons */}
          <div className="space-y-2 pt-1">
            {currentQ.options.map((option, optIdx) => {
              const letter = OPTION_LETTERS[optIdx] || String(optIdx + 1);
              const isSelected = selectedAnswers[currentIndex] === optIdx;
              const isCorrect = optIdx === currentQ.correctIndex;
              const hasAnswered = hasAnsweredCurrent;

              let btnStyle = isDark
                ? 'bg-neutral-950/60 border-neutral-800/80 text-neutral-200 hover:border-amber-500/50 hover:bg-neutral-900'
                : 'bg-neutral-50/80 border-neutral-200 text-neutral-800 hover:border-amber-500/60 hover:bg-neutral-100';

              if (hasAnswered) {
                if (isCorrect) {
                  // Correct answer is always highlighted in green
                  btnStyle = isDark
                    ? 'bg-emerald-500/15 border-emerald-500/80 text-emerald-200 ring-1 ring-emerald-500/40'
                    : 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-400';
                } else if (isSelected && !isCorrect) {
                  // User selected wrong answer
                  btnStyle = isDark
                    ? 'bg-rose-500/15 border-rose-500/80 text-rose-200 ring-1 ring-rose-500/40'
                    : 'bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-400';
                } else {
                  // Other unselected options
                  btnStyle = isDark
                    ? 'bg-neutral-950/30 border-neutral-800/40 text-neutral-500 opacity-60'
                    : 'bg-neutral-50/40 border-neutral-200 text-neutral-400 opacity-60';
                }
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  disabled={hasAnswered}
                  onClick={() => handleSelectOption(currentIndex, optIdx)}
                  className={`w-full min-h-[44px] p-2.5 sm:p-3 rounded-xl border text-left flex items-start gap-2.5 sm:gap-3 transition-all cursor-pointer ${btnStyle}`}
                >
                  <span
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      hasAnswered && isCorrect
                        ? 'bg-emerald-500 text-black'
                        : hasAnswered && isSelected && !isCorrect
                        ? 'bg-rose-500 text-white'
                        : isDark
                        ? 'bg-neutral-800 text-neutral-300'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {letter}
                  </span>

                  <div className="flex-1 text-xs sm:text-sm pt-0.5 leading-snug break-words">
                    <FormattedMathText text={option} inlineOnly={true} />
                  </div>

                  {hasAnswered && isCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  {hasAnswered && isSelected && !isCorrect && (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Box (Revealed after answering) */}
          {hasAnsweredCurrent && (
            <div
              className={`p-3 sm:p-3.5 rounded-xl border text-xs leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200 ${
                isDark
                  ? 'bg-neutral-950/70 border-neutral-800/80 text-neutral-300'
                  : 'bg-neutral-100/70 border-neutral-200 text-neutral-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px] sm:text-xs">
                <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className={selectedAnswers[currentIndex] === currentQ.correctIndex ? 'text-emerald-400' : 'text-amber-400'}>
                  {selectedAnswers[currentIndex] === currentQ.correctIndex ? 'Correct! Explanation:' : 'Explanation:'}
                </span>
              </div>
              <div className="text-neutral-300 dark:text-neutral-300 leading-relaxed">
                <FormattedMathText text={currentQ.explanation} />
              </div>
              {currentQ.source && (
                <div className="mt-1.5 pt-1.5 border-t border-dashed border-neutral-800/60 flex items-center gap-1 text-[10px] text-neutral-500">
                  <Globe className="w-2.5 h-2.5" />
                  <span>Source: {currentQ.source}</span>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-800/40">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                currentIndex === 0
                  ? 'opacity-40 cursor-not-allowed border-transparent'
                  : isDark
                  ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSummary(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-black hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Finish & View Score</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ALL QUESTIONS REVIEW LIST MODE */
        <div className="p-3.5 sm:p-5 space-y-5">
          {questions.map((q, qIdx) => {
            const hasAnswered = selectedAnswers[qIdx] !== undefined;
            const selectedOpt = selectedAnswers[qIdx];

            return (
              <div
                key={qIdx}
                className={`p-3.5 rounded-xl border text-left space-y-2.5 ${
                  isDark ? 'bg-neutral-950/40 border-neutral-800/70' : 'bg-neutral-50/60 border-neutral-200'
                }`}
              >
                <div className="text-xs sm:text-sm font-semibold">
                  <span className="text-amber-500 mr-1.5">Q{qIdx + 1}.</span>
                  <FormattedMathText text={q.question} inlineOnly={false} />
                </div>

                <div className="space-y-1.5">
                  {q.options.map((opt, optIdx) => {
                    const letter = OPTION_LETTERS[optIdx] || String(optIdx + 1);
                    const isSelected = selectedOpt === optIdx;
                    const isCorrect = optIdx === q.correctIndex;

                    let rowStyle = isDark
                      ? 'bg-neutral-900/60 border-neutral-800 text-neutral-300'
                      : 'bg-white border-neutral-200 text-neutral-800';

                    if (hasAnswered) {
                      if (isCorrect) {
                        rowStyle = isDark
                          ? 'bg-emerald-500/15 border-emerald-500/70 text-emerald-200'
                          : 'bg-emerald-50 border-emerald-500 text-emerald-900';
                      } else if (isSelected && !isCorrect) {
                        rowStyle = isDark
                          ? 'bg-rose-500/15 border-rose-500/70 text-rose-200'
                          : 'bg-rose-50 border-rose-500 text-rose-900';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={hasAnswered}
                        onClick={() => handleSelectOption(qIdx, optIdx)}
                        className={`w-full min-h-[38px] p-2 rounded-lg border text-left flex items-center gap-2 text-xs transition-colors cursor-pointer ${rowStyle}`}
                      >
                        <span className="w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[11px] shrink-0 bg-neutral-800/80 text-neutral-200">
                          {letter}
                        </span>
                        <div className="flex-1 break-words">
                          <FormattedMathText text={opt} inlineOnly={true} />
                        </div>
                        {hasAnswered && isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        {hasAnswered && isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {hasAnswered && (
                  <div className={`p-2.5 rounded-lg text-xs leading-relaxed border ${
                    isDark ? 'bg-neutral-900/80 border-neutral-800 text-neutral-300' : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}>
                    <span className="font-semibold text-amber-500 mr-1">Explanation:</span>
                    <FormattedMathText text={q.explanation} />
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowSummary(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>View Final Score & Results</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
