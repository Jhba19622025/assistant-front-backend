import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GptModule } from './gpt/gpt.module';
import { AppController } from './app.controller';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GptModule
  ],
  controllers: [AppController],

})
export class AppModule { }
