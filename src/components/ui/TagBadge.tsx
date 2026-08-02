interface TagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
  onClick?: () => void;
}

export function TagBadge({ name, color, onRemove, onClick }: TagBadgeProps) {
  return (
    <span
      className="meta-badge tag-badge cursor-pointer"
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
