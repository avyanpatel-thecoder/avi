import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
    <div className="w-full relative">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-2 p-1 pb-3">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="rounded-full bg-white border-gray-200 text-gray-600 hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors"
              onClick={() => onActionSelect(action.action)}
              data-testid={`chip-action-${idx}`}
            >
              {action.label}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
