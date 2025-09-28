// file: src/presentation/pages/assistant/AssistantPage.tsx
import { useEffect, useRef, useState } from 'react';
import { GptMessage, TypingLoader, TextMessageBox, MyMessage } from '../../components';
import { createThreadUseCase, postQuestionUseCase } from '../../../core/use-cases';

type AnyObj = Record<string, any>;
type Role = 'assistant' | 'user' | string;

interface ChatMessage {
  text: string;
  isGpt: boolean;
}

interface ListedFile {
  id: string;
  name: string;
  size?: number;
}

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
    if (input.every((m) => isObj(m) && ('rol' in m || 'role' in m) && 'content' in m)) {
      return input as AnyObj[];
    }
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
    if (q && joined.includes(q)) {
      lastUserIdx = i;
      break;
    }
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

export const AssistantPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string>();
  const [files, setFiles] = useState<ListedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // AbortController para cancelar petición en curso
  const chatAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('threadId');
    if (saved) {
      setThreadId(saved);
    } else {
      createThreadUseCase().then((id) => {
        setThreadId(id);
        localStorage.setItem('threadId', id);
      });
    }
  }, []);

  const refreshFiles = async () => {
    if (!threadId) return;
    try {
      const url = `${import.meta.env.VITE_API_BASE}/files?threadId=${encodeURIComponent(threadId)}`;
      const resp = await fetch(url);
      if (!resp.ok) return;
      const list = (await resp.json()) as { id: string; name: string; size?: number }[];
      setFiles(list ?? []);
    } catch {
      /* opcional */
    }
  };

  useEffect(() => {
    refreshFiles();
  }, [threadId]);

  const handlePost = async (text: string) => {
    if (!threadId) return;

    // Cancelar petición anterior
    if (chatAbortRef.current) chatAbortRef.current.abort();
    chatAbortRef.current = new AbortController();

    setIsLoading(true);
    setMessages((prev) => [...prev, { text, isGpt: false }]);

    try {
      const replies = await postQuestionUseCase(threadId, text, {
        signal: chatAbortRef.current.signal,
      });

      const items = getItems(replies);
      const replyTexts = extractAssistantReply(items, text);

      if (replyTexts.length > 0) {
        setMessages((prev) => [...prev, ...replyTexts.map((t) => ({ text: t, isGpt: true }))]);
      } else {
        setMessages((prev) => [
          ...prev,
          { text: 'No se encontró respuesta del asistente en el payload.', isGpt: true },
        ]);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('postQuestionUseCase failed:', err);
        setMessages((prev) => [
          ...prev,
          { text: '⚠️ Error al obtener la respuesta. Intenta de nuevo.', isGpt: true },
        ]);
      }
    } finally {
      chatAbortRef.current = null;
      setIsLoading(false);
    }
  };

  const handleUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (!threadId) return;
    const filesToUpload = ev.target.files;
    if (!filesToUpload || filesToUpload.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(filesToUpload)) {
        const form = new FormData();
        form.append('file', file);
        form.append('threadId', threadId);

        const resp = await fetch(`${import.meta.env.VITE_API_BASE}/upload-file`, {
          method: 'POST',
          body: form,
        });
        if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
      }
      await refreshFiles();
      (ev.target as HTMLInputElement).value = '';
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { text: '⚠️ Error al subir archivo(s).', isGpt: true },
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (file: ListedFile) => {
    try {
      const url = `${import.meta.env.VITE_API_BASE}/download-file?fileId=${encodeURIComponent(
        file.id
      )}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name || `file-${file.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { text: `⚠️ Error al descargar "${file.name}".`, isGpt: true },
      ]);
    }
  };

  return (
    <div className="chat-container">
      {/* Botones más chicos */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <label className="btn-primary text-sm px-3 py-1.5 rounded-lg cursor-pointer">
            {isUploading ? 'Subiendo…' : 'Subir archivos'}
            <input
              type="file"
              className="hidden"
              multiple
              onChange={handleUpload}
              disabled={isUploading}
            />
          </label>
          <button
            className="btn-primary text-sm px-3 py-1.5 rounded-lg"
            onClick={refreshFiles}
            disabled={!threadId || isUploading}
          >
            Actualizar lista
          </button>
        </div>

        {files.length > 0 && (
          <div className="bg-white bg-opacity-5 rounded-xl p-3">
            <div className="font-semibold mb-2">Archivos ({files.length})</div>
            <ul className="space-y-2">
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between">
                  <span className="truncate">
                    {f.name} {typeof f.size === 'number' ? `· ${(f.size / 1024).toFixed(1)} KB` : ''}
                  </span>
                  <button
                    className="btn-primary text-sm px-3 py-1.5 rounded-lg"
                    onClick={() => handleDownload(f)}
                    aria-label={`Descargar ${f.name}`}
                  >
                    Descargar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="chat-messages">
        <div className="grid grid-cols-12 gap-y-2">
          <GptMessage text="**Buen día**, soy tu asistente del *Código Civil* y **Leyes de Familia** de Chile. ¿En qué puedo ayudarte?" />

          {messages.map((m, i) =>
            m.isGpt ? (
              <GptMessage key={i} text={m.text} />
            ) : (
              // Forzar texto blanco en la burbuja de la pregunta
              <div key={i} className="text-white">
                <MyMessage text={m.text} />
              </div>
            )
          )}

          {isLoading && (
            <div className="col-start-1 col-end-12 fade-in">
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
