import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_ROOT = path.join(__dirname, '..');

const LOADER_OPTIONS: protoLoader.Options = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [PROTO_ROOT],
};

export function loadProto(protoFile: string): grpc.GrpcObject {
  const protoPath = path.join(PROTO_ROOT, protoFile);
  const packageDefinition = protoLoader.loadSync(protoPath, LOADER_OPTIONS);
  return grpc.loadPackageDefinition(packageDefinition);
}

export const PROTO_FILES = {
  COMMON: 'common/v1/common.proto',
  CRAWLER: 'crawler/v1/crawler.proto',
  ANALYZER: 'analyzer/v1/analyzer.proto',
  KEYWORD: 'keyword/v1/keyword.proto',
  REPORT: 'report/v1/report.proto',
} as const;

export { grpc };
