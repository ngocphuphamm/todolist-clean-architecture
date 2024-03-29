import { RootModule } from '@application/di/.RootModule';
import { ApiServerConfig } from '@infrastructure/config/ApiServerConfig';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';

import helmet from 'helmet';

export class ServerApplication {
  private readonly host: string = ApiServerConfig.HOST;

  private readonly port: number = ApiServerConfig.PORT;

  public async run(): Promise<void> {
    const app: NestExpressApplication =
      await NestFactory.create<NestExpressApplication>(RootModule);

    app.setGlobalPrefix('api/v1'); // Set the global prefix to /api/v1

    // GLOBAL MIDDLEWARES
    app.enableCors();

    app.use(cookieParser());
    app.use(helmet());
    app.use(compression());
    this.buildAPIDocumentation(app);
    this.log();

    await app.listen(this.port, this.host);
  }

  private buildAPIDocumentation(app: NestExpressApplication): void {
    const title: string = 'To Do List';
    const description: string = 'To Do List API documentation';
    const version: string = '1.0.0';

    const options: Omit<OpenAPIObject, 'paths'> = new DocumentBuilder()
      .setTitle(title)
      .setDescription(description)
      .setVersion(version)
      .addBearerAuth({
        type: 'apiKey',
        in: 'header',
        name: ApiServerConfig.ACCESS_TOKEN_HEADER,
      })
      .build();

    const document: OpenAPIObject = SwaggerModule.createDocument(app, options);

    SwaggerModule.setup('documentation', app, document);
  }

  private log(): void {
    Logger.log(
      `Server started on host: ${this.host}; port: ${this.port};`,
      ServerApplication.name
    );
  }

  public static new(): ServerApplication {
    return new ServerApplication();
  }
}
