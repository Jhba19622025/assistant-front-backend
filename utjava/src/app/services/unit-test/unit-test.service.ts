import { Injectable } from '@nestjs/common';
import { writeFile } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import OpenAI from 'openai';

@Injectable()
export class UnitTestService {
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  private async writeToFile(content: string, filePath: string): Promise<void> {
    const writeFileAsync = promisify(writeFile);
    await writeFileAsync(filePath, content, 'utf8');
  }

  async generateUnitTest(codigoFuente: string): Promise<string> {
    if (!codigoFuente) {
      throw new Error('No se proporcionó el código fuente.');
    }

    const response = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `
            Generar pruebas unitarias desde 0 en Java utilizando JUnit5 y Mockito. 
            Cada prueba debe cubrir todos los casos posibles y verificar el comportamiento correcto e incorrecto. 
            Las pruebas deben ser claras y bien documentadas para los TODOS LOS métodos:\n\n${codigoFuente}
           
            `,
        },
        {
          role: 'user',
          content: `Por favor, asegúrate de incluir aserciones detalladas para todo el codigo y mockear dependencias externas donde sea necesario.
            No omitas ningun metodos. Apunta a un coverage de 80%. `,
        },
      ],
      model: 'gpt-3.5-turbo',
      temperature: 0.5,
      max_tokens: 2048,
    });

    // const response = await this.openai.chat.completions.create({
    //   messages: [
    //     {
    //       role: 'system',
    //       content: `
    //         Generar pruebas unitarias para todos los metodos en Java utilizando JUnit y Mockito para el siguiente código fuente:\n\n${codigoFuente}
    //         Agregar más pruebas para los demás métodos de la clase CursoServiceImpl `,
    //     },
    //   ],
    //   model: 'gpt-3.5-turbo',
    //   temperature: 0.5,
    //   //  max_tokens: 1500,
    // });

    // const prompt = `
    // Generar pruebas unitarias en Java utilizando JUnit y Mockito para el siguiente código fuente:\n\n${codigoFuente}\n\n`;
    // const response = await axios.post(
    //   'https://api.openai.com/v1/completions',
    //   {
    //     model: 'text-davinci-003',
    //     prompt: prompt,
    //     temperature: 0.5,
    //     max_tokens: 300,
    //   },
    //   {
    //     headers: {
    //       Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    //     },
    //   },
    // );

    const testsContent = response.choices[0].message.content;
    const testsFilePath = path.join(
      __dirname,
      '../../../../source/GeneratedUnitTest.java',
    );

    // const testsContent = response.data.choices[0].text.trim();
    // const testsFilePath = path.join(__dirname, '../../GeneratedUnitTest.java');

    await this.writeToFile(testsContent, testsFilePath);
    return testsFilePath;
  }
}
