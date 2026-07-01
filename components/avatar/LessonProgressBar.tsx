import {
  getLessonProgressPercent,
  LESSON_STAGES,
  type LessonStageDefinition
} from "@/lib/lesson-progress";

type LessonProgressBarProps = {
  currentStage: LessonStageDefinition;
};

export function LessonProgressBar({ currentStage }: LessonProgressBarProps) {
  const progressPercent = getLessonProgressPercent(currentStage.number);

  return (
    <div className="rounded-lg border border-[#121212]/10 bg-white px-4 py-3 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-[#121212]/60">Прогресс урока</p>
        <p className="text-xs font-bold text-violet">
          Этап {currentStage.number}: {currentStage.title}
        </p>
      </div>

      <div
        aria-label={`Прогресс урока ${progressPercent} процентов`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progressPercent}
        className="mt-3 h-2 overflow-hidden rounded-full bg-[#121212]/10"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-mint via-violet to-coral transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ol className="mt-3 grid grid-cols-5 gap-1">
        {LESSON_STAGES.map((stage) => {
          const isComplete = stage.number < currentStage.number;
          const isCurrent = stage.number === currentStage.number;

          return (
            <li
              className={`rounded-md px-1 py-1.5 text-center text-[9px] font-bold leading-tight sm:text-[10px] ${
                isCurrent
                  ? "bg-[#121212] text-white"
                  : isComplete
                    ? "bg-mint/20 text-[#121212]"
                    : "bg-[#f7f3eb] text-[#121212]/45"
              }`}
              key={stage.number}
            >
              {stage.number}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
