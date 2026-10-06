import type { Chat } from "./types";

const KEY = "ip-sakti-chats-v2";

export function loadChats(): Chat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Chat[]) : [];
  } catch {
    return [];
  }
}

export function saveChats(chats: Chat[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(chats));
}
