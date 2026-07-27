import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { API_CONFIG } from '@cmp/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: [process.env.ADMIN_URL ?? 'http://localhost:3001'],
    credentials: true,
  });
  app.setGlobalPrefix(API_CONFIG.prefix);

  const swagger = new DocumentBuilder()
    .setTitle('Consent Management Platform API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(API_CONFIG.port);
  console.log(`API listening on http://localhost:${API_CONFIG.port}/${API_CONFIG.prefix}`);
}

bootstrap();
