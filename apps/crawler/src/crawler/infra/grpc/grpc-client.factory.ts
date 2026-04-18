/**
 * @file Thin DI wrapper around `@grpc/proto-loader` + `@grpc/grpc-js`.
 * Mirror of the gateway's factory so the crawler can consume
 * downstream services (currently: seo-analyzer) synchronously when
 * running per-URL audits inside the site-wide pipeline.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  credentials,
  GrpcObject,
  loadPackageDefinition,
  ServiceClientConstructor,
} from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import { join } from 'path';
import { PROTO_ROOT } from '@repo/proto';

interface ClientOptions {
  protoPath: string;
  packageName: string;
  serviceName: string;
  url: string;
}

@Injectable()
export class GrpcClientFactory {
  private readonly logger = new Logger(GrpcClientFactory.name);
  private readonly protoRoot = PROTO_ROOT;

  create<T = unknown>(opts: ClientOptions): T {
    const fullPath = join(this.protoRoot, opts.protoPath);
    const def = loadSync(fullPath, {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [this.protoRoot],
    });
    const grpcObj = loadPackageDefinition(def) as GrpcObject;
    const pkgParts = opts.packageName.split('.');
    let pkg: GrpcObject = grpcObj;
    for (const part of pkgParts) {
      pkg = pkg[part] as GrpcObject;
    }
    const ServiceCtor = pkg[opts.serviceName] as unknown as ServiceClientConstructor;
    this.logger.log(`Creating gRPC client for ${opts.packageName}.${opts.serviceName} → ${opts.url}`);
    return new ServiceCtor(opts.url, credentials.createInsecure()) as unknown as T;
  }
}
