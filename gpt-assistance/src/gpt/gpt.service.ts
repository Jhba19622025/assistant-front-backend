import { Injectable } from '@nestjs/common';

import OpenAI from 'openai';


import { checkCompleteStatusUseCase, createMessageUseCase, createRunUseCase, createThreadUseCase, getMessageListUseCase, testUseCase } from './use-cases';
import { QuestionDto } from './dto/dto/question.dto';


@Injectable()
export class GptService { // Solo llama uses-cases

  private openai = new OpenAI(
    { apiKey: process.env.OPEN_API_KEY }
  );

  async testUseCaseChek() {

    return await testUseCase();
  }

   createThread() {

    return  createThreadUseCase(this.openai);

  }


  async userQuestion(questionDto: QuestionDto) {

    // const { id } = await createThreadUseCase(this.openai);

    // questionDto.threadId = id;


    const { threadId, question } = questionDto;
    const message = await createMessageUseCase(this.openai, { threadId, question });
    console.log(message);
    const run = await createRunUseCase(this.openai, {
      threadId
    })

    await checkCompleteStatusUseCase(this.openai, { runId: run.id, threadId: threadId });

    console.log(run);

    const messages = await getMessageListUseCase(this.openai, { threadId });

    return messages

  }
}
