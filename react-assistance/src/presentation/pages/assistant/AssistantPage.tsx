// file: src/presentation/pages/assistant/AssistantPage.tsx
import { useEffect, useRef, useState } from 'react';
import { GptMessage, TypingLoader, TextMessageBox } from '../../components';
import { createThreadUseCase, postQuestionUseCase } from '../../../core/use-cases';

type AnyObj = Record<string, any>;
type Role = 'assistant' | 'user' | string;

interface ChatMessage { text: string; isGpt: boolean; }
interface ListedFile { id: string; name: string; size?: number; }

/* ---------------------------- Helpers de parsing --------------------------- */
const isObj = (v: unknown): v is AnyObj => typeof v === 'object' && v !== null;

const toStrings = (content: any): string[] => {
  if (!content) return [];
  if (typeof content === 'string') return [content];
  if (Array.isArray(content)) {
    const out: string[] = [];
    for (const part of content) {
      if (typeof part === 'string') out.push(part);
      else if (typeof part?.text === 'string') out.push(part.text);
      else if (typeof part?.text?.value === 'string') out.push(part.text.value);
      else if (part?.type === 'text' && typeof part?.text?.value === 'string') out.push(part.text.value);
      else if (typeof part?.content === 'string') out.push(part.content);
    }
    return out.filter(Boolean);
  }
  if (typeof content?.text === 'string') return [content.text];
  if (typeof content?.text?.value === 'string') return [content.text.value];
  if (typeof content?.value === 'string') return [content.value];
  return [];
};

// Extrae array de mensajes desde múltiples formatos: Array directo, {messages}, {data}
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
    if (Array.isArray(input.messages)) return input.messages as AnyObj[];
    if (Array.isArray(input.data)) return input.data as AnyObj[];
  }
  return [];
};

// Devuelve SOLO la respuesta del asistente a la última pregunta del usuario
const extractAssistantReply = (items: AnyObj[], userText: string): string[] => {
  if (!items.length) return [];
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const q = norm(userText);

  let lastUserIdx = -1;
  for (let i = items.length - 1; i >= 0; i--) {
    const role: Role = items[i]?.rol ?? items[i]?.role;
    if (role !== 'user') continue;
    const joined = toStrings(items[i]?.content).map(norm).join(' ');
    if (q && joined.includes(q)) { lastUserIdx = i; break; }
    if (lastUserIdx === -1) lastUserIdx = i;
  }

  for (let j = Math.max(0, lastUserIdx + 1); j < items.length; j++) {
    const role: Role = items[j]?.rol ?? items[j]?.role;
    if (role === 'assistant') {
      const texts = toStrings(items[j]?.content);
      if (texts.length) return texts;
    }
  }
  for (let k = items.length - 1; k >= 0; k--) {
    const role: Role = items[k]?.rol ?? items[k]?.role;
    if (role === 'assistant') {
      const texts = toStrings(items[k]?.content);
      if (texts.length) return texts;
    }
  }
  return [];
};
/* ------------------------------------------------------------------------- */

/* -------------------- Mensaje de usuario (full width azul) ---------------- */
function UserMessageWide({ text }: { text: string }) {
  return (
    <div className="col-start-1 col-end-12 p-3">
      <div className="flex flex-row gap-3">
        <div className="flex-1 rounded-2xl border border-indigo-300/30 shadow-sm bg-indigo-600 text-white px-4 py-3 whitespace-pre-wrap break-words">
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

  // Estado de archivos (para mostrar lista/descarga; subida deshabilitada)
  const [files, setFiles] = useState<ListedFile[]>([]);

  // Evita doble submit accidental (Enter+botón)
  const submittingRef = useRef(false);
  const lastQuestionRef = useRef<{ text: string; at: number } | null>(null);

  // Crear/recuperar thread
  useEffect(() => {
    const saved = localStorage.getItem('threadId');
    if (saved) setThreadId(saved);
    else createThreadUseCase().then((id) => { setThreadId(id); localStorage.setItem('threadId', id); });
  }, []);

  // Cargar archivos al montar/cambiar thread
  const refreshFiles = async () => {
    if (!threadId) return;
    try {
      const url = `${import.meta.env.VITE_API_BASE}/files?threadId=${encodeURIComponent(threadId)}`;
      const resp = await fetch(url);
      if (!resp.ok) return;
      const list = (await resp.json()) as ListedFile[];
      setFiles(list ?? []);
    } catch { /* silencio */ }
  };
  useEffect(() => { refreshFiles(); }, [threadId]);

  // Nuevo chat: limpia threadId y conversación
  const handleResetThread = async () => {
    localStorage.removeItem('threadId');
    setMessages([]);
    setFiles([]);
    const id = await createThreadUseCase();
    setThreadId(id);
    localStorage.setItem('threadId', id);
  };

  const handlePost = async (text: string) => {
    if (!threadId) return;

    // Anti-rebote sencillo
    const now = Date.now();
    const last = lastQuestionRef.current;
    if (submittingRef.current) return;
    if (last && last.text === text && now - last.at < 1500) return;
    submittingRef.current = true;
    lastQuestionRef.current = { text, at: now };

    setIsLoading(true);
    setMessages((prev) => [...prev, { text, isGpt: false }]);

    try {
      const replies = await postQuestionUseCase(threadId, text); // llamada única
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

  // Descarga de archivos (se mantiene)
  const handleDownload = async (file: ListedFile) => {
    try {
      const url = `${import.meta.env.VITE_API_BASE}/download-file?fileId=${encodeURIComponent(file.id)}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name || `file-${file.id}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { text: `⚠️ Error al descargar "${file.name}".`, isGpt: true }]);
    }
  };

  return (
    <div className="chat-container">
      {/* Header mini con 'Nuevo chat' */}
      <div className="mb-3 flex items-center justify-between">
        <div />
        <button
          className="btn-primary text-sm px-3 py-1.5 rounded-lg"
          onClick={handleResetThread}
          title="Crear un nuevo thread y limpiar la conversación"
        >
          Nuevo chat
        </button>
      </div>

      {/* Panel de archivos (subida deshabilitada) */}
      <div className="mb-4 flex flex-col gap-3">
        {/* Botón de subir archivos deshabilitado (UI removida) */}
        {/*
        <div className="flex items-center gap-3">
          <label className="btn-primary text-sm px-3 py-1.5 rounded-lg cursor-pointer">
            Subir archivos
            <input type="file" className="hidden" multiple onChange={handleUpload}/>
          </label>
        </div>
        */}
        <div className="bg-white bg-opacity-5 rounded-xl p-3 border border-white/10">
          <div className="font-semibold mb-2">
             <span className="text-white/60">({files.length})</span>
          </div>
          {files.length === 0 ? (
            <div className="text-sm text-white/70">No hay archivos aún.</div>
          ) : (
            <ul className="space-y-2">
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between">
                  <span className="truncate">
                    {f.name}{' '}
                    {typeof f.size === 'number' ? <span className="text-white/60">· {(f.size / 1024).toFixed(1)} KB</span> : null}
                  </span>
                  <button className="btn-primary text-sm px-3 py-1.5 rounded-lg" onClick={() => handleDownload(f)}>
                    Descargar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="chat-messages">
        <div className="grid grid-cols-12 gap-y-2">
          <GptMessage text="**Buen día**, soy tu asistente del *Código Civil* y **Leyes de Familia** de Chile. ¿En qué puedo ayudarte?" />
          {messages.map((m, i) => (m.isGpt ? <GptMessage key={i} text={m.text} /> : <UserMessageWide key={i} text={m.text} />))}
          {isLoading && (
            <div className="col-start-1 col-end-12 fade-in grid">
              <TypingLoader />
            </div>
          )}
        </div>
      </div>

      <TextMessageBox onSendMessage={handlePost} placeholder="Escribe aquí lo que deseas" disableCorrections />
    </div>
  );
};
