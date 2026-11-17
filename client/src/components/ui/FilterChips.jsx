import { X } from 'lucide-react';

// Shows what is currently filtering the list, with one-click removal of each filter or all of them.
export default function FilterChips({ chips, onClearAll }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 sm:px-5">
      {chips.map((chip) => (
        <span key={chip.key} className="inline-flex items-center gap-1 rounded-full bg-pine-50 py-1 pl-3 pr-1 text-xs font-medium text-pine-800">
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-pine-100"
            aria-label={`Remove filter ${chip.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button type="button" onClick={onClearAll} className="ml-1 text-xs font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
        Clear all
      </button>
    </div>
  );
}
