import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Lightbulb, 
  Copy, 
  Check, 
  Share2, 
  RotateCcw,
  X,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { ForgeXTheme } from '../types';
import { FormattedMathText } from './MathView';

export interface QuizQuestion {
  id?: number | string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint?: string;
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
  onNextQuiz?: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({ 
  quiz, 
  theme = 'dark',
  onNextQuiz
}) => {
  const isDark = theme === 'dark';
  const questions = quiz.questions || [];
  const totalQuestions = questions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [copiedQuestion, setCopiedQuestion] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  if (totalQuestions === 0) {
    return null;
  }

  const currentQ = questions[currentIndex] || questions[0];
  const hasSelectedCurrent = selectedAnswers[currentIndex] !== undefined;

  // Calculate scores
  const correctCount = Object.entries(selectedAnswers).reduce((acc, [qIdxStr, optIdx]) => {
    const qIdx = parseInt(qIdxStr, 10);
    const q = questions[qIdx];
    return q && q.correctIndex === optIdx ? acc + 1 : acc;
  }, 0);

  const handleSelectOption = (optIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optIdx,
    }));
  };

  // When navigating, hint dynamically stays adjusted to the current question
  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowSummary(true);
      setShowHint(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setShowSummary(false);
    setShowHint(false);
  };

  const handleCopyQuestion = () => {
    const qText = `${currentQ.question}\n${currentQ.options.map((opt, i) => `${OPTION_LETTERS[i]}. ${opt}`).join('\n')}`;
    navigator.clipboard.writeText(qText);
    setCopiedQuestion(true);
    setTimeout(() => setCopiedQuestion(false), 2000);
  };

  const handleCopySummary = () => {
    const summaryText = `${quiz.title || 'Quiz'}\nYou got ${correctCount} out of ${totalQuestions} correct (${totalQuestions} total questions).\n\n` +
      questions.map((q, idx) => {
        const userOpt = selectedAnswers[idx] !== undefined ? q.options[selectedAnswers[idx]] : 'Skipped';
        const isRight = selectedAnswers[idx] === q.correctIndex;
        return `${idx + 1}/${totalQuestions}. ${q.question}\n${isRight ? '✓ Correct' : `✕ Incorrect (You answered: ${userOpt})`}\n${q.explanation}\n`;
      }).join('\n');

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  /* =========================================================================
     FINAL SCORE & REVIEW VIEW
     ========================================================================= */
  if (showSummary) {
    return (
      <div
        className={`my-3 sm:my-4 rounded-2xl sm:rounded-3xl border transition-all duration-300 ease-in-out overflow-hidden shadow-xs w-full max-w-2xl mx-auto ${
          isDark 
            ? 'bg-[#212121] border-neutral-800 text-neutral-100' 
            : 'bg-white border-neutral-200/90 text-neutral-900'
        }`}
      >
        <div className="p-4 sm:p-7 overflow-hidden w-full">
          {/* Top Header Row: Title & Action Icons */}
          <div className="flex items-center justify-between gap-3 text-neutral-600 dark:text-neutral-300 pb-2 border-b border-neutral-100 dark:border-neutral-800/60">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm sm:text-base font-medium truncate">
                {quiz.title || 'Knowledge Quiz'}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 shrink-0">
                {totalQuestions} Questions Total
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopySummary}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
                title="Copy results"
              >
                {copiedSummary ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleCopySummary}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
                title="Share quiz"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Headline: "You got 3 out of 9 correct. Review your answers below." */}
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base sm:text-lg mt-4 mb-5 break-words">
            You got {correctCount} out of {totalQuestions} correct. Review your answers below.
          </h3>

          {/* Question Review List */}
          <div className="space-y-5 sm:space-y-6 w-full">
            {questions.map((q, idx) => {
              const userAns = selectedAnswers[idx];
              const isCorrect = userAns === q.correctIndex;
              const hasAnswered = userAns !== undefined;

              return (
                <div key={idx} className="flex items-start gap-3 sm:gap-3.5 text-left w-full overflow-hidden">
                  {/* Status Circle Badge (Red ✕ or Green ✓) */}
                  {isCorrect ? (
                    <div 
                      className="w-5 h-5 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
                      title="Correct"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div 
                      className="w-5 h-5 rounded-full bg-[#ef4444] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
                      title="Incorrect"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  {/* Question and Explanations */}
                  <div className="flex-1 min-w-0 overflow-hidden break-words">
                    {/* Question text with question number out of total */}
                    <div className="text-sm sm:text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 leading-snug break-words">
                      <span className="text-neutral-400 dark:text-neutral-500 font-normal mr-1.5 text-xs">
                        [{idx + 1} of {totalQuestions}]
                      </span>
                      <FormattedMathText text={q.question} inlineOnly={false} />
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed break-words">
                        <FormattedMathText text={q.explanation} />
                      </div>
                    )}

                    {/* User answer feedback note */}
                    {!isCorrect && (
                      <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed break-words">
                        <span>You answered: </span>
                        {hasAnswered ? (
                          <span className="font-medium text-neutral-800 dark:text-neutral-200">
                            <FormattedMathText text={q.options[userAns]} inlineOnly={true} />
                          </span>
                        ) : (
                          <span className="italic">Skipped</span>
                        )}
                        {q.options[q.correctIndex] && (
                          <span>. Correct answer: <FormattedMathText text={q.options[q.correctIndex]} inlineOnly={true} />.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action Buttons: "Try again" (left) and "Next quiz" (right) */}
          <div className="flex items-center justify-between pt-6 border-t border-neutral-100 dark:border-neutral-800/80 mt-6">
            <button
              type="button"
              onClick={handleResetQuiz}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDark 
                  ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200' 
                  : 'border-neutral-300 hover:bg-neutral-100 text-neutral-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try again</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNextQuiz) {
                  onNextQuiz();
                } else {
                  handleResetQuiz();
                }
              }}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-opacity cursor-pointer shadow-xs ml-auto ${
                isDark 
                  ? 'bg-white text-neutral-900 hover:opacity-90' 
                  : 'bg-neutral-900 text-white hover:opacity-90'
              }`}
            >
              <span>Next quiz</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     ACTIVE QUESTION CARD (Self-Adjusting Screen & Hint Layout)
     - Adjusts container and typography dynamically to question length & complexity
     - Dynamically adjusts the hint box according to question and answer state
     ========================================================================= */

  // Dynamic question complexity calculations
  const qText = currentQ.question || '';
  const isShortQ = qText.length < 80 && !qText.includes('\n');
  const isLongQ = qText.length > 200 || qText.includes('\n');

  // Check if options are short to use a compact, adaptive grid
  const allOptionsShort = currentQ.options.every((opt) => opt.length < 28 && !opt.includes('\n'));

  // Dynamic hint & explanation calculation for current question
  const currentHintText = currentQ.hint || currentQ.explanation || 'Review the core definition or mathematical rule governing this concept.';
  const hasAnsweredCurrent = selectedAnswers[currentIndex] !== undefined;
  const isCurrentCorrect = selectedAnswers[currentIndex] === currentQ.correctIndex;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div
      className={`my-3 sm:my-4 rounded-2xl sm:rounded-3xl border transition-all duration-300 ease-in-out overflow-hidden shadow-xs w-full max-w-2xl mx-auto ${
        isDark 
          ? 'bg-[#212121] border-neutral-800 text-neutral-100' 
          : 'bg-white border-neutral-200/90 text-neutral-900'
      }`}
    >
      {/* Top Subtle Progress Track */}
      <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800/80 overflow-hidden">
        <div 
          className="h-full bg-amber-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="p-4 sm:p-6 md:p-7 overflow-hidden w-full transition-all duration-300">
        {/* Top Header Row: Question Counter & Controls Bar */}
        <div className="flex items-center justify-between gap-2.5 pb-2.5 mb-3 border-b border-neutral-100 dark:border-neutral-800/60 select-none">
          {/* Left: Total Question Indicator */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 truncate">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 shrink-0">
              {totalQuestions} total
            </span>
          </div>

          {/* Right Controls: < 1 of 9 >, Lightbulb, Copy, Share */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 text-neutral-500 dark:text-neutral-400">
            {/* Previous Chevron */}
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={handlePrev}
              className={`p-1 rounded-md transition-colors ${
                currentIndex === 0 
                  ? 'text-neutral-300 dark:text-neutral-700 cursor-not-allowed' 
                  : 'hover:text-neutral-900 dark:hover:text-white cursor-pointer'
              }`}
              title="Previous question"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* "1 of 9" count */}
            <span className="text-xs sm:text-sm font-normal text-neutral-600 dark:text-neutral-400 px-0.5 whitespace-nowrap">
              {currentIndex + 1} of {totalQuestions}
            </span>

            {/* Next Chevron */}
            <button
              type="button"
              disabled={currentIndex === totalQuestions - 1}
              onClick={handleNext}
              className={`p-1 rounded-md transition-colors ${
                currentIndex === totalQuestions - 1 
                  ? 'text-neutral-300 dark:text-neutral-700 cursor-not-allowed' 
                  : 'hover:text-neutral-900 dark:hover:text-white cursor-pointer'
              }`}
              title="Next question"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Lightbulb (Hint/Explanation Toggle) - Dynamically highlights when hint is open */}
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ml-1 ${
                showHint
                  ? 'text-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
              title={showHint ? "Hide hint" : "Show hint & explanation"}
            >
              <Lightbulb className="w-4 h-4" />
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyQuestion}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Copy question"
            >
              {copiedQuestion ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleCopyQuestion}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Question Prompt Area (Self-Adjusting Typography & Padding) */}
        <div 
          className={`w-full text-neutral-900 dark:text-neutral-100 text-left break-words overflow-hidden transition-all duration-200 ${
            isShortQ
              ? 'text-[16px] sm:text-[18px] font-semibold leading-snug py-1'
              : isLongQ
              ? 'text-[14px] sm:text-[15px] font-medium leading-relaxed py-0.5'
              : 'text-[15px] sm:text-[16px] font-medium leading-relaxed py-0.5'
          }`}
        >
          <FormattedMathText text={currentQ.question} inlineOnly={false} />
        </div>

        {/* Self-Adjusting Hint Box (Dynamically adapts content, height, and role) */}
        {showHint && (
          <div 
            className={`mt-3.5 p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 ease-out animate-in fade-in duration-200 break-words ${
              hasAnsweredCurrent
                ? isCurrentCorrect
                  ? isDark
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : isDark
                  ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
                : isDark 
                ? 'bg-neutral-900/90 border-neutral-700/80 text-neutral-300' 
                : 'bg-amber-50/80 border-amber-200/90 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-[13px] text-amber-600 dark:text-amber-400">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {hasAnsweredCurrent 
                    ? `Explanation for Question ${currentIndex + 1}:` 
                    : `Hint for Question ${currentIndex + 1}:`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHint(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer text-xs"
                title="Dismiss hint"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-xs sm:text-[13px] leading-relaxed max-h-60 overflow-y-auto pr-1">
              <FormattedMathText text={currentHintText} />
            </div>
          </div>
        )}

        {/* Dynamic Options Stack or Grid (Self-Adjusting to option text length) */}
        <div 
          className={`mt-5 sm:mt-6 w-full ${
            allOptionsShort
              ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3'
              : 'space-y-2.5 sm:space-y-3'
          }`}
        >
          {currentQ.options.map((option, optIdx) => {
            const letter = OPTION_LETTERS[optIdx] || String(optIdx + 1);
            const isSelected = selectedAnswers[currentIndex] === optIdx;

            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => handleSelectOption(optIdx)}
                className={`w-full min-h-[46px] h-auto px-3.5 py-3 rounded-2xl border text-left flex items-start sm:items-center gap-3 sm:gap-3.5 transition-all cursor-pointer min-w-0 overflow-hidden ${
                  isSelected
                    ? isDark
                      ? 'border-neutral-400 bg-neutral-800/90 text-white shadow-xs'
                      : 'border-neutral-900 bg-neutral-100 text-neutral-950 shadow-xs'
                    : isDark
                    ? 'border-neutral-800/90 hover:bg-neutral-800/50 hover:border-neutral-700 text-neutral-200'
                    : 'border-neutral-200/90 hover:bg-neutral-50 hover:border-neutral-300 text-neutral-800'
                }`}
              >
                {/* Circular letter indicator (A, B, C, D) */}
                <span
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center text-xs sm:text-sm font-medium shrink-0 transition-colors mt-0.5 sm:mt-0 ${
                    isSelected
                      ? isDark
                        ? 'border-white bg-white text-neutral-900 font-bold'
                        : 'border-neutral-900 bg-neutral-900 text-white font-bold'
                      : isDark
                      ? 'border-neutral-700 text-neutral-300 bg-transparent'
                      : 'border-neutral-300 text-neutral-700 bg-transparent'
                  }`}
                >
                  {letter}
                </span>

                {/* Option text with KaTeX support and full text wrapping */}
                <div className="flex-1 min-w-0 text-sm sm:text-[15px] font-normal leading-normal text-left break-words overflow-x-auto max-w-full">
                  <FormattedMathText text={option} inlineOnly={true} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Bar: Progress on left, "Next" Button on Right */}
        <div className="flex items-center justify-between pt-5 mt-3 border-t border-neutral-100 dark:border-neutral-800/40">
          <div className="text-xs text-neutral-400 dark:text-neutral-500 font-normal">
            <span>{Object.keys(selectedAnswers).length} of {totalQuestions} answered</span>
          </div>

          <button
            type="button"
            disabled={!hasSelectedCurrent}
            onClick={handleNext}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
              hasSelectedCurrent
                ? isDark
                  ? 'bg-white text-neutral-900 hover:opacity-90 cursor-pointer shadow-xs'
                  : 'bg-neutral-900 text-white hover:opacity-90 cursor-pointer shadow-xs'
                : isDark
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            }`}
          >
            {currentIndex === totalQuestions - 1 ? `Finish (${totalQuestions}/${totalQuestions})` : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
