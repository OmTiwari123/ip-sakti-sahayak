"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus, Trash2, Menu, Moon, Sun, Send, Copy, Check,
  MessageSquare, Sparkles, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { sendChat, uid } from "@/lib/api";
import { loadChats, saveChats } from "@/lib/storage";
import type { Chat, Message } from "@/lib/types";

const SYSTEM_INTRO =
  "Namaste! I am **IP-SAKTI Sahayak**. Ask me anything about Ayurveda intellectual property, patents, GI tags, or bio-piracy protection.";

function makeChat(): Chat {
  const now = Date.now();
  return {
    id: uid(),
    title: "New Chat",
    messages: [{ id: uid(), role: "assistant", content: SYSTEM_INTRO, createdAt: now }],
    createdAt: now,
    updatedAt: now,
  };
}

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = loadChats();
    if (saved.length) {
      setChats(saved);
      setActiveId(saved[0].id);
    } else {
      const fresh = makeChat();
      setChats([fresh]);
      setActiveId(fresh.id);
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(prefersDark);
  }, []);

  useEffect(() => {
    if (chats.length) saveChats(chats);
  }, [chats]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeId, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const activeChat = useMemo(() => chats.find((c) => c.id === activeId), [chats, activeId]);

  const newChat = useCallback(() => {
    const fresh = makeChat();
    setChats((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    setInput("");
    textareaRef.current?.focus();
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      setChats((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (!filtered.length) {
          const fresh = makeChat();
          setActiveId(fresh.id);
          return [fresh];
        }
        if (id === activeId) setActiveId(filtered[0].id);
        return filtered;
      });
    },
    [activeId]
  );

  const send = useCallback(async () => {
    if (!input.trim() || loading || !activeId) return;
    const query = input.trim();
    setInput("");
    setLoading(true);

    const userMsg: Message = { id: uid(), role: "user", content: query, createdAt: Date.now() };

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              title: c.title === "New Chat" ? query.slice(0, 40) + (query.length > 40 ? "…" : "") : c.title,
              messages: [...c.messages, userMsg],
              updatedAt: Date.now(),
            }
          : c
      )
    );

    try {
      const answer = await sendChat(query);
      const aiMsg: Message = { id: uid(), role: "assistant", content: answer, createdAt: Date.now() };
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, messages: [...c.messages, aiMsg], updatedAt: Date.now() }
            : c
        )
      );
    } catch {
      const errorMsg: Message = {
        id: uid(),
        role: "assistant",
        content: "⚠️ **Backend unreachable.** Please start the FastAPI server on port 8000.",
        createdAt: Date.now(),
      };
      setChats((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, messages: [...c.messages, errorMsg] } : c))
      );
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }, [input, loading, activeId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const copyMsg = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="h-screen flex bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <aside
        className={cn(
          "flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 transition-all duration-200",
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        )}
      >
        <div className="p-3 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold shrink-0">
            ॐ
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">IP-SAKTI Sahayak</div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              SIH26045 · Ministry of Ayush
            </div>
          </div>
        </div>

        <div className="p-3">
          <button
            onClick={newChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {chats.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm animate-slide-in",
                c.id === activeId
                  ? "bg-orange-100 dark:bg-zinc-800 text-orange-700 dark:text-orange-400 font-medium"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
              )}
            >
              <MessageSquare size={14} className="shrink-0 opacity-60" />
              <span className="flex-1 truncate">{c.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity"
                aria-label="Delete chat"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setDark(!dark)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{activeChat?.title ?? "New Chat"}</div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Sparkles size={12} className="text-orange-500" />
            Powered by Gemini 2.5 Flash
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {activeChat?.messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                copied={copiedId === msg.id}
                onCopy={() => copyMsg(msg.id, msg.content)}
              />
            ))}

            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 focus-within:border-orange-400 dark:focus-within:border-orange-500 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask about Ayurveda patents, GI tags, or bio-piracy…"
                className="flex-1 resize-none bg-transparent outline-none text-sm py-2 max-h-[200px] placeholder:text-zinc-400"
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-lg p-2 transition-colors"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-center text-[11px] mt-2 text-zinc-400 dark:text-zinc-500">
              IP-SAKTI Sahayak can make mistakes. Verify important legal information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function MessageBubble({ msg, copied, onCopy }: { msg: Message; copied: boolean; onCopy: () => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3 animate-fade-in", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          ॐ
        </div>
      )}
      <div className={cn("max-w-[85%] group", isUser ? "order-1" : "")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-orange-500 text-white rounded-tr-sm"
              : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-tl-sm border border-zinc-200 dark:border-zinc-800"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-3 prose-pre:bg-zinc-900 prose-pre:text-zinc-100">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        <div className={cn("flex items-center gap-2 mt-1 px-1", isUser ? "justify-end" : "")}>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {formatDistanceToNow(msg.createdAt, { addSuffix: true })}
          </span>
          <button
            onClick={onCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] flex items-center gap-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
        ॐ
      </div>
      <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>
      </div>
    </div>
  );
}
