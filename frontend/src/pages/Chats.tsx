import React, { useEffect, useState } from "react";
import { api } from "../api/client";

interface Chat {
  id: string;
  externalChatId: string;
  itemTitle: string | null;
  clientName: string | null;
  hasUnread: boolean;
  lastMessageAt: string | null;
  avitoAccount: { id: string; name: string } | null;
  assignedManager: { id: string; fullName: string } | null;
  contact: { id: string; fullName: string; phone: string | null } | null;
  messages: { text: string; direction: "IN" | "OUT" }[];
}

interface Message {
  id: string;
  direction: "IN" | "OUT";
  text: string;
  isRead: boolean;
  createdAt: string;
  authorUser: { fullName: string } | null;
}

interface UserOption {
  id: string;
  fullName: string;
}

interface Template {
  id: string;
  title: string;
  text: string;
}

export default function Chats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sending, setSending] = useState(false);

  async function loadChats() {
    const data = await api.get<Chat[]>("/chats");
    setChats(data);
  }

  useEffect(() => {
    loadChats();
    api.get<UserOption[]>("/users").then(setUsers).catch(() => {});
    api.get<Template[]>("/templates").then(setTemplates).catch(() => {});
    const interval = setInterval(loadChats, 15000);
    return () => clearInterval(interval);
  }, []);

  async function openChat(chat: Chat) {
    setActiveId(chat.id);
    const msgs = await api.get<Message[]>(`/chats/${chat.id}/messages`);
    setMessages(msgs);
    if (chat.hasUnread) {
      await api.post(`/chats/${chat.id}/read`);
      loadChats();
    }
  }

  async function sendMessage() {
    if (!activeId || !text.trim()) return;
    setSending(true);
    try {
      const msg = await api.post<Message>(`/chats/${activeId}/messages`, { text });
      setMessages((prev) => [...prev, msg]);
      setText("");
      loadChats();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  async function assignManager(chatId: string, managerId: string) {
    await api.patch(`/chats/${chatId}/assign`, { managerId: managerId || null });
    loadChats();
  }

  const activeChat = chats.find((c) => c.id === activeId) || null;

  return (
    <div className="flex h-screen">
      <div className="w-96 border-r bg-white overflow-y-auto">
        <div className="p-3 font-semibold border-b">Все чаты ({chats.length})</div>
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => openChat(chat)}
            className={`p-3 border-b cursor-pointer ${activeId === chat.id ? "bg-blue-50" : "hover:bg-slate-50"}`}
          >
            <div className="flex justify-between items-start">
              <div className="font-medium text-sm">
                {chat.contact?.fullName || chat.clientName || "Клиент без имени"}
              </div>
              {chat.hasUnread && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1" />}
            </div>
            <div className="text-xs text-slate-500 truncate">{chat.itemTitle || "Без объявления"}</div>
            <div className="text-xs text-slate-400 truncate">{chat.messages[0]?.text}</div>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px] bg-slate-200 rounded px-1.5 py-0.5">
                {chat.avitoAccount?.name || "Авито"}
              </span>
              {chat.assignedManager && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5">
                  {chat.assignedManager.fullName}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">Выберите чат</div>
        ) : (
          <>
            <div className="p-3 border-b bg-white flex justify-between items-center">
              <div>
                <div className="font-semibold">
                  {activeChat.contact?.fullName || activeChat.clientName || "Клиент"}
                </div>
                <div className="text-xs text-slate-500">
                  Аккаунт: {activeChat.avitoAccount?.name} · Объявление: {activeChat.itemTitle || "—"}
                </div>
              </div>
              <select
                className="border rounded text-sm px-2 py-1"
                value={activeChat.assignedManager?.id || ""}
                onChange={(e) => assignManager(activeChat.id, e.target.value)}
              >
                <option value="">Менеджер не назначен</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-md p-2 rounded-lg text-sm ${
                    m.direction === "OUT"
                      ? "bg-blue-600 text-white ml-auto"
                      : "bg-white border"
                  }`}
                >
                  {m.text}
                  <div className={`text-[10px] mt-1 ${m.direction === "OUT" ? "text-blue-200" : "text-slate-400"}`}>
                    {new Date(m.createdAt).toLocaleString("ru-RU")}
                    {m.direction === "OUT" && m.authorUser ? ` · ${m.authorUser.fullName}` : ""}
                    {m.direction === "IN" ? (m.isRead ? " · прочитано" : " · новое") : ""}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t bg-white">
              {templates.length > 0 && (
                <div className="flex gap-1 mb-2 overflow-x-auto">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setText(t.text)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 rounded px-2 py-1 whitespace-nowrap"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="Написать сообщение..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending}
                  className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
                >
                  Отправить
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
