import { useState, useEffect } from "react";
import { adminApi } from "../api";
import { CHAT_URL } from "@/pages/index/types";

const ADMIN_URL = "https://functions.poehali.dev/ef288d24-8632-43b5-a16c-ae5bd62e3d59";

function adminFetch(body: object) {
  return fetch(ADMIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Token": localStorage.getItem("admin_token") || "" },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

function chatFetch(body: object) {
  return fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Token": localStorage.getItem("admin_token") || "" },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

interface WordFilter { id: number; word: string; replacement: string; }
interface ChatItem { id: number; user1_name: string; user2_name: string; last_message_at: string; msg_count: number; }

type Tab = "settings" | "words" | "chats";

export default function AdminChat() {
  const [tab, setTab] = useState<Tab>("settings");
  const [chatEnabled, setChatEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [words, setWords] = useState<WordFilter[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newReplacement, setNewReplacement] = useState("***");
  const [wordsLoading, setWordsLoading] = useState(false);

  const [chats, setChats] = useState<ChatItem[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);

  // Загрузка настроек чата
  useEffect(() => {
    adminFetch({ action: "settings_get", group: "general" }).then(d => {
      if (d && typeof d.chat_enabled !== "undefined") setChatEnabled(!!d.chat_enabled);
    });
  }, []);

  // Загрузка фильтров слов
  const loadWords = () => {
    setWordsLoading(true);
    adminFetch({ action: "word_filters_list" })
      .then(d => { if (d.ok) setWords(d.filters || []); })
      .finally(() => setWordsLoading(false));
  };

  // Загрузка списка чатов
  const loadChats = () => {
    setChatsLoading(true);
    adminFetch({ action: "chats_list" })
      .then(d => { if (d.ok) setChats(d.chats || []); })
      .finally(() => setChatsLoading(false));
  };

  useEffect(() => { if (tab === "words") loadWords(); }, [tab]);
  useEffect(() => { if (tab === "chats") loadChats(); }, [tab]);

  const saveChatEnabled = async () => {
    setSaving(true);
    await adminFetch({ action: "settings_save", chat_enabled: chatEnabled });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addWord = async () => {
    if (!newWord.trim()) return;
    const d = await adminFetch({ action: "word_filter_add", word: newWord.trim(), replacement: newReplacement.trim() || "***" });
    if (d.ok) { setNewWord(""); setNewReplacement("***"); loadWords(); }
  };

  const removeWord = async (id: number) => {
    await adminFetch({ action: "word_filter_remove", id });
    loadWords();
  };

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? "bg-[hsl(var(--primary))] text-white" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"}`;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-[hsl(var(--foreground))] text-xl font-bold mb-6">Управление чатом</h1>

      <div className="flex gap-2 mb-6">
        <button className={tabClass("settings")} onClick={() => setTab("settings")}>Настройки</button>
        <button className={tabClass("chats")} onClick={() => setTab("chats")}>Чаты</button>
        <button className={tabClass("words")} onClick={() => setTab("words")}>Фильтрация слов</button>
      </div>

      {/* Вкладка: Настройки */}
      {tab === "settings" && (
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-[hsl(var(--foreground))] font-semibold mb-4">Основные настройки</h2>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-[hsl(var(--foreground))] text-sm font-medium">Чат между пользователями</p>
              <p className="text-[hsl(var(--muted-foreground))] text-xs mt-0.5">Разрешить пользователям переписываться друг с другом</p>
            </div>
            <button
              onClick={() => setChatEnabled(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${chatEnabled ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--border))]"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${chatEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={saveChatEnabled} disabled={saving} className="px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity">
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
            {saved && <span className="text-green-600 text-sm">✓ Сохранено</span>}
          </div>
        </div>
      )}

      {/* Вкладка: Список чатов */}
      {tab === "chats" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-[hsl(var(--foreground))] font-semibold">Все диалоги</h2>
            <button onClick={loadChats} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-xs transition-colors">Обновить</button>
          </div>
          {chatsLoading ? (
            <div className="flex items-center justify-center py-12 text-[hsl(var(--muted-foreground))] text-sm">Загрузка...</div>
          ) : chats.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-[hsl(var(--muted-foreground))] text-sm">Нет чатов</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[hsl(var(--muted-foreground))] text-xs border-b border-border">
                  <th className="px-6 py-3 text-left">ID</th>
                  <th className="px-6 py-3 text-left">Участники</th>
                  <th className="px-6 py-3 text-left">Сообщений</th>
                  <th className="px-6 py-3 text-left">Последнее</th>
                </tr>
              </thead>
              <tbody>
                {chats.map(c => (
                  <tr key={c.id} className="border-b border-border hover:bg-[hsl(var(--muted))] transition-colors">
                    <td className="px-6 py-3 text-[hsl(var(--muted-foreground))]">#{c.id}</td>
                    <td className="px-6 py-3 text-[hsl(var(--foreground))]">{c.user1_name} ↔ {c.user2_name}</td>
                    <td className="px-6 py-3 text-[hsl(var(--foreground))]">{c.msg_count}</td>
                    <td className="px-6 py-3 text-[hsl(var(--muted-foreground))]">{c.last_message_at ? new Date(c.last_message_at).toLocaleString("ru") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Вкладка: Фильтрация слов */}
      {tab === "words" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-border p-6">
            <h2 className="text-[hsl(var(--foreground))] font-semibold mb-4">Добавить слово</h2>
            <div className="flex gap-3">
              <input
                value={newWord}
                onChange={e => setNewWord(e.target.value)}
                placeholder="Слово или фраза"
                className="flex-1 bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))]"
              />
              <input
                value={newReplacement}
                onChange={e => setNewReplacement(e.target.value)}
                placeholder="Замена"
                className="w-28 bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))]"
              />
              <button onClick={addWord} className="px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap">
                Добавить
              </button>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] text-xs mt-2">Слово будет автоматически заменяться при отправке сообщений</p>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-[hsl(var(--foreground))] font-semibold">Список фильтров</h2>
            </div>
            {wordsLoading ? (
              <div className="flex items-center justify-center py-10 text-[hsl(var(--muted-foreground))] text-sm">Загрузка...</div>
            ) : words.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-[hsl(var(--muted-foreground))] text-sm">Нет фильтров</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[hsl(var(--muted-foreground))] text-xs border-b border-border">
                    <th className="px-6 py-3 text-left">Слово</th>
                    <th className="px-6 py-3 text-left">Заменяется на</th>
                    <th className="px-6 py-3 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map(w => (
                    <tr key={w.id} className="border-b border-border hover:bg-[hsl(var(--muted))] transition-colors">
                      <td className="px-6 py-3 text-[hsl(var(--foreground))] font-mono">{w.word}</td>
                      <td className="px-6 py-3 text-[hsl(var(--muted-foreground))] font-mono">{w.replacement}</td>
                      <td className="px-6 py-3 text-right">
                        <button onClick={() => removeWord(w.id)} className="text-red-500 hover:text-red-600 text-xs transition-colors">Удалить</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}