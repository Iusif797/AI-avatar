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
    <div className="rounded-lg border border-[#121212]/10 bg-white/84 px-4 py-4 shadow-[0_18px_45px_rgba(18,18,18,0.08)] backdrop-blur">
      <div className="grid min-w-0 gap-2 sm:flex sm:items-center sm:justify-between">
        <p className="text-xs font-black uppercase tracking-wide text-[#121212]/60">Прогресс урока</p>
        <p className="w-fit max-w-full truncate rounded-full bg-violet/10 px-2.5 py-1 text-xs font-bold text-violet">
          Этап {currentStage.number}: {currentStage.title}
        </p>
      </div>

      <div
        aria-label={`Прогресс урока ${progressPercent} процентов`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progressPercent}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#121212]/8 shadow-inner"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-mint via-violet to-coral shadow-[0_0_18px_rgba(105,87,168,0.28)] transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ol className="mt-3 grid grid-cols-5 gap-1">
        {LESSON_STAGES.map((stage) => {
          const isComplete = stage.number < currentStage.number;
          const isCurrent = stage.number === currentStage.number;

          return (
            <li
              className={`rounded-md px-1 py-2 text-center text-[9px] font-bold leading-tight transition sm:text-[10px] ${
                isCurrent
                  ? "bg-[#121212] text-white shadow-md"
                  : isComplete
                    ? "bg-mint/16 text-[#121212]"
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
