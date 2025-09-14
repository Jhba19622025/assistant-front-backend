import { Test, TestingModule } from '@nestjs/testing';
import { UnitTestController } from './unit-test.controller';

describe('UnitTestController', () => {
  let controller: UnitTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnitTestController],
    }).compile();

    controller = module.get<UnitTestController>(UnitTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
