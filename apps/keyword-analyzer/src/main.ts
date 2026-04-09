import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: ['keyword.v1'],
      protoPath: [join(__dirname, '../../..', 'packages/proto/keyword/v1/keyword.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50054}`,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [join(__dirname, '../../..', 'packages/proto')],
      },
    },
  });
  await app.listen();
  console.log(`Keyword Analyzer gRPC service running on port ${process.env.GRPC_PORT || 50054}`);
}
bootstrap();
