import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import SiteHeader from "@/components/SiteHeader";
import AuthModal from "./index/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { CHAT_URL, ADS_URL, DbCategory } from "./index/types";

interface ChatUser { id: number; name: string; avatar: string | null; }
interface ChatItem {
  id: number;
  other_user: ChatUser;
  last_message: string;
  last_message_at: string | null;
  unread: number;
}
interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  ad_id?: number | null;
  ad_title?: string | null;
  ad_price?: number | null;
  ad_photo?: string | null;
  is_removed?: boolean;
  edited_at?: string | null;
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

export default function ChatPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, authModal, setAuthModal, authMode, setAuthMode, authStep, setAuthStep,
    authName, setAuthName, authEmail, setAuthEmail, authPassword, setAuthPassword,
    authCode, setAuthCode, authError, setAuthError, authLoading, resendTimer,
    openAuth, sendCode, submitAuth, logout } = useAuth();

  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<string[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");
  const [msgMenu, setMsgMenu] = useState<{ msg: Message; x: number; y: number } | null>(null);
  const [chatMenu, setChatMenu] = useState(false);
  const lastMsgIdRef = useRef(0);
  const loadingMessagesRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adGreetingSentRef = useRef(false);
  const sid = () => localStorage.getItem("session_id") || "";

  // Данные объявления из URL (если пришли из карточки)
  const adFromUrl = (() => {
    const adId = searchParams.get("ad_id");
    const adTitle = searchParams.get("ad_title");
    const adPrice = searchParams.get("ad_price");
    const adPhoto = searchParams.get("ad_photo");
    if (!adId || !adTitle) return null;
    return { ad_id: Number(adId), ad_title: adTitle, ad_price: adPrice ? Number(adPrice) : null, ad_photo: adPhoto || null };
  })();

  // Категории для шапки
  useEffect(() => {
    fetch(ADS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "categories" }) })
      .then(r => r.json()).then(d => { if (d.ok) setDbCategories(d.categories); }).catch(() => {});
  }, []);

  const loadChats = useCallback(() => {
    if (!user) return;
    setChatsLoading(true);
    fetch(CHAT_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Session-Id": sid() }, body: JSON.stringify({ action: "list_chats" }) })
      .then(r => r.json())
      .then(d => { if (d.ok) setChats(d.chats); })
      .catch(() => {})
      .finally(() => setChatsLoading(false));
  }, [user]);

  const loadMessages = useCallback((chatId: number, since = 0, append = false) => {
    if (loadingMessagesRef.current) return; // пропускаем если уже идёт загрузка
    loadingMessagesRef.current = true;
    fetch(CHAT_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Session-Id": sid() }, body: JSON.stringify({ action: "get_messages", chat_id: chatId, since_id: since }) })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          if (d.messages.length > 0) {
            const newLastId = d.messages[d.messages.length - 1].id;
            lastMsgIdRef.current = newLastId;
          }
          setMessages(prev => {
            if (!append) return d.messages;
            // дедупликация — не добавляем уже существующие id
            const existingIds = new Set(prev.map((m: Message) => m.id));
            const newMsgs = d.messages.filter((m: Message) => !existingIds.has(m.id));
            return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
          });
          setTyping(d.typing || []);
        }
      })
      .catch(() => {})
      .finally(() => { loadingMessagesRef.current = false; });
  }, []);

  // Из URL-параметра chat_id
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setActiveChatId(Number(id));
  }, [searchParams]);

  useEffect(() => { loadChats(); }, [loadChats]);

  useEffect(() => {
    if (!activeChatId) return;
    setMessages([]);
    lastMsgIdRef.current = 0;
    loadingMessagesRef.current = false;
    adGreetingSentRef.current = false;
    loadMessages(activeChatId, 0, false);
  }, [activeChatId]);

  // Polling каждые 3 сек — зависит только от activeChatId
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeChatId) return;
    pollRef.current = setInterval(() => {
      loadMessages(activeChatId, lastMsgIdRef.current, true);
      loadChats();
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChatId, loadMessages, loadChats]);

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectChat = (id: number) => {
    setActiveChatId(id);
    setSearchParams({ id: String(id) });
  };

  const sendTyping = () => {
    if (!activeChatId) return;
    fetch(CHAT_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Session-Id": sid() }, body: JSON.stringify({ action: "typing", chat_id: activeChatId }) }).catch(() => {});
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    sendTyping();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {}, 3000);
  };

  const sendMessage = async () => {
    if (!text.trim() || !activeChatId || sending) return;
    setSending(true);
    const content = text.trim();
    setText("");

    // Прикрепляем карточку объявления только к первому сообщению
    const attachAd = adFromUrl && !adGreetingSentRef.current;
    if (attachAd) adGreetingSentRef.current = true;

    const msgBody: Record<string, unknown> = { action: "send_message", chat_id: activeChatId, content };
    if (attachAd && adFromUrl) {
      msgBody.ad_id = adFromUrl.ad_id;
      msgBody.ad_title = adFromUrl.ad_title;
      msgBody.ad_price = adFromUrl.ad_price;
      msgBody.ad_photo = adFromUrl.ad_photo;
      // Убираем параметры объявления из URL после первой отправки
      setSearchParams({ id: String(activeChatId) });
    }

    loadingMessagesRef.current = false; // снимаем блокировку перед запросом
    await fetch(CHAT_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Session-Id": sid() }, body: JSON.stringify(msgBody) })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          // Грузим сразу после отправки чтобы показать своё сообщение
          loadMessages(activeChatId, lastMsgIdRef.current, true);
          loadChats();
        }
      })
      .catch(() => {});
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const chatPost = (body: object) => fetch(CHAT_URL, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
    body: JSON.stringify(body),
  }).then(r => r.json());

  const startEditMsg = (msg: Message) => {
    setEditingMsg(msg);
    setEditText(msg.content);
    setMsgMenu(null);
  };

  const saveEditMsg = async () => {
    if (!editingMsg || !editText.trim()) return;
    const d = await chatPost({ action: "edit_message", message_id: editingMsg.id, content: editText.trim() });
    if (d.ok) {
      setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: editText.trim(), edited_at: new Date().toISOString() } : m));
      setEditingMsg(null); setEditText("");
    }
  };

  const removeMsg = async (msg: Message) => {
    setMsgMenu(null);
    const d = await chatPost({ action: "remove_message", message_id: msg.id });
    if (d.ok) setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: "Сообщение удалено", is_removed: true, ad_id: null } : m));
  };

  const clearChat = async () => {
    if (!activeChatId) return;
    setChatMenu(false);
    const d = await chatPost({ action: "clear_chat", chat_id: activeChatId });
    if (d.ok) { setMessages([]); lastMsgIdRef.current = 0; toast.success("История очищена"); }
  };

  const leaveChat = async () => {
    if (!activeChatId) return;
    setChatMenu(false);
    const d = await chatPost({ action: "leave_chat", chat_id: activeChatId });
    if (d.ok) { setActiveChatId(null); setSearchParams({}); loadChats(); toast.success("Чат удалён"); }
  };

  const activeChat = chats.find(c => c.id === activeChatId);

  if (!user) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <SiteHeader dbCategories={dbCategories} user={null} onLogoClick={() => navigate("/")} onNewAd={() => navigate("/")} onLogin={() => openAuth("login")} onRegister={() => openAuth("register")} />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Icon name="MessageCircle" size={52} className="text-[hsl(var(--muted-foreground))]" />
          <p className="text-lg font-semibold">Войдите, чтобы открыть чаты</p>
          <button onClick={() => openAuth("login")} className="px-6 py-2.5 bg-[hsl(var(--accent))] text-white rounded-xl font-semibold hover:opacity-90">Войти</button>
        </div>
        <AuthModal authModal={authModal} setAuthModal={setAuthModal} authMode={authMode} setAuthMode={setAuthMode} authStep={authStep} setAuthStep={setAuthStep} authName={authName} setAuthName={setAuthName} authEmail={authEmail} setAuthEmail={setAuthEmail} authPassword={authPassword} setAuthPassword={setAuthPassword} authCode={authCode} setAuthCode={setAuthCode} authError={authError} setAuthError={setAuthError} authLoading={authLoading} resendTimer={resendTimer} submitAuth={submitAuth} sendCode={sendCode} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col">
      <SiteHeader dbCategories={dbCategories} user={user} onLogoClick={() => navigate("/")} onNewAd={() => navigate("/")} onLogin={() => openAuth("login")} onRegister={() => openAuth("register")} onLogout={logout} />

      <div className="flex flex-1 max-w-6xl w-full mx-auto px-4 py-6 gap-4 min-h-0" style={{ height: "calc(100vh - 120px)" }}>

        {/* Левая колонка — список чатов */}
        <div className="w-72 shrink-0 bg-white rounded-2xl border border-border flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Сообщения</h2>
            <button
              onClick={() => navigate("/chat/auto-reply")}
              className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))] transition-colors"
              title="Настройки автоответа"
            >
              <Icon name="Bot" size={14} />
              Автоответ
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chatsLoading && chats.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-[hsl(var(--muted-foreground))] text-sm">Загрузка...</div>
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-[hsl(var(--muted-foreground))]">
                <Icon name="MessageCircle" size={32} />
                <p className="text-sm">Нет диалогов</p>
              </div>
            ) : (
              chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-[hsl(var(--muted))] transition-colors text-left ${activeChatId === chat.id ? "bg-orange-50 border-r-2 border-[hsl(var(--accent))]" : ""}`}
                >
                  <div className="w-9 h-9 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {chat.other_user.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{chat.other_user.name}</span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] shrink-0 ml-1">{formatTime(chat.last_message_at)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{chat.last_message || "Нет сообщений"}</p>
                      {chat.unread > 0 && (
                        <span className="ml-1 shrink-0 min-w-[18px] h-[18px] bg-[hsl(var(--accent))] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">{chat.unread}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Правая колонка — тело чата */}
        <div className="flex-1 bg-white rounded-2xl border border-border flex flex-col overflow-hidden min-w-0">
          {!activeChatId ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-[hsl(var(--muted-foreground))]">
              <Icon name="MessageCircle" size={48} />
              <p className="font-medium">Выберите чат</p>
              <p className="text-sm">Или начните диалог со страницы объявления</p>
            </div>
          ) : (
            <>
              {/* Шапка чата */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
                <div className="w-9 h-9 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-white font-bold shrink-0">
                  {activeChat?.other_user.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{activeChat?.other_user.name}</p>
                  {typing.length > 0 && (
                    <p className="text-xs text-[hsl(var(--accent))] animate-pulse">{typing.join(", ")} печатает…</p>
                  )}
                </div>
                {/* Меню чата */}
                <div className="relative">
                  <button onClick={() => setChatMenu(v => !v)} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
                    <Icon name="MoreVertical" size={16} className="text-[hsl(var(--muted-foreground))]" />
                  </button>
                  {chatMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setChatMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white rounded-xl shadow-lg border border-border py-1.5 animate-fade-in">
                        <button onClick={clearChat} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left">
                          <Icon name="Eraser" size={15} className="text-[hsl(var(--muted-foreground))]" />
                          Очистить историю
                        </button>
                        <div className="my-1 border-t border-border" />
                        <button onClick={leaveChat} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-50 text-red-500 transition-colors text-left">
                          <Icon name="Trash2" size={15} />
                          Удалить чат
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Сообщения */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 gap-2 text-[hsl(var(--muted-foreground))]">
                    <Icon name="MessageSquare" size={36} />
                    <p className="text-sm">Начните диалог</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex group ${isMe ? "justify-end" : "justify-start"}`}>
                        {!isMe && (
                          <div className="w-7 h-7 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-xs font-bold shrink-0 mr-2 mt-auto">
                            {msg.sender_name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="flex items-end gap-1 max-w-[70%]">
                          {/* Кнопка меню (только для своих, слева от пузыря) */}
                          {isMe && !msg.is_removed && (
                            <button
                              onClick={e => setMsgMenu({ msg, x: e.clientX, y: e.clientY })}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-[hsl(var(--muted))] shrink-0 mb-2"
                            >
                              <Icon name="MoreHorizontal" size={14} className="text-[hsl(var(--muted-foreground))]" />
                            </button>
                          )}
                          <div className={`rounded-2xl overflow-hidden ${isMe ? "bg-[hsl(var(--accent))] text-white rounded-br-sm" : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-bl-sm"} ${msg.is_removed ? "opacity-60" : ""}`}>
                            {/* Мини-карточка объявления */}
                            {msg.ad_id && msg.ad_title && !msg.is_removed && (
                              <button
                                onClick={() => navigate(`/?ad=${msg.ad_id}`)}
                                className={`w-full flex items-center gap-2.5 p-2.5 border-b text-left hover:opacity-90 transition-opacity ${isMe ? "border-white/20 bg-white/10" : "border-border bg-white"}`}
                              >
                                {msg.ad_photo ? (
                                  <img src={msg.ad_photo} alt={msg.ad_title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                                ) : (
                                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${isMe ? "bg-white/20" : "bg-[hsl(var(--muted))]"}`}>
                                    <Icon name="Image" size={18} className={isMe ? "text-white/60" : "text-[hsl(var(--muted-foreground))]"} />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className={`text-xs font-medium line-clamp-2 leading-tight ${isMe ? "text-white" : "text-[hsl(var(--foreground))]"}`}>{msg.ad_title}</p>
                                  {msg.ad_price != null && (
                                    <p className={`text-xs font-bold mt-0.5 ${isMe ? "text-white/90" : "text-[hsl(var(--accent))]"}`}>
                                      {msg.ad_price.toLocaleString("ru")} ₽
                                    </p>
                                  )}
                                </div>
                                <Icon name="ExternalLink" size={12} className={`shrink-0 ${isMe ? "text-white/50" : "text-[hsl(var(--muted-foreground))]"}`} />
                              </button>
                            )}
                            <div className="px-4 py-2.5">
                              {msg.is_removed ? (
                                <p className="text-xs italic opacity-70">Сообщение удалено</p>
                              ) : (
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                              )}
                              <p className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${isMe ? "text-white/70" : "text-[hsl(var(--muted-foreground))]"}`}>
                                {msg.edited_at && !msg.is_removed && <span className="italic">изм.</span>}
                                {formatTime(msg.created_at)}
                                {isMe && <span>{msg.is_read ? "✓✓" : "✓"}</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {typing.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-[hsl(var(--muted))] rounded-2xl rounded-bl-sm px-4 py-2.5">
                      <div className="flex gap-1 items-center h-4">
                        <span className="w-1.5 h-1.5 bg-[hsl(var(--muted-foreground))] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-[hsl(var(--muted-foreground))] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-[hsl(var(--muted-foreground))] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Поле ввода / редактирования */}
              <div className="px-4 py-3 border-t border-border shrink-0">
                {/* Режим редактирования */}
                {editingMsg ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-xl">
                      <Icon name="Pencil" size={13} className="text-[hsl(var(--accent))] shrink-0" />
                      <span className="text-xs text-[hsl(var(--accent))] font-medium flex-1">Редактирование сообщения</span>
                      <button onClick={() => { setEditingMsg(null); setEditText(""); }} className="p-0.5 hover:bg-orange-100 rounded">
                        <Icon name="X" size={13} className="text-[hsl(var(--accent))]" />
                      </button>
                    </div>
                    <div className="flex items-end gap-2">
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEditMsg(); } if (e.key === "Escape") { setEditingMsg(null); setEditText(""); } }}
                        rows={1}
                        autoFocus
                        className="flex-1 resize-none px-4 py-2.5 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] max-h-32 overflow-y-auto"
                        style={{ minHeight: "42px" }}
                      />
                      <button onClick={saveEditMsg} disabled={!editText.trim()}
                        className="w-10 h-10 rounded-xl bg-[hsl(var(--accent))] flex items-center justify-center text-white hover:opacity-90 disabled:opacity-40 shrink-0">
                        <Icon name="Check" size={16} />
                      </button>
                    </div>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1.5 px-1">Enter — сохранить · Esc — отмена</p>
                  </div>
                ) : (
                  <div>
                    {/* Превью прикреплённого объявления */}
                    {adFromUrl && !adGreetingSentRef.current && (
                      <div className="flex items-center gap-2.5 mb-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl">
                        {adFromUrl.ad_photo ? (
                          <img src={adFromUrl.ad_photo} alt={adFromUrl.ad_title} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                            <Icon name="Image" size={14} className="text-[hsl(var(--accent))]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">{adFromUrl.ad_title}</p>
                          {adFromUrl.ad_price != null && <p className="text-xs text-[hsl(var(--accent))] font-bold">{adFromUrl.ad_price.toLocaleString("ru")} ₽</p>}
                        </div>
                        <Icon name="Paperclip" size={13} className="text-[hsl(var(--accent))] shrink-0" />
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <textarea value={text} onChange={handleInput} onKeyDown={handleKeyDown}
                        placeholder="Написать сообщение..." rows={1}
                        className="flex-1 resize-none px-4 py-2.5 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all placeholder:text-[hsl(var(--muted-foreground))] max-h-32 overflow-y-auto"
                        style={{ minHeight: "42px" }} />
                      <button onClick={sendMessage} disabled={!text.trim() || sending}
                        className="w-10 h-10 rounded-xl bg-[hsl(var(--accent))] flex items-center justify-center text-white hover:opacity-90 disabled:opacity-40 shrink-0">
                        <Icon name="Send" size={16} />
                      </button>
                    </div>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1.5 px-1">Enter — отправить · Shift+Enter — новая строка</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Контекстное меню сообщения */}
      {msgMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMsgMenu(null)} />
          <div className="fixed z-50 bg-white rounded-xl shadow-xl border border-border py-1.5 w-44 animate-fade-in"
            style={{ top: Math.min(msgMenu.y, window.innerHeight - 120), left: Math.min(msgMenu.x, window.innerWidth - 180) }}>
            <button onClick={() => startEditMsg(msgMenu.msg)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left">
              <Icon name="Pencil" size={14} className="text-[hsl(var(--muted-foreground))]" />
              Редактировать
            </button>
            <div className="my-1 border-t border-border" />
            <button onClick={() => removeMsg(msgMenu.msg)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-50 text-red-500 transition-colors text-left">
              <Icon name="Trash2" size={14} />
              Удалить
            </button>
          </div>
        </>
      )}

      <AuthModal authModal={authModal} setAuthModal={setAuthModal} authMode={authMode} setAuthMode={setAuthMode} authStep={authStep} setAuthStep={setAuthStep} authName={authName} setAuthName={setAuthName} authEmail={authEmail} setAuthEmail={setAuthEmail} authPassword={authPassword} setAuthPassword={setAuthPassword} authCode={authCode} setAuthCode={setAuthCode} authError={authError} setAuthError={setAuthError} authLoading={authLoading} resendTimer={resendTimer} submitAuth={submitAuth} sendCode={sendCode} />
    </div>
  );
}