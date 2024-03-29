import {
  Global,
  Module,
  OnApplicationBootstrap,
  Provider,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional-cls-hooked';
import { RedisModule } from '@nestjs-modules/ioredis';

import { NestHttpExceptionFilter } from '@application/api/exception-filter/NestHttpExceptionFilter';
import { NestHttpLoggingInterceptor } from '@application/api/interceptor/NestHttpLoggingInterceptor';
import { CoreDITokens } from '@core/common/di/CoreDIToken';
import { NestCommandBusAdapter } from '@infrastructure/adapter/mesage/NestCommandBusAdapter';
import { NestEventBusAdapter } from '@infrastructure/adapter/mesage/NestEventBusAdapter';
import { NestQueryBusAdapter } from '@infrastructure/adapter/mesage/NestQueryBusAdapter';
import { TypeOrmDirectory } from '@infrastructure/adapter/persistence/typeorm/TypeOrmDirectory';
import { ApiServerConfig } from '@infrastructure/config/ApiServerConfig';
import { DatabaseConfig } from '@infrastructure/config/DatabaseConfig';
import { APP_GUARD } from '@nestjs/core';
import { RateLimiterModule, RateLimiterGuard } from 'nestjs-rate-limiter';

const providers: Provider[] = [
  {
    provide: APP_FILTER,
    useClass: NestHttpExceptionFilter,
  },
  {
    provide: CoreDITokens.CommandBus,
    useClass: NestCommandBusAdapter,
  },
  {
    provide: CoreDITokens.QueryBus,
    useClass: NestQueryBusAdapter,
  },
  {
    provide: CoreDITokens.EventBus,
    useClass: NestEventBusAdapter,
  },
  {
    provide: APP_GUARD,
    useClass: RateLimiterGuard,
  },
];

if (ApiServerConfig.LOG_ENABLE) {
  providers.push({
    provide: APP_INTERCEPTOR,
    useClass: NestHttpLoggingInterceptor,
  });
}

@Global()
@Module({
  imports: [
    CqrsModule,
    RateLimiterModule.register({
      points: ApiServerConfig.API_LIMIT_NUMBER, // number of points
      duration: ApiServerConfig.API_DURATION_NUMBER, // time window in seconds
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: DatabaseConfig.DB_HOST,
      port: DatabaseConfig.DB_PORT,
      username: DatabaseConfig.DB_USERNAME,
      password: DatabaseConfig.DB_PASSWORD,
      database: DatabaseConfig.DB_NAME,
      entities: [`${TypeOrmDirectory}/entity/**/*{.ts,.js}`],
      synchronize: true,
    }),
    RedisModule.forRoot({
      config: {
        url: DatabaseConfig.REDIS_URL,
        password: DatabaseConfig.REDIS_KEY,
      },
    }),
  ],
  providers: providers,
  exports: [
    CoreDITokens.CommandBus,
    CoreDITokens.QueryBus,
    CoreDITokens.EventBus,
  ],
})
export class InfrastructureModule implements OnApplicationBootstrap {
  onApplicationBootstrap(): void {
    initializeTransactionalContext();
  }
}
