interface TagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
  onClick?: () => void;
}

export function TagBadge({ name, color, onRemove, onClick }: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity"
      style={{ backgroundColor: color + '20', color: color }}
      onClick={onClick}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-60 font-bold"
        >
          ×
        </button>
      )}
    </span>
  );
}
