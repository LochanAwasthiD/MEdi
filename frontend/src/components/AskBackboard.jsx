import { useState } from "react";
import { api, apiErr } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Loader2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useProfiles } from "@/context/ProfileContext";
import { toast } from "sonner";

const QUICK = [
  "Summarize my recent records",
  "What are my current medications?",
  "Any drug interactions to worry about?",
];

export default function AskBackboard() {
  const { active } = useProfiles();
  const [input, setInput] = useState("");
  const [reply, setReply] = useState(null);
  const [loading, setLoading] = useState(false);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q) return;
    setLoading(true); setReply(null);
    try {
      const { data } = await api.post("/ai/chat", { profile_id: active.id, message: q });
      setReply(data.reply);
      setInput("");
    } catch (e) { toast.error(apiErr(e)); }
    finally { setLoading(false); }
  };

  return (
    <Card className="p-6" data-testid="ask-backboard-widget">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center"><Bot className="w-5 h-5 text-teal-700" /></div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white">Ask Backboard</h3>
          <p className="text-xs text-slate-500">Gemini-grounded on your records</p>
        </div>
        <Link to="/assistant" className="text-xs text-teal-700 hover:underline flex items-center gap-1">Full chat<ArrowRight className="w-3 h-3" /></Link>
      </div>
      {reply && (
        <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-white leading-relaxed fade-up">
          {reply}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask a quick question…" className="resize-none min-h-[40px] max-h-24" data-testid="ask-backboard-input" />
        <Button onClick={() => send()} disabled={loading || !input.trim()} className="bg-teal-700 hover:bg-teal-800 text-white" data-testid="ask-backboard-send">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button key={q} onClick={() => send(q)} disabled={loading}
            className="px-2.5 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400 hover:text-teal-700 transition-colors disabled:opacity-50">
            {q}
          </button>
        ))}
      </div>
    </Card>
  );
}
