// path: src/gpt/gpt.service.ts
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  checkCompleteStatusUseCase,
  createMessageUseCase,
  createRunUseCase,
  createThreadUseCase,
  getMessageListUseCase,
  testUseCase,
} from './use-cases';
import { QuestionDto } from './dto/dto/question.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GptService {
  private openai = new OpenAI();

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY is missing');
    this.openai = new OpenAI({ apiKey });
  }

  /** Útil para health-checks/manual tests. */
  async testUseCaseChek() {
    return testUseCase();
  }

  /** Crea un thread explícitamente (opcional, para flujos que lo necesiten). */
  createThread() {
    return createThreadUseCase(this.openai);
  }

  /**
   * Recibe una pregunta y mantiene contexto reutilizando el mismo thread.
   * Por qué: crear un thread por turno elimina el historial visible al modelo.
   */
  async userQuestion(
    questionDto: QuestionDto,
  ): Promise<{ threadId: string; messages: any[] }> {
    const threadId = await this.getOrCreateThreadId(questionDto); // <- evita crear hilos nuevos

    console.log(threadId);

    const { question } = questionDto;
    await createMessageUseCase(this.openai, { threadId, question });

    const run = await createRunUseCase(this.openai, { threadId });

    await checkCompleteStatusUseCase(this.openai, {
      runId: run.id,
      threadId,
    });

    const messages = await getMessageListUseCase(this.openai, { threadId });

    // Devolvemos el threadId para que el cliente lo persista y lo envíe en el próximo turno.
    return {
      threadId,
      messages: messages.reverse(),
    };
  }

  /**
   * Si el DTO ya trae threadId, lo usa; si no, crea un hilo y lo establece.
   * Por qué: delega en el cliente persistir el threadId entre turnos.
   */
  private async getOrCreateThreadId(dto: QuestionDto): Promise<string> {
    if (dto.threadId && dto.threadId.trim().length > 0) {
      return dto.threadId;
    }
    const { id } = await createThreadUseCase(this.openai);
    dto.threadId = id; // el cliente puede guardarlo tras la respuesta
    return id;
  }
}
