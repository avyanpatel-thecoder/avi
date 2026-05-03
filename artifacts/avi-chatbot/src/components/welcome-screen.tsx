import { Bot, Calculator, BookOpen, Laugh, Plane, Target, Globe, Dices, BookMarked } from "lucide-react";
import { Card } from "@/components/ui/card";

interface WelcomeScreenProps {
  onSelectAction: (action: string) => void;
}

const features = [
  {
    icon: <Bot className="w-6 h-6" />,
    title: "Tech & Programming",
    description: "Ask me anything about tech!",
    action: "Tell me a fun fact about programming!"
  },
  {
    icon: <Calculator className="w-6 h-6" />,
    title: "Math Problems",
    description: "I'll solve any math problem step by step",
    action: "Can you help me solve a math problem?"
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: "Define Coding Terms",
    description: "Learn what coding words mean",
    action: "Define 'recursion' for me."
  },
  {
    icon: <Laugh className="w-6 h-6" />,
    title: "Tell a Joke",
    description: "Need a laugh?",
    action: "Tell me a joke!"
  },
  {
    icon: <Plane className="w-6 h-6" />,
    title: "Vacation Ideas",
    description: "Where should I go next?",
    action: "Give me some cool vacation ideas!"
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Trivia Game",
    description: "Test your knowledge!",
    action: "Let's play a trivia game!"
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Wikipedia Search",
    description: "Search any topic",
    action: "wikipedia" // Special action handled by parent
  },
  {
    icon: <Dices className="w-6 h-6" />,
    title: "Random Wikipedia",
    description: "Discover something new",
    action: "random_wikipedia" // Special action handled by parent if needed, or just standard prompt
  },
  {
    icon: <BookMarked className="w-6 h-6" />,
    title: "Book Suggestions",
    description: "Find your next great read",
    action: "Can you recommend a good book for a kid?"
  }
];

export default function WelcomeScreen({ onSelectAction }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-24 h-24 rounded-[2rem] bg-avi-gradient flex items-center justify-center shadow-xl mb-8 transform hover:scale-105 transition-transform duration-300">
        <span className="text-white font-black text-3xl tracking-wider">AVI</span>
      </div>
      
      <h1 className="text-4xl md:text-5xl font-extrabold text-center text-gray-900 mb-4 tracking-tight">
        Hi! I'm <span className="text-avi-gradient">AVI</span>
      </h1>
      <p className="text-lg md:text-xl text-gray-500 text-center max-w-lg mb-12">
        Your super smart, always fun AI best friend. What do you want to explore today?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {features.map((feature, idx) => (
          <Card 
            key={idx}
            className="p-5 flex flex-col gap-3 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200 border-2 border-transparent bg-white group rounded-2xl"
            onClick={() => onSelectAction(feature.action)}
            data-testid={`card-feature-${idx}`}
          >
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-700 group-hover:text-white group-hover:bg-avi-gradient transition-colors duration-300">
              {feature.icon}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{feature.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
