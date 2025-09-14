import { Test, TestingModule } from '@nestjs/testing';
import { UnitTestService } from './unit-test.service';

describe('UnitTestService', () => {
  let service: UnitTestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnitTestService],
    }).compile();

    service = module.get<UnitTestService>(UnitTestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
