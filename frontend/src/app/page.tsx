"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
};

const WELCOME: Message = {
  role: "assistant",
  content:
    "Namaste! I am **IP-SAKTI Sahayak**. Ask me anything about Ayurveda intellectual property, patents, GI tags, or bio-piracy protection.",
};

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chats from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("ip-sakti-chats");
    if (saved) {
      const parsed: Chat[] = JSON.parse(saved);
      setChats(parsed);
      if (parsed.length > 0) setActiveChatId(parsed[0].id);
    } else {
      const newChat = createNewChat();
      setChats([newChat]);
      setActiveChatId(newChat.id);
    }
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem("ip-sakti-chats", JSON.stringify(chats));
    }
  }, [chats]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeChatId, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const activeChat = chats.find((c) => c.id === activeChatId);

  function createNewChat(): Chat {
    return {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [WELCOME],
    };
  }

  function startNewChat() {
    const newChat = createNewChat();
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setInput("");
  }

  function deleteChat(id: string) {
    setChats((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const fresh = createNewChat();
        setActiveChatId(fresh.id);
        return [fresh];
      }
      if (id === activeChatId) setActiveChatId(filtered[0].id);
      return filtered;
    });
  }

  async function sendMessage() {
    if (!input.trim() || loading || !activeChatId) return;

    const userMessage: Message = { role: "user", content: input };
    const currentInput = input;
    setInput("");
    setLoading(true);

    // Update active chat with user message + derive title
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== activeChatId) return c;
        const updatedMessages = [...c.messages, userMessage];
        const newTitle =
          c.title === "New Chat"
            ? currentInput.slice(0, 40) + (currentInput.length > 40 ? "..." : "")
            : c.title;
        return { ...c, messages: updatedMessages, title: newTitle };
      })
    );

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: currentInput }),
      });
      const data = await res.json();
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? { ...c, messages: [...c.messages, { role: "assistant", content: data.answer }] }
            : c
        )
      );
    } catch {
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  { role: "assistant", content: "⚠️ Backend not connected. Please start the server." },
                ],
              }
            : c
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content);
  }

  const bg = dark ? "bg-gray-900" : "bg-white";
  const sideBg = dark ? "bg-gray-950 border-gray-800" : "bg-gray-50 border-gray-200";
  const headerBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const textColor = dark ? "text-gray-100" : "text-gray-800";
  const subTextColor = dark ? "text-gray-400" : "text-gray-500";
  const userBubble = "bg-orange-500 text-white";
  const aiBubble = dark ? "bg-gray-800 text-gray-100" : "bg-gray-100 text-gray-800";

  return (
    <div className={`min-h-screen flex ${bg} ${textColor}`}>
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className={`w-64 ${sideBg} border-r flex flex-col`}>
          <div className="p-3">
            <button
              onClick={startNewChat}
              className="w-full py-2 px-3 rounded-lg border border-orange-400 text-orange-500 hover:bg-orange-50 dark:hover:bg-gray-800 text-sm font-medium"
            >
              + New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {chats.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm ${
                  c.id === activeChatId
                    ? "bg-orange-100 dark:bg-gray-800 text-orange-700 dark:text-orange-400"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => setActiveChatId(c.id)}
              >
                <span className="truncate flex-1">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-xs text-red-500 ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className={`p-3 text-xs border-t ${dark ? "border-gray-800" : "border-gray-200"} ${subTextColor}`}>
            SIH26045 • Ministry of Ayush
          </div>
        </aside>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className={`${headerBg} border-b px-4 py-3 flex items-center gap-3`}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`text-xl ${subTextColor} hover:${textColor}`}
          >
            ☰
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold">
            ॐ
          </div>
          <div className="flex-1">
            <h1 className="text-base font-bold">IP-SAKTI Sahayak</h1>
            <p className={`text-xs ${subTextColor}`}>AI Assistant for Ayurveda IP Protection</p>
          </div>
          <button
            onClick={() => setDark(!dark)}
            className={`text-xl ${subTextColor} hover:${textColor}`}
            title="Toggle dark mode"
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {activeChat?.messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    ॐ
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === "user" ? userBubble : aiBubble}`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <button
                    onClick={() => copyMessage(msg.content)}
                    className={`text-xs mt-2 ${msg.role === "user" ? "text-orange-100" : subTextColor} hover:underline`}
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
                  ॐ
                </div>
                <div className={`rounded-2xl px-4 py-3 ${aiBubble}`}>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></span>
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className={`${headerBg} border-t p-4`}>
          <div className="max-w-3xl mx-auto">
            <div className={`flex gap-2 items-end ${dark ? "bg-gray-800" : "bg-white"} border ${dark ? "border-gray-700" : "border-gray-300"} rounded-2xl px-3 py-2`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Ayurveda patents, GI tags, or bio-piracy..."
                rows={1}
                className={`flex-1 resize-none bg-transparent outline-none text-sm py-2 ${textColor}`}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-lg px-4 py-2 text-sm font-medium"
              >
                Send
              </button>
            </div>
            <p className={`text-center text-xs mt-2 ${subTextColor}`}>
              IP-SAKTI Sahayak can make mistakes. Verify important legal information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}