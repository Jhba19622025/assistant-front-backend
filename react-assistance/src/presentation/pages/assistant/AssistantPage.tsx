// file: src/presentation/pages/assistant/AssistantPage.tsx
import { useEffect, useRef, useState } from 'react';
import { GptMessage, TypingLoader, TextMessageBox } from '../../components';
import { createThreadUseCase, postQuestionUseCase } from '../../../core/use-cases';

type AnyObj = Record<string, any>;
type Role = 'assistant' | 'user' | string;

interface ChatMessage { text: string; isGpt: boolean; }

const isObj = (v: unknown): v is AnyObj => typeof v === 'object' && v !== null;

const toStrings = (content: any): string[] => {
  if (!content) return [];
  if (typeof content === 'string') return [content];
  if (Array.isArray(content)) {
    const out: string[] = [];
    for (const part of content) {
      if (typeof part === 'string') out.push(part);
      else if (typeof (part as any)?.text === 'string') out.push((part as any).text);
      else if (typeof (part as any)?.text?.value === 'string') out.push((part as any).text.value);
      else if ((part as any)?.type === 'text' && typeof (part as any)?.text?.value === 'string') out.push((part as any).text.value);
      else if (typeof (part as any)?.content === 'string') out.push((part as any).content);
    }
    return out.filter(Boolean);
  }
  if (typeof (content as any)?.text === 'string') return [(content as any).text];
  if (typeof (content as any)?.text?.value === 'string') return [(content as any).text.value];
  if (typeof (content as any)?.value === 'string') return [(content as any).value];
  return [];
};

// Array directo, {messages} o {data}
const getItems = (input: unknown): AnyObj[] => {
  if (Array.isArray(input)) {
    if (input.every((m) => isObj(m) && ('rol' in m || 'role' in m) && 'content' in m)) return input as AnyObj[];
    for (let i = input.length - 1; i >= 0; i--) {
      const it: any = input[i];
      if (Array.isArray(it) && it.every((m) => isObj(m) && ('rol' in m || 'role' in m))) return it;
      if (isObj(it) && Array.isArray(it.messages)) return it.messages as AnyObj[];
      if (isObj(it) && Array.isArray(it.data)) return it.data as AnyObj[];
    }
    return [];
  }
  if (isObj(input)) {
    if (Array.isArray((input as any).messages)) return (input as any).messages as AnyObj[];
    if (Array.isArray((input as any).data)) return (input as any).data as AnyObj[];
  }
  return [];
};

// Toma el primer assistant posterior al último user
const extractAssistantReply = (items: AnyObj[], userText: string): string[] => {
  if (!items.length) return [];
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const q = norm(userText);

  let lastUserIdx = -1;
  for (let i = items.length - 1; i >= 0; i--) {
    const role: Role = (items[i] as any)?.rol ?? (items[i] as any)?.role;
    if (role !== 'user') continue;
    const joined = toStrings((items[i] as any)?.content).map(norm).join(' ');
    if (q && joined.includes(q)) { lastUserIdx = i; break; }
    if (lastUserIdx === -1) lastUserIdx = i;
  }

  for (let j = Math.max(0, lastUserIdx + 1); j < items.length; j++) {
    const role: Role = (items[j] as any)?.rol ?? (items[j] as any)?.role;
    if (role === 'assistant') {
      const texts = toStrings((items[j] as any)?.content);
      if (texts.length) return texts;
    }
  }
  for (let k = items.length - 1; k >= 0; k--) {
    const role: Role = (items[k] as any)?.rol ?? (items[k] as any)?.role;
    if (role === 'assistant') {
      const texts = toStrings((items[k] as any)?.content);
      if (texts.length) return texts;
    }
  }
  return [];
};

/* -------------------- Pregunta (full width azul compacto) ----------------- */
function UserMessageWide({ text }: { text: string }) {
  return (
    <div className="col-start-1 col-end-12 px-2 py-1">
      <div className="flex flex-row gap-3">
        <div className="flex-1 rounded-2xl border-2 border-indigo-400/60 shadow-md
                        bg-gradient-to-r from-indigo-600 to-indigo-500
                        text-white px-4 py-3 whitespace-pre-wrap break-words">
          {text}
        </div>
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------------- */

export const AssistantPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string>();

  const submittingRef = useRef(false);
  const lastQuestionRef = useRef<{ text: string; at: number } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('threadId');
    if (saved) setThreadId(saved);
    else createThreadUseCase().then((id) => { setThreadId(id); localStorage.setItem('threadId', id); });
  }, []);

  const handleResetThread = async () => {
    localStorage.removeItem('threadId');
    setMessages([]);
    const id = await createThreadUseCase();
    setThreadId(id);
    localStorage.setItem('threadId', id);
  };

  const handlePost = async (text: string) => {
    if (!threadId) return;
    const now = Date.now();
    const last = lastQuestionRef.current;
    if (submittingRef.current) return;
    if (last && last.text === text && now - last.at < 1500) return;
    submittingRef.current = true;
    lastQuestionRef.current = { text, at: now };

    setIsLoading(true);
    setMessages((prev) => [...prev, { text, isGpt: false }]);

    try {
      const replies = await postQuestionUseCase(threadId, text);
      const items = getItems(replies);
      const replyTexts = extractAssistantReply(items, text);

      if (replyTexts.length > 0) {
        setMessages((prev) => [...prev, ...replyTexts.map((t) => ({ text: t, isGpt: true }))]);
      } else {
        setMessages((prev) => [...prev, { text: 'No se encontró respuesta del asistente.', isGpt: true }]);
      }
    } catch (err) {
      console.error('user-question failed:', err);
      setMessages((prev) => [...prev, { text: '⚠️ Error al obtener la respuesta.', isGpt: true }]);
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container p-3"> {/* menos padding */}
      {/* Header compacto */}
      <div className="mb-2 flex items-center justify-end">
        <button
          className="btn-primary text-xs px-2.5 py-1 rounded-lg"
          onClick={handleResetThread}
          title="Crear un nuevo thread y limpiar la conversación"
        >
          Nuevo chat
        </button>
      </div>

      {/* Chat compacto */}
      <div className="chat-messages mb-2">
        <div className="grid grid-cols-12 gap-y-1">
          <GptMessage text="**Buen día**, soy tu asistente del *Código Civil* y **Leyes de Familia** de Chile. ¿En qué puedo ayudarte?" />

          {messages.map((m, i) =>
            m.isGpt ? <GptMessage key={i} text={m.text} /> : <UserMessageWide key={i} text={m.text} />
          )}

          {isLoading && (
            <div className="col-start-1 col-end-12 fade-in grid">
              <TypingLoader />
            </div>
          )}
        </div>
      </div>

      <TextMessageBox
        onSendMessage={handlePost}
        placeholder="Escribe aquí lo que deseas"
        disableCorrections
      />
    </div>
  );
};
