import { Module } from '@nestjs/common';
import { UnitTestService } from './app/services/unit-test/unit-test.service';
import { UnitTestController } from './app/controller/unit-test/unit-test.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [UnitTestController],
  providers: [UnitTestService],
})
export class AppModule {}
