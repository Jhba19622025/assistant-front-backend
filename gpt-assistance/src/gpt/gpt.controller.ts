import { Body, Controller, Post } from '@nestjs/common';
import { GptService } from './gpt.service';

import { QuestionDto } from './dto/dto/question.dto';

@Controller('gpt')
export class GptController {
  constructor(private readonly gptService: GptService) { }


  @Post('test')
  testCheck() {

    return this.gptService.testUseCaseChek();
  }

  @Post('create-thread')
  async createThread() {
    return await  this.gptService.createThread();

  }


  @Post('user-question')

  async userQuestion(
    @Body() questionDto: QuestionDto
  ) {
    return await this.gptService.userQuestion(questionDto);

  }



}
