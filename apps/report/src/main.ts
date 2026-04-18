import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { PROTO_ROOT } from '@repo/proto';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['report.v1'],
      protoPath: [join(PROTO_ROOT, 'report/v1/report.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50055}`,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [
          PROTO_ROOT,
          join(PROTO_ROOT, 'analyzer/v1'),
          join(PROTO_ROOT, 'keyword/v1'),
          join(PROTO_ROOT, 'common/v1'),
        ],
      },
    },
  });

  await app.startAllMicroservices();

  const httpPort = process.env.HTTP_PORT || 3004;
  await app.listen(httpPort);
  console.log(`Report HTTP service running on port ${httpPort}`);
  console.log(`Report gRPC service running on port ${process.env.GRPC_PORT || 50055}`);
  console.log(`Report worker listening on BullMQ queue: report.start`);
}
bootstrap();
