import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onActionSelect: (action: string) => void;
}

const actions = [
  { label: "Math problem", action: "Solve: 12 / (3 + 1)" },
  { label: "Define a term", action: "Define: recursion" },
  { label: "Tell a joke", action: "Tell me a joke" },
  { label: "Vacation ideas", action: "Give me vacation ideas" },
  { label: "Start trivia", action: "Start a trivia game" },
  { label: "Search Wikipedia", action: "wikipedia" },
  { label: "Random article", action: "Tell me about a random Wikipedia article" },
  { label: "Book recommendation", action: "Recommend a book for me" },
];

export default function QuickActions({ onActionSelect }: QuickActionsProps) {
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            className="rounded-full h-7 px-3 text-xs font-medium border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 hover:text-purple-800 transition-colors"
            onClick={() => onActionSelect(action.action)}
            data-testid={`chip-action-${idx}`}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
