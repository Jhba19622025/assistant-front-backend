// file: src/presentation/pages/assistant/AssistantPage.tsx
import { useEffect, useState } from 'react';
import { GptMessage, TypingLoader, TextMessageBox, MyMessage } from '../../components';
import { createThreadUseCase, postQuestionUseCase } from '../../../core/use-cases';

type AnyObj = Record<string, any>;
type Role = 'assistant' | 'user' | string;

interface Message {
  text: string;
  isGpt: boolean;
}

/* ----------------------- Helpers robustos y simples ----------------------- */
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
    // Caso: ya es el array de mensajes [{rol, content}]
    if (input.every((m) => isObj(m) && ('rol' in m || 'role' in m) && 'content' in m)) {
      return input as AnyObj[];
    }
    // Caso: mezcla de eventos + snapshot
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

  // Preferir el último user que contenga el texto enviado
  let lastUserIdx = -1;
  for (let i = items.length - 1; i >= 0; i--) {
    const role: Role = items[i]?.rol ?? items[i]?.role;
    if (role !== 'user') continue;
    const joined = toStrings(items[i]?.content).map(norm).join(' ');
    if (q && joined.includes(q)) {
      lastUserIdx = i;
      break;
    }
    if (lastUserIdx === -1) lastUserIdx = i; // fallback al último user si no hay match exacto
  }

  // Buscar el PRIMER assistant después de ese user
  for (let j = Math.max(0, lastUserIdx + 1); j < items.length; j++) {
    const role: Role = items[j]?.rol ?? items[j]?.role;
    if (role === 'assistant') {
      const texts = toStrings(items[j]?.content);
      if (texts.length) return texts;
    }
  }

  // Fallback: último assistant del array
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

export const AssistantPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string>();

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

  const handlePost = async (text: string) => {
    if (!threadId) return;

    setIsLoading(true);
    setMessages((prev) => [...prev, { text, isGpt: false }]);

    try {
      const replies = await postQuestionUseCase(threadId, text);
      const items = getItems(replies);             // <- tolerante al formato
      const replyTexts = extractAssistantReply(items, text); // <- UNA sola respuesta

      if (replyTexts.length > 0) {
        // si vienen varias partes, las mostramos en mensajes separados
        setMessages((prev) => [
          ...prev,
          ...replyTexts.map((t) => ({ text: t, isGpt: true })),
        ]);
      } else {
        // fallback visible para depurar
        setMessages((prev) => [
          ...prev,
          { text: 'No se encontró respuesta del asistente en el payload.', isGpt: true },
        ]);
        // console.debug('Payload sin respuesta:', replies);
      }
    } catch (err) {
      console.error('postQuestionUseCase failed:', err);
      setMessages((prev) => [
        ...prev,
        { text: '⚠️ Ocurrió un error al obtener la respuesta. Intenta de nuevo.', isGpt: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        <div className="grid grid-cols-12 gap-y-2">
          <GptMessage text="Buen día, Soy tu asistente del codigo Civil y Leyes de Familia de  Chile, ¿en qué puedo ayudarte?" />

          {messages.map((m, i) =>
            m.isGpt ? <GptMessage key={i} text={m.text} /> : <MyMessage key={i} text={m.text} />
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
