import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // Use a standalone application so BullMQ workers (providers) initialise
  // alongside the gRPC microservice transport.
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['analyzer.v1'],
      protoPath: [join(__dirname, '../../..', 'packages/proto/analyzer/v1/analyzer.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50053}`,
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
  await app.init();
  console.log(`SEO Analyzer gRPC service running on port ${process.env.GRPC_PORT || 50053}`);
  console.log(`SEO Analyzer BullMQ worker listening on queue "analyze.start"`);
}
bootstrap();
