import { useEffect, useRef, useState } from "react";
import { api, apiErr } from "@/lib/api";
import { useProfiles } from "@/context/ProfileContext";
import { Send, Trash2, Volume2, VolumeX, Sparkles, Loader2, Bot, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

function speak(text, onStop) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1; u.pitch = 1;
  u.onend = onStop; u.onerror = onStop;
  window.speechSynthesis.speak(u);
}

export default function AIAssistant() {
  const { active } = useProfiles();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const endRef = useRef(null);

  const load = async () => {
    if (!active) return;
    const { data } = await api.get(`/ai/history?profile_id=${active.id}`);
    setMessages(data);
  };
  useEffect(() => { load(); return () => window.speechSynthesis.cancel(); /* eslint-disable-next-line */ }, [active?.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || loading) return;
    setInput(""); setLoading(true);
    const optimistic = { id: `tmp-${Date.now()}`, role: "user", content: text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    try {
      const { data } = await api.post("/ai/chat", { profile_id: active.id, message: text });
      await load();
      // auto-speak reply
      const rid = `ai-${Date.now()}`;
      setSpeakingId(rid);
      speak(data.reply, () => setSpeakingId(null));
    } catch (e) {
      toast.error(apiErr(e));
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally { setLoading(false); }
  };

  const clear = async () => {
    try { await api.delete(`/ai/history?profile_id=${active.id}`); setMessages([]); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const summarize = async () => {
    setSummarizing(true);
    try {
      const { data } = await api.post("/ai/summarize", { profile_id: active.id });
      const msg = { id: `sum-${Date.now()}`, role: "assistant", content: data.summary, created_at: new Date().toISOString() };
      setMessages((m) => [...m, msg]);
      setSpeakingId(msg.id); speak(data.summary, () => setSpeakingId(null));
    } catch (e) { toast.error(apiErr(e)); }
    finally { setSummarizing(false); }
  };

  const toggleSpeak = (m) => {
    if (speakingId === m.id) { window.speechSynthesis.cancel(); setSpeakingId(null); }
    else { setSpeakingId(m.id); speak(m.content, () => setSpeakingId(null)); }
  };

  return (
    <div className="space-y-6" data-testid="ai-page">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">Backboard</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">AI Health Assistant</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Plain-English guidance grounded in {active?.name}&apos;s records. Not medical advice.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={summarize} disabled={summarizing} data-testid="ai-summarize-btn">
            {summarizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Summarize records
          </Button>
          <Button variant="ghost" onClick={clear} className="text-red-600" data-testid="ai-clear-btn"><Trash2 className="w-4 h-4 mr-2" />Clear</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden flex flex-col" style={{ height: "calc(100vh - 260px)", minHeight: 480 }}>
        <div className="flex-1 overflow-y-auto scroll-thin p-6 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mx-auto"><Bot className="w-8 h-8 text-teal-700 dark:text-teal-400" /></div>
                <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">Ask about your records</h3>
                <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">Try &quot;What&apos;s on my last blood test?&quot; or &quot;Any drug interactions with my meds?&quot;</p>
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 fade-up ${m.role === "user" ? "justify-end" : ""}`} data-testid={`ai-msg-${m.role}`}>
              {m.role === "assistant" && <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4 text-teal-700 dark:text-teal-400" /></div>}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.role === "user" ? "bg-teal-700 text-white rounded-tr-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm"}`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                {m.role === "assistant" && (
                  <button onClick={() => toggleSpeak(m)} className="mt-2 text-xs opacity-60 hover:opacity-100 flex items-center gap-1" data-testid={`ai-speak-${m.id}`}>
                    {speakingId === m.id ? <><VolumeX className="w-3 h-3" />Stop</> : <><Volume2 className="w-3 h-3" />Read aloud</>}
                  </button>
                )}
              </div>
              {m.role === "user" && <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><UserIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center"><Bot className="w-4 h-4 text-teal-700 animate-pulse" /></div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-500">Thinking…</div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="border-t border-slate-200 dark:border-slate-800 p-4 flex gap-2">
          <Textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about your records, meds, or vitals…" className="resize-none min-h-[44px] max-h-32"
            data-testid="ai-input" />
          <Button type="submit" disabled={loading || !input.trim()} className="bg-teal-700 hover:bg-teal-800 text-white h-11" data-testid="ai-send-btn">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
