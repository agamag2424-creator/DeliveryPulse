interface VelocityBarProps {
  tasksCompleted: number;
  tasksPlanned: number;
}

function getVelocityColor(percent: number) {
  if (percent >= 80) return "#10B981";
  if (percent >= 50) return "#F59E0B";
  return "#EF4444";
}

export function VelocityBar({ tasksCompleted, tasksPlanned }: VelocityBarProps) {
  const safePlanned = Math.max(1, tasksPlanned);
  const percent = Math.max(0, Math.min(100, Math.round((tasksCompleted / safePlanned) * 100)));

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-full rounded bg-gray-700">
        <div
          className="h-2 rounded"
          style={{
            width: `${percent}%`,
            backgroundColor: getVelocityColor(percent),
          }}
        />
      </div>
      <span className="text-xs text-gray-400">
        {tasksCompleted}/{tasksPlanned}
      </span>
    </div>
  );
}
