// file: src/core/use-cases/postQuestionUseCase.ts
import { QuestionResponse } from '../../../interfaces';

type PostOpts = { signal?: AbortSignal };

export const postQuestionUseCase = async (
  threadId: string,
  question: string,
  opts: PostOpts = {}
) => {
  try {
    const resp = await fetch(`${import.meta.env.VITE_API_BASE}/user-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, question }),
      signal: opts.signal, // Por qué: permitir cancelación externa
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const replies = (await resp.json()) as QuestionResponse[] | unknown;
    return replies;
  } catch (error) {
    // Importante: si fue abort, relanzar mismo error para distinguir arriba
    if ((error as any)?.name === 'AbortError') throw error;
    console.log(error);
    throw new Error('Error posting question');
  }
};
