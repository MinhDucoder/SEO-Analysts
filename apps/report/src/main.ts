import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['report.v1'],
      protoPath: [join(__dirname, '../../..', 'packages/proto/report/v1/report.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50055}`,
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

  await app.startAllMicroservices();

  const httpPort = process.env.HTTP_PORT || 3004;
  await app.listen(httpPort);
  console.log(`Report HTTP service running on port ${httpPort}`);
  console.log(`Report gRPC service running on port ${process.env.GRPC_PORT || 50055}`);
}
bootstrap();
