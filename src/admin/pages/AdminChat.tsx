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
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-white text-xl font-bold mb-6">Управление чатом</h1>

      <div className="flex gap-2 mb-6">
        <button className={tabClass("settings")} onClick={() => setTab("settings")}>Настройки</button>
        <button className={tabClass("chats")} onClick={() => setTab("chats")}>Чаты</button>
        <button className={tabClass("words")} onClick={() => setTab("words")}>Фильтрация слов</button>
      </div>

      {/* Вкладка: Настройки */}
      {tab === "settings" && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-white font-semibold mb-4">Основные настройки</h2>
          <div className="flex items-center justify-between py-3 border-b border-gray-800">
            <div>
              <p className="text-white text-sm font-medium">Чат между пользователями</p>
              <p className="text-gray-400 text-xs mt-0.5">Разрешить пользователям переписываться друг с другом</p>
            </div>
            <button
              onClick={() => setChatEnabled(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${chatEnabled ? "bg-indigo-600" : "bg-gray-700"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${chatEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={saveChatEnabled} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
            {saved && <span className="text-green-400 text-sm">✓ Сохранено</span>}
          </div>
        </div>
      )}

      {/* Вкладка: Список чатов */}
      {tab === "chats" && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-white font-semibold">Все диалоги</h2>
            <button onClick={loadChats} className="text-gray-400 hover:text-white text-xs transition-colors">Обновить</button>
          </div>
          {chatsLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500 text-sm">Загрузка...</div>
          ) : chats.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-500 text-sm">Нет чатов</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="px-6 py-3 text-left">ID</th>
                  <th className="px-6 py-3 text-left">Участники</th>
                  <th className="px-6 py-3 text-left">Сообщений</th>
                  <th className="px-6 py-3 text-left">Последнее</th>
                </tr>
              </thead>
              <tbody>
                {chats.map(c => (
                  <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-3 text-gray-400">#{c.id}</td>
                    <td className="px-6 py-3 text-white">{c.user1_name} ↔ {c.user2_name}</td>
                    <td className="px-6 py-3 text-gray-300">{c.msg_count}</td>
                    <td className="px-6 py-3 text-gray-400">{c.last_message_at ? new Date(c.last_message_at).toLocaleString("ru") : "—"}</td>
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
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-white font-semibold mb-4">Добавить слово</h2>
            <div className="flex gap-3">
              <input
                value={newWord}
                onChange={e => setNewWord(e.target.value)}
                placeholder="Слово или фраза"
                className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-500"
              />
              <input
                value={newReplacement}
                onChange={e => setNewReplacement(e.target.value)}
                placeholder="Замена"
                className="w-28 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-500"
              />
              <button onClick={addWord} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap">
                Добавить
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-2">Слово будет автоматически заменяться при отправке сообщений</p>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-white font-semibold">Список фильтров</h2>
            </div>
            {wordsLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-500 text-sm">Загрузка...</div>
            ) : words.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-gray-500 text-sm">Нет фильтров</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-800">
                    <th className="px-6 py-3 text-left">Слово</th>
                    <th className="px-6 py-3 text-left">Заменяется на</th>
                    <th className="px-6 py-3 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map(w => (
                    <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-3 text-white font-mono">{w.word}</td>
                      <td className="px-6 py-3 text-gray-300 font-mono">{w.replacement}</td>
                      <td className="px-6 py-3 text-right">
                        <button onClick={() => removeWord(w.id)} className="text-red-400 hover:text-red-300 text-xs transition-colors">Удалить</button>
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
