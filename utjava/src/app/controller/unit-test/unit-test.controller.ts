import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Response } from 'express';
import { UnitTestService } from 'src/app/services/unit-test/unit-test.service';

@Controller('unit-test')
export class UnitTestController {
  constructor(private readonly unitTestService: UnitTestService) {}

  @Post('generate')
  @UseInterceptors(FileInterceptor('file'))
  async generate(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ): Promise<void> {
    if (!file) {
      res.status(400).send('No se proporcionó ningún archivo.');
      return;
    }

    try {
      const filePath = await this.unitTestService.generateUnitTest(
        file.buffer.toString(),
      );
      res.download(filePath, 'GeneratedUnitTest.java', (err) => {
        if (err) {
          res.status(500).send('Error al enviar el archivo');
        }
      });
    } catch (error) {
      res.status(400).send(error.message);
    }
  }
}
