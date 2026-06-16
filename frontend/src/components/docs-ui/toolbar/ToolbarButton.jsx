import { cn } from "@/lib/utils.js";

const ToolbarButton = ({ Icon, onClick = null, isActive = false, label, disabled = false }) => {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      className={cn(
        "h-7 min-w-7 flex items-center justify-center rounded-md hover:bg-[#e2e7eb] p-1 mx-1 transition-colors",
        isActive && "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]",
        disabled && "opacity-40 pointer-events-none"
      )}
    >
      <Icon size={16} />
    </button>
  );
};

export default ToolbarButton;
