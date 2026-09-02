import { ReactNode, useEffect, useState } from "react";
import { Link } from "wouter";
import {
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  ArrowLeft,
  HelpCircle,
  BookOpen,
  Shield,
  Zap,
  CheckCircle,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import aviLogo from "@assets/avi_logo_gradient_refined.jpg_1777827450516.jpg";

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    category: "Getting Started",
    question: "What is AVI?",
    answer:
      "AVI (Artificial Virtual Intelligence) is a kid-friendly AI chatbot designed to help children learn, explore, and have fun. AVI can answer questions about tech, solve math problems, tell jokes, suggest books, play trivia, and much more — all in a safe, age-appropriate way.",
  },
  {
    category: "Getting Started",
    question: "Is AVI free to use?",
    answer:
      "Yes! AVI is completely free to use. Just open the chat and start asking questions — no account or sign-up required.",
  },
  {
    category: "Getting Started",
    question: "What age group is AVI designed for?",
    answer:
      "AVI is designed primarily for children and young learners, but anyone curious and looking for a friendly AI assistant can enjoy it. All responses are filtered to be safe and appropriate for kids.",
  },
  {
    category: "Features",
    question: "What can I ask AVI?",
    answer:
      "You can ask AVI almost anything kid-friendly! Popular topics include: tech & programming questions, math help, coding term definitions, jokes, vacation ideas, trivia games, Wikipedia searches, and book recommendations.",
  },
  {
    category: "Features",
    question: "How does the Wikipedia search work?",
    answer:
      "Click the 'Wikipedia Search' quick action or type 'search [topic]' in the chat. AVI will pull a kid-friendly summary of the topic directly from Wikipedia and present it in an easy-to-read format.",
  },
  {
    category: "Safety",
    question: "Is AVI safe for children?",
    answer:
      "Absolutely. AVI is built with a kid-friendly content filter that blocks inappropriate topics and redirects harmful questions. Every response is designed to be educational, positive, and age-appropriate.",
  },
  {
    category: "Safety",
    question: "What happens if I ask AVI something inappropriate?",
    answer:
      "AVI will politely decline and redirect the conversation to a more appropriate topic. It won't lecture or shame — it simply guides things back to something fun and helpful.",
  },
  {
    category: "Technical",
    question: "Why is AVI sometimes slow to respond?",
    answer:
      "AVI's responses are generated in real time by an AI. Longer or more complex questions may take a moment to think through. If the response seems stuck for more than 30 seconds, try refreshing the page.",
  },
  {
    category: "Technical",
    question: "Are my chat conversations saved?",
    answer:
      "Chat history is saved locally so you can pick up where you left off. You can start a new chat anytime using the history panel. Conversations are tied to your browser session.",
  },
];

const categories = ["All", "Getting Started", "Features", "Safety", "Technical"];

const categoryIcons: Record<string, ReactNode> = {
  "Getting Started": <Zap className="w-4 h-4" />,
  Features: <BookOpen className="w-4 h-4" />,
  Safety: <Shield className="w-4 h-4" />,
  Technical: <HelpCircle className="w-4 h-4" />,
};

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function CustomerSupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [form, setForm] = useState<FormState>({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const scriptId = "avi-tawk-widget";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.src = "https://embed.tawk.to/691fe78c8b4f421956e2a026/1jaia0vri";
      script.charset = "UTF-8";
      script.setAttribute("crossorigin", "*");
      document.body.appendChild(script);
    }

    return () => {
      document.getElementById(scriptId)?.remove();
      const tawkBubble = document.querySelector(
        'iframe[title*="chat"], iframe[title*="Tawk"]',
      );
      tawkBubble?.parentElement?.remove();
    };
  }, []);

  const openLiveChat = () => {
    const tawk = (
      window as Window & {
        Tawk_API?: { maximize?: () => void };
      }
    ).Tawk_API;
    if (tawk?.maximize) {
      tawk.maximize();
    }
  };

  const filteredFaqs =
    activeCategory === "All" ? faqs : faqs.filter((f) => f.category === activeCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const BASE = import.meta.env.BASE_URL;
      const res = await fetch(`${BASE}api/support/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-purple-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={aviLogo} alt="AVI" className="h-9 w-auto object-contain rounded-lg" />
            <div>
              <h1 className="font-bold text-purple-900 text-sm leading-none">AVI</h1>
              <p className="text-xs text-purple-400 mt-0.5">Customer Support</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50">
              <ArrowLeft className="w-4 h-4" />
              Back to Chat
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
          <MessageCircle className="w-3.5 h-3.5" />
          We're here to help
        </div>
        <h2 className="text-4xl font-bold text-purple-900 mb-4 leading-tight">
          How can we help you?
        </h2>
        <p className="text-purple-500 text-lg max-w-xl mx-auto">
          Browse our FAQ for quick answers, or send us a message and we'll get back to you.
        </p>
      </section>

      {/* Quick contact cards */}
       <section className="max-w-5xl mx-auto px-6 pb-14 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-purple-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-purple-100 rounded-xl p-3">
            <MessageCircle className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900 mb-1">Chat with AVI</h3>
            <p className="text-sm text-purple-400 mb-3">
              Many answers live right inside the chatbot. Ask AVI directly!
            </p>
            <Link href="/">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs">
                Open Chat
              </Button>
            </Link>
          </div>
        </div>
        <div className="bg-white border border-purple-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-orange-100 rounded-xl p-3">
            <Mail className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900 mb-1">Email Support</h3>
            <p className="text-sm text-purple-400 mb-3">
              Send us a message using the form below and we'll reply within 24 hours.
            </p>
            <a href="#contact-form">
              <Button size="sm" variant="outline" className="rounded-xl text-xs border-orange-200 text-orange-600 hover:bg-orange-50">
                Send a Message
              </Button>
            </a>
          </div>
        </div>
        <div className="bg-white border border-green-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-green-100 rounded-xl p-3">
            <Headphones className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900 mb-1">Live Support</h3>
            <p className="text-sm text-purple-400 mb-3">
              Chat with our customer support team when someone is available.
            </p>
            <Button
              size="sm"
              onClick={openLiveChat}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs"
            >
              Start Live Chat
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-purple-900 mb-6">Frequently Asked Questions</h2>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white border border-purple-100 text-purple-500 hover:border-purple-300 hover:text-purple-700"
              }`}
            >
              {cat !== "All" && categoryIcons[cat]}
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ items */}
        <div className="space-y-3">
          {filteredFaqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 ${
                  isOpen ? "border-purple-300 shadow-sm" : "border-purple-100 hover:border-purple-200"
                }`}
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left gap-4"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold bg-purple-50 text-purple-400 px-2 py-0.5 rounded-full shrink-0">
                      {faq.category}
                    </span>
                    <span className="font-medium text-purple-900 text-sm">{faq.question}</span>
                  </div>
                  <div className="shrink-0 text-purple-400">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-purple-600 leading-relaxed border-t border-purple-50 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Contact Form */}
      <section
        id="contact-form"
        className="max-w-5xl mx-auto px-6 pb-20"
      >
        <div className="bg-white border border-purple-100 rounded-3xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-purple-900 mb-2">Send us a message</h2>
          <p className="text-purple-400 text-sm mb-8">
            Can't find your answer above? Fill out the form and we'll get back to you within 24 hours.
          </p>

          {submitted ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="font-bold text-purple-900 text-lg">Message sent!</h3>
              <p className="text-purple-400 text-sm max-w-sm">
                Thanks for reaching out. We'll review your message and get back to you within 24 hours.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 rounded-xl border-purple-200 text-purple-600 hover:bg-purple-50"
                onClick={() => setSubmitted(false)}
              >
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-purple-700">Your Name</label>
                <Input
                  placeholder="Alex Smith"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="rounded-xl border-purple-100 focus:border-purple-400 focus:ring-purple-200"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-purple-700">Email Address</label>
                <Input
                  type="email"
                  placeholder="alex@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="rounded-xl border-purple-100 focus:border-purple-400 focus:ring-purple-200"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-purple-700">Subject</label>
                <Input
                  placeholder="What's this about?"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                  className="rounded-xl border-purple-100 focus:border-purple-400 focus:ring-purple-200"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-purple-700">Message</label>
                <Textarea
                  placeholder="Describe your question or issue..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  rows={5}
                  className="rounded-xl border-purple-100 focus:border-purple-400 focus:ring-purple-200 resize-none"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-8 gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-100 bg-white/60">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-purple-300">
          <div className="flex items-center gap-2">
            <img src={aviLogo} alt="AVI" className="h-5 w-auto object-contain rounded" />
            <span>© 2026 AVI — Artificial Virtual Intelligence</span>
          </div>
          <Link href="/" className="hover:text-purple-500 transition-colors">
            ← Back to Chat
          </Link>
        </div>
      </footer>
    </div>
  );
}
