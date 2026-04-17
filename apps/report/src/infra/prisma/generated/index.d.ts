
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Report
 * 
 */
export type Report = $Result.DefaultSelection<Prisma.$ReportPayload>
/**
 * Model ReportKeyword
 * 
 */
export type ReportKeyword = $Result.DefaultSelection<Prisma.$ReportKeywordPayload>
/**
 * Model ReportCwv
 * 
 */
export type ReportCwv = $Result.DefaultSelection<Prisma.$ReportCwvPayload>
/**
 * Model ShareLink
 * 
 */
export type ShareLink = $Result.DefaultSelection<Prisma.$ShareLinkPayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Reports
 * const reports = await prisma.report.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Reports
   * const reports = await prisma.report.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.report`: Exposes CRUD operations for the **Report** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Reports
    * const reports = await prisma.report.findMany()
    * ```
    */
  get report(): Prisma.ReportDelegate<ExtArgs>;

  /**
   * `prisma.reportKeyword`: Exposes CRUD operations for the **ReportKeyword** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ReportKeywords
    * const reportKeywords = await prisma.reportKeyword.findMany()
    * ```
    */
  get reportKeyword(): Prisma.ReportKeywordDelegate<ExtArgs>;

  /**
   * `prisma.reportCwv`: Exposes CRUD operations for the **ReportCwv** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ReportCwvs
    * const reportCwvs = await prisma.reportCwv.findMany()
    * ```
    */
  get reportCwv(): Prisma.ReportCwvDelegate<ExtArgs>;

  /**
   * `prisma.shareLink`: Exposes CRUD operations for the **ShareLink** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ShareLinks
    * const shareLinks = await prisma.shareLink.findMany()
    * ```
    */
  get shareLink(): Prisma.ShareLinkDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Report: 'Report',
    ReportKeyword: 'ReportKeyword',
    ReportCwv: 'ReportCwv',
    ShareLink: 'ShareLink'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "report" | "reportKeyword" | "reportCwv" | "shareLink"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Report: {
        payload: Prisma.$ReportPayload<ExtArgs>
        fields: Prisma.ReportFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ReportFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ReportFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>
          }
          findFirst: {
            args: Prisma.ReportFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ReportFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>
          }
          findMany: {
            args: Prisma.ReportFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>[]
          }
          create: {
            args: Prisma.ReportCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>
          }
          createMany: {
            args: Prisma.ReportCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ReportCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>[]
          }
          delete: {
            args: Prisma.ReportDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>
          }
          update: {
            args: Prisma.ReportUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>
          }
          deleteMany: {
            args: Prisma.ReportDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ReportUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ReportUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>
          }
          aggregate: {
            args: Prisma.ReportAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateReport>
          }
          groupBy: {
            args: Prisma.ReportGroupByArgs<ExtArgs>
            result: $Utils.Optional<ReportGroupByOutputType>[]
          }
          count: {
            args: Prisma.ReportCountArgs<ExtArgs>
            result: $Utils.Optional<ReportCountAggregateOutputType> | number
          }
        }
      }
      ReportKeyword: {
        payload: Prisma.$ReportKeywordPayload<ExtArgs>
        fields: Prisma.ReportKeywordFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ReportKeywordFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportKeywordPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ReportKeywordFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportKeywordPayload>
          }
          findFirst: {
            args: Prisma.ReportKeywordFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportKeywordPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ReportKeywordFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportKeywordPayload>
          }
          findMany: {
            args: Prisma.ReportKeywordFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportKeywordPayload>[]
          }
          create: {
            args: Prisma.ReportKeywordCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportKeywordPayload>
          }
          createMany: {
            args: Prisma.ReportKeywordCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ReportKeywordCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportKeywordPayload>[]
          }
          delete: {
            args: Prisma.ReportKeywordDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportKeywordPayload>
          }
          update: {
            args: Prisma.ReportKeywordUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportKeywordPayload>
          }
          deleteMany: {
            args: Prisma.ReportKeywordDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ReportKeywordUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ReportKeywordUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportKeywordPayload>
          }
          aggregate: {
            args: Prisma.ReportKeywordAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateReportKeyword>
          }
          groupBy: {
            args: Prisma.ReportKeywordGroupByArgs<ExtArgs>
            result: $Utils.Optional<ReportKeywordGroupByOutputType>[]
          }
          count: {
            args: Prisma.ReportKeywordCountArgs<ExtArgs>
            result: $Utils.Optional<ReportKeywordCountAggregateOutputType> | number
          }
        }
      }
      ReportCwv: {
        payload: Prisma.$ReportCwvPayload<ExtArgs>
        fields: Prisma.ReportCwvFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ReportCwvFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportCwvPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ReportCwvFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportCwvPayload>
          }
          findFirst: {
            args: Prisma.ReportCwvFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportCwvPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ReportCwvFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportCwvPayload>
          }
          findMany: {
            args: Prisma.ReportCwvFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportCwvPayload>[]
          }
          create: {
            args: Prisma.ReportCwvCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportCwvPayload>
          }
          createMany: {
            args: Prisma.ReportCwvCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ReportCwvCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportCwvPayload>[]
          }
          delete: {
            args: Prisma.ReportCwvDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportCwvPayload>
          }
          update: {
            args: Prisma.ReportCwvUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportCwvPayload>
          }
          deleteMany: {
            args: Prisma.ReportCwvDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ReportCwvUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ReportCwvUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportCwvPayload>
          }
          aggregate: {
            args: Prisma.ReportCwvAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateReportCwv>
          }
          groupBy: {
            args: Prisma.ReportCwvGroupByArgs<ExtArgs>
            result: $Utils.Optional<ReportCwvGroupByOutputType>[]
          }
          count: {
            args: Prisma.ReportCwvCountArgs<ExtArgs>
            result: $Utils.Optional<ReportCwvCountAggregateOutputType> | number
          }
        }
      }
      ShareLink: {
        payload: Prisma.$ShareLinkPayload<ExtArgs>
        fields: Prisma.ShareLinkFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ShareLinkFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShareLinkPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ShareLinkFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShareLinkPayload>
          }
          findFirst: {
            args: Prisma.ShareLinkFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShareLinkPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ShareLinkFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShareLinkPayload>
          }
          findMany: {
            args: Prisma.ShareLinkFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShareLinkPayload>[]
          }
          create: {
            args: Prisma.ShareLinkCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShareLinkPayload>
          }
          createMany: {
            args: Prisma.ShareLinkCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ShareLinkCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShareLinkPayload>[]
          }
          delete: {
            args: Prisma.ShareLinkDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShareLinkPayload>
          }
          update: {
            args: Prisma.ShareLinkUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShareLinkPayload>
          }
          deleteMany: {
            args: Prisma.ShareLinkDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ShareLinkUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ShareLinkUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ShareLinkPayload>
          }
          aggregate: {
            args: Prisma.ShareLinkAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateShareLink>
          }
          groupBy: {
            args: Prisma.ShareLinkGroupByArgs<ExtArgs>
            result: $Utils.Optional<ShareLinkGroupByOutputType>[]
          }
          count: {
            args: Prisma.ShareLinkCountArgs<ExtArgs>
            result: $Utils.Optional<ShareLinkCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type ReportCountOutputType
   */

  export type ReportCountOutputType = {
    keywords: number
  }

  export type ReportCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    keywords?: boolean | ReportCountOutputTypeCountKeywordsArgs
  }

  // Custom InputTypes
  /**
   * ReportCountOutputType without action
   */
  export type ReportCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportCountOutputType
     */
    select?: ReportCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ReportCountOutputType without action
   */
  export type ReportCountOutputTypeCountKeywordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ReportKeywordWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Report
   */

  export type AggregateReport = {
    _count: ReportCountAggregateOutputType | null
    _avg: ReportAvgAggregateOutputType | null
    _sum: ReportSumAggregateOutputType | null
    _min: ReportMinAggregateOutputType | null
    _max: ReportMaxAggregateOutputType | null
  }

  export type ReportAvgAggregateOutputType = {
    finalScore: Decimal | null
    totalIssues: number | null
    criticalIssues: number | null
    warnIssues: number | null
    passCount: number | null
  }

  export type ReportSumAggregateOutputType = {
    finalScore: Decimal | null
    totalIssues: number | null
    criticalIssues: number | null
    warnIssues: number | null
    passCount: number | null
  }

  export type ReportMinAggregateOutputType = {
    id: string | null
    auditId: string | null
    url: string | null
    domain: string | null
    finalScore: Decimal | null
    classification: string | null
    totalIssues: number | null
    criticalIssues: number | null
    warnIssues: number | null
    passCount: number | null
    createdAt: Date | null
  }

  export type ReportMaxAggregateOutputType = {
    id: string | null
    auditId: string | null
    url: string | null
    domain: string | null
    finalScore: Decimal | null
    classification: string | null
    totalIssues: number | null
    criticalIssues: number | null
    warnIssues: number | null
    passCount: number | null
    createdAt: Date | null
  }

  export type ReportCountAggregateOutputType = {
    id: number
    auditId: number
    url: number
    domain: number
    finalScore: number
    classification: number
    totalIssues: number
    criticalIssues: number
    warnIssues: number
    passCount: number
    analysisSnapshot: number
    cwvSnapshot: number
    createdAt: number
    _all: number
  }


  export type ReportAvgAggregateInputType = {
    finalScore?: true
    totalIssues?: true
    criticalIssues?: true
    warnIssues?: true
    passCount?: true
  }

  export type ReportSumAggregateInputType = {
    finalScore?: true
    totalIssues?: true
    criticalIssues?: true
    warnIssues?: true
    passCount?: true
  }

  export type ReportMinAggregateInputType = {
    id?: true
    auditId?: true
    url?: true
    domain?: true
    finalScore?: true
    classification?: true
    totalIssues?: true
    criticalIssues?: true
    warnIssues?: true
    passCount?: true
    createdAt?: true
  }

  export type ReportMaxAggregateInputType = {
    id?: true
    auditId?: true
    url?: true
    domain?: true
    finalScore?: true
    classification?: true
    totalIssues?: true
    criticalIssues?: true
    warnIssues?: true
    passCount?: true
    createdAt?: true
  }

  export type ReportCountAggregateInputType = {
    id?: true
    auditId?: true
    url?: true
    domain?: true
    finalScore?: true
    classification?: true
    totalIssues?: true
    criticalIssues?: true
    warnIssues?: true
    passCount?: true
    analysisSnapshot?: true
    cwvSnapshot?: true
    createdAt?: true
    _all?: true
  }

  export type ReportAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Report to aggregate.
     */
    where?: ReportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Reports to fetch.
     */
    orderBy?: ReportOrderByWithRelationInput | ReportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ReportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Reports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Reports.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Reports
    **/
    _count?: true | ReportCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ReportAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ReportSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ReportMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ReportMaxAggregateInputType
  }

  export type GetReportAggregateType<T extends ReportAggregateArgs> = {
        [P in keyof T & keyof AggregateReport]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateReport[P]>
      : GetScalarType<T[P], AggregateReport[P]>
  }




  export type ReportGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ReportWhereInput
    orderBy?: ReportOrderByWithAggregationInput | ReportOrderByWithAggregationInput[]
    by: ReportScalarFieldEnum[] | ReportScalarFieldEnum
    having?: ReportScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ReportCountAggregateInputType | true
    _avg?: ReportAvgAggregateInputType
    _sum?: ReportSumAggregateInputType
    _min?: ReportMinAggregateInputType
    _max?: ReportMaxAggregateInputType
  }

  export type ReportGroupByOutputType = {
    id: string
    auditId: string
    url: string
    domain: string
    finalScore: Decimal
    classification: string
    totalIssues: number
    criticalIssues: number
    warnIssues: number
    passCount: number
    analysisSnapshot: JsonValue
    cwvSnapshot: JsonValue
    createdAt: Date
    _count: ReportCountAggregateOutputType | null
    _avg: ReportAvgAggregateOutputType | null
    _sum: ReportSumAggregateOutputType | null
    _min: ReportMinAggregateOutputType | null
    _max: ReportMaxAggregateOutputType | null
  }

  type GetReportGroupByPayload<T extends ReportGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ReportGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ReportGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ReportGroupByOutputType[P]>
            : GetScalarType<T[P], ReportGroupByOutputType[P]>
        }
      >
    >


  export type ReportSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auditId?: boolean
    url?: boolean
    domain?: boolean
    finalScore?: boolean
    classification?: boolean
    totalIssues?: boolean
    criticalIssues?: boolean
    warnIssues?: boolean
    passCount?: boolean
    analysisSnapshot?: boolean
    cwvSnapshot?: boolean
    createdAt?: boolean
    keywords?: boolean | Report$keywordsArgs<ExtArgs>
    cwv?: boolean | Report$cwvArgs<ExtArgs>
    shareLink?: boolean | Report$shareLinkArgs<ExtArgs>
    _count?: boolean | ReportCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["report"]>

  export type ReportSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auditId?: boolean
    url?: boolean
    domain?: boolean
    finalScore?: boolean
    classification?: boolean
    totalIssues?: boolean
    criticalIssues?: boolean
    warnIssues?: boolean
    passCount?: boolean
    analysisSnapshot?: boolean
    cwvSnapshot?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["report"]>

  export type ReportSelectScalar = {
    id?: boolean
    auditId?: boolean
    url?: boolean
    domain?: boolean
    finalScore?: boolean
    classification?: boolean
    totalIssues?: boolean
    criticalIssues?: boolean
    warnIssues?: boolean
    passCount?: boolean
    analysisSnapshot?: boolean
    cwvSnapshot?: boolean
    createdAt?: boolean
  }

  export type ReportInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    keywords?: boolean | Report$keywordsArgs<ExtArgs>
    cwv?: boolean | Report$cwvArgs<ExtArgs>
    shareLink?: boolean | Report$shareLinkArgs<ExtArgs>
    _count?: boolean | ReportCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ReportIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ReportPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Report"
    objects: {
      keywords: Prisma.$ReportKeywordPayload<ExtArgs>[]
      cwv: Prisma.$ReportCwvPayload<ExtArgs> | null
      shareLink: Prisma.$ShareLinkPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      auditId: string
      url: string
      domain: string
      finalScore: Prisma.Decimal
      classification: string
      totalIssues: number
      criticalIssues: number
      warnIssues: number
      passCount: number
      analysisSnapshot: Prisma.JsonValue
      cwvSnapshot: Prisma.JsonValue
      createdAt: Date
    }, ExtArgs["result"]["report"]>
    composites: {}
  }

  type ReportGetPayload<S extends boolean | null | undefined | ReportDefaultArgs> = $Result.GetResult<Prisma.$ReportPayload, S>

  type ReportCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ReportFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ReportCountAggregateInputType | true
    }

  export interface ReportDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Report'], meta: { name: 'Report' } }
    /**
     * Find zero or one Report that matches the filter.
     * @param {ReportFindUniqueArgs} args - Arguments to find a Report
     * @example
     * // Get one Report
     * const report = await prisma.report.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ReportFindUniqueArgs>(args: SelectSubset<T, ReportFindUniqueArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Report that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ReportFindUniqueOrThrowArgs} args - Arguments to find a Report
     * @example
     * // Get one Report
     * const report = await prisma.report.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ReportFindUniqueOrThrowArgs>(args: SelectSubset<T, ReportFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Report that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportFindFirstArgs} args - Arguments to find a Report
     * @example
     * // Get one Report
     * const report = await prisma.report.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ReportFindFirstArgs>(args?: SelectSubset<T, ReportFindFirstArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Report that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportFindFirstOrThrowArgs} args - Arguments to find a Report
     * @example
     * // Get one Report
     * const report = await prisma.report.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ReportFindFirstOrThrowArgs>(args?: SelectSubset<T, ReportFindFirstOrThrowArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Reports that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Reports
     * const reports = await prisma.report.findMany()
     * 
     * // Get first 10 Reports
     * const reports = await prisma.report.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const reportWithIdOnly = await prisma.report.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ReportFindManyArgs>(args?: SelectSubset<T, ReportFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Report.
     * @param {ReportCreateArgs} args - Arguments to create a Report.
     * @example
     * // Create one Report
     * const Report = await prisma.report.create({
     *   data: {
     *     // ... data to create a Report
     *   }
     * })
     * 
     */
    create<T extends ReportCreateArgs>(args: SelectSubset<T, ReportCreateArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Reports.
     * @param {ReportCreateManyArgs} args - Arguments to create many Reports.
     * @example
     * // Create many Reports
     * const report = await prisma.report.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ReportCreateManyArgs>(args?: SelectSubset<T, ReportCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Reports and returns the data saved in the database.
     * @param {ReportCreateManyAndReturnArgs} args - Arguments to create many Reports.
     * @example
     * // Create many Reports
     * const report = await prisma.report.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Reports and only return the `id`
     * const reportWithIdOnly = await prisma.report.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ReportCreateManyAndReturnArgs>(args?: SelectSubset<T, ReportCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Report.
     * @param {ReportDeleteArgs} args - Arguments to delete one Report.
     * @example
     * // Delete one Report
     * const Report = await prisma.report.delete({
     *   where: {
     *     // ... filter to delete one Report
     *   }
     * })
     * 
     */
    delete<T extends ReportDeleteArgs>(args: SelectSubset<T, ReportDeleteArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Report.
     * @param {ReportUpdateArgs} args - Arguments to update one Report.
     * @example
     * // Update one Report
     * const report = await prisma.report.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ReportUpdateArgs>(args: SelectSubset<T, ReportUpdateArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Reports.
     * @param {ReportDeleteManyArgs} args - Arguments to filter Reports to delete.
     * @example
     * // Delete a few Reports
     * const { count } = await prisma.report.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ReportDeleteManyArgs>(args?: SelectSubset<T, ReportDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Reports.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Reports
     * const report = await prisma.report.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ReportUpdateManyArgs>(args: SelectSubset<T, ReportUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Report.
     * @param {ReportUpsertArgs} args - Arguments to update or create a Report.
     * @example
     * // Update or create a Report
     * const report = await prisma.report.upsert({
     *   create: {
     *     // ... data to create a Report
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Report we want to update
     *   }
     * })
     */
    upsert<T extends ReportUpsertArgs>(args: SelectSubset<T, ReportUpsertArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Reports.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportCountArgs} args - Arguments to filter Reports to count.
     * @example
     * // Count the number of Reports
     * const count = await prisma.report.count({
     *   where: {
     *     // ... the filter for the Reports we want to count
     *   }
     * })
    **/
    count<T extends ReportCountArgs>(
      args?: Subset<T, ReportCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ReportCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Report.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ReportAggregateArgs>(args: Subset<T, ReportAggregateArgs>): Prisma.PrismaPromise<GetReportAggregateType<T>>

    /**
     * Group by Report.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ReportGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ReportGroupByArgs['orderBy'] }
        : { orderBy?: ReportGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ReportGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetReportGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Report model
   */
  readonly fields: ReportFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Report.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ReportClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    keywords<T extends Report$keywordsArgs<ExtArgs> = {}>(args?: Subset<T, Report$keywordsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportKeywordPayload<ExtArgs>, T, "findMany"> | Null>
    cwv<T extends Report$cwvArgs<ExtArgs> = {}>(args?: Subset<T, Report$cwvArgs<ExtArgs>>): Prisma__ReportCwvClient<$Result.GetResult<Prisma.$ReportCwvPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    shareLink<T extends Report$shareLinkArgs<ExtArgs> = {}>(args?: Subset<T, Report$shareLinkArgs<ExtArgs>>): Prisma__ShareLinkClient<$Result.GetResult<Prisma.$ShareLinkPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Report model
   */ 
  interface ReportFieldRefs {
    readonly id: FieldRef<"Report", 'String'>
    readonly auditId: FieldRef<"Report", 'String'>
    readonly url: FieldRef<"Report", 'String'>
    readonly domain: FieldRef<"Report", 'String'>
    readonly finalScore: FieldRef<"Report", 'Decimal'>
    readonly classification: FieldRef<"Report", 'String'>
    readonly totalIssues: FieldRef<"Report", 'Int'>
    readonly criticalIssues: FieldRef<"Report", 'Int'>
    readonly warnIssues: FieldRef<"Report", 'Int'>
    readonly passCount: FieldRef<"Report", 'Int'>
    readonly analysisSnapshot: FieldRef<"Report", 'Json'>
    readonly cwvSnapshot: FieldRef<"Report", 'Json'>
    readonly createdAt: FieldRef<"Report", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Report findUnique
   */
  export type ReportFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * Filter, which Report to fetch.
     */
    where: ReportWhereUniqueInput
  }

  /**
   * Report findUniqueOrThrow
   */
  export type ReportFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * Filter, which Report to fetch.
     */
    where: ReportWhereUniqueInput
  }

  /**
   * Report findFirst
   */
  export type ReportFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * Filter, which Report to fetch.
     */
    where?: ReportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Reports to fetch.
     */
    orderBy?: ReportOrderByWithRelationInput | ReportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Reports.
     */
    cursor?: ReportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Reports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Reports.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Reports.
     */
    distinct?: ReportScalarFieldEnum | ReportScalarFieldEnum[]
  }

  /**
   * Report findFirstOrThrow
   */
  export type ReportFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * Filter, which Report to fetch.
     */
    where?: ReportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Reports to fetch.
     */
    orderBy?: ReportOrderByWithRelationInput | ReportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Reports.
     */
    cursor?: ReportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Reports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Reports.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Reports.
     */
    distinct?: ReportScalarFieldEnum | ReportScalarFieldEnum[]
  }

  /**
   * Report findMany
   */
  export type ReportFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * Filter, which Reports to fetch.
     */
    where?: ReportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Reports to fetch.
     */
    orderBy?: ReportOrderByWithRelationInput | ReportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Reports.
     */
    cursor?: ReportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Reports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Reports.
     */
    skip?: number
    distinct?: ReportScalarFieldEnum | ReportScalarFieldEnum[]
  }

  /**
   * Report create
   */
  export type ReportCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * The data needed to create a Report.
     */
    data: XOR<ReportCreateInput, ReportUncheckedCreateInput>
  }

  /**
   * Report createMany
   */
  export type ReportCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Reports.
     */
    data: ReportCreateManyInput | ReportCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Report createManyAndReturn
   */
  export type ReportCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Reports.
     */
    data: ReportCreateManyInput | ReportCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Report update
   */
  export type ReportUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * The data needed to update a Report.
     */
    data: XOR<ReportUpdateInput, ReportUncheckedUpdateInput>
    /**
     * Choose, which Report to update.
     */
    where: ReportWhereUniqueInput
  }

  /**
   * Report updateMany
   */
  export type ReportUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Reports.
     */
    data: XOR<ReportUpdateManyMutationInput, ReportUncheckedUpdateManyInput>
    /**
     * Filter which Reports to update
     */
    where?: ReportWhereInput
  }

  /**
   * Report upsert
   */
  export type ReportUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * The filter to search for the Report to update in case it exists.
     */
    where: ReportWhereUniqueInput
    /**
     * In case the Report found by the `where` argument doesn't exist, create a new Report with this data.
     */
    create: XOR<ReportCreateInput, ReportUncheckedCreateInput>
    /**
     * In case the Report was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ReportUpdateInput, ReportUncheckedUpdateInput>
  }

  /**
   * Report delete
   */
  export type ReportDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * Filter which Report to delete.
     */
    where: ReportWhereUniqueInput
  }

  /**
   * Report deleteMany
   */
  export type ReportDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Reports to delete
     */
    where?: ReportWhereInput
  }

  /**
   * Report.keywords
   */
  export type Report$keywordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportKeyword
     */
    select?: ReportKeywordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportKeywordInclude<ExtArgs> | null
    where?: ReportKeywordWhereInput
    orderBy?: ReportKeywordOrderByWithRelationInput | ReportKeywordOrderByWithRelationInput[]
    cursor?: ReportKeywordWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ReportKeywordScalarFieldEnum | ReportKeywordScalarFieldEnum[]
  }

  /**
   * Report.cwv
   */
  export type Report$cwvArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportCwv
     */
    select?: ReportCwvSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportCwvInclude<ExtArgs> | null
    where?: ReportCwvWhereInput
  }

  /**
   * Report.shareLink
   */
  export type Report$shareLinkArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShareLink
     */
    select?: ShareLinkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShareLinkInclude<ExtArgs> | null
    where?: ShareLinkWhereInput
  }

  /**
   * Report without action
   */
  export type ReportDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
  }


  /**
   * Model ReportKeyword
   */

  export type AggregateReportKeyword = {
    _count: ReportKeywordCountAggregateOutputType | null
    _avg: ReportKeywordAvgAggregateOutputType | null
    _sum: ReportKeywordSumAggregateOutputType | null
    _min: ReportKeywordMinAggregateOutputType | null
    _max: ReportKeywordMaxAggregateOutputType | null
  }

  export type ReportKeywordAvgAggregateOutputType = {
    frequency: number | null
    densityPercent: Decimal | null
    rank: number | null
  }

  export type ReportKeywordSumAggregateOutputType = {
    frequency: number | null
    densityPercent: Decimal | null
    rank: number | null
  }

  export type ReportKeywordMinAggregateOutputType = {
    id: string | null
    reportId: string | null
    keyword: string | null
    frequency: number | null
    densityPercent: Decimal | null
    inTitle: boolean | null
    inH1: boolean | null
    inFirstParagraph: boolean | null
    inMetaDescription: boolean | null
    rank: number | null
    isTarget: boolean | null
  }

  export type ReportKeywordMaxAggregateOutputType = {
    id: string | null
    reportId: string | null
    keyword: string | null
    frequency: number | null
    densityPercent: Decimal | null
    inTitle: boolean | null
    inH1: boolean | null
    inFirstParagraph: boolean | null
    inMetaDescription: boolean | null
    rank: number | null
    isTarget: boolean | null
  }

  export type ReportKeywordCountAggregateOutputType = {
    id: number
    reportId: number
    keyword: number
    frequency: number
    densityPercent: number
    inTitle: number
    inH1: number
    inFirstParagraph: number
    inMetaDescription: number
    rank: number
    isTarget: number
    _all: number
  }


  export type ReportKeywordAvgAggregateInputType = {
    frequency?: true
    densityPercent?: true
    rank?: true
  }

  export type ReportKeywordSumAggregateInputType = {
    frequency?: true
    densityPercent?: true
    rank?: true
  }

  export type ReportKeywordMinAggregateInputType = {
    id?: true
    reportId?: true
    keyword?: true
    frequency?: true
    densityPercent?: true
    inTitle?: true
    inH1?: true
    inFirstParagraph?: true
    inMetaDescription?: true
    rank?: true
    isTarget?: true
  }

  export type ReportKeywordMaxAggregateInputType = {
    id?: true
    reportId?: true
    keyword?: true
    frequency?: true
    densityPercent?: true
    inTitle?: true
    inH1?: true
    inFirstParagraph?: true
    inMetaDescription?: true
    rank?: true
    isTarget?: true
  }

  export type ReportKeywordCountAggregateInputType = {
    id?: true
    reportId?: true
    keyword?: true
    frequency?: true
    densityPercent?: true
    inTitle?: true
    inH1?: true
    inFirstParagraph?: true
    inMetaDescription?: true
    rank?: true
    isTarget?: true
    _all?: true
  }

  export type ReportKeywordAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ReportKeyword to aggregate.
     */
    where?: ReportKeywordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportKeywords to fetch.
     */
    orderBy?: ReportKeywordOrderByWithRelationInput | ReportKeywordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ReportKeywordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportKeywords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportKeywords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ReportKeywords
    **/
    _count?: true | ReportKeywordCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ReportKeywordAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ReportKeywordSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ReportKeywordMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ReportKeywordMaxAggregateInputType
  }

  export type GetReportKeywordAggregateType<T extends ReportKeywordAggregateArgs> = {
        [P in keyof T & keyof AggregateReportKeyword]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateReportKeyword[P]>
      : GetScalarType<T[P], AggregateReportKeyword[P]>
  }




  export type ReportKeywordGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ReportKeywordWhereInput
    orderBy?: ReportKeywordOrderByWithAggregationInput | ReportKeywordOrderByWithAggregationInput[]
    by: ReportKeywordScalarFieldEnum[] | ReportKeywordScalarFieldEnum
    having?: ReportKeywordScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ReportKeywordCountAggregateInputType | true
    _avg?: ReportKeywordAvgAggregateInputType
    _sum?: ReportKeywordSumAggregateInputType
    _min?: ReportKeywordMinAggregateInputType
    _max?: ReportKeywordMaxAggregateInputType
  }

  export type ReportKeywordGroupByOutputType = {
    id: string
    reportId: string
    keyword: string
    frequency: number
    densityPercent: Decimal
    inTitle: boolean
    inH1: boolean
    inFirstParagraph: boolean
    inMetaDescription: boolean
    rank: number
    isTarget: boolean
    _count: ReportKeywordCountAggregateOutputType | null
    _avg: ReportKeywordAvgAggregateOutputType | null
    _sum: ReportKeywordSumAggregateOutputType | null
    _min: ReportKeywordMinAggregateOutputType | null
    _max: ReportKeywordMaxAggregateOutputType | null
  }

  type GetReportKeywordGroupByPayload<T extends ReportKeywordGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ReportKeywordGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ReportKeywordGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ReportKeywordGroupByOutputType[P]>
            : GetScalarType<T[P], ReportKeywordGroupByOutputType[P]>
        }
      >
    >


  export type ReportKeywordSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    reportId?: boolean
    keyword?: boolean
    frequency?: boolean
    densityPercent?: boolean
    inTitle?: boolean
    inH1?: boolean
    inFirstParagraph?: boolean
    inMetaDescription?: boolean
    rank?: boolean
    isTarget?: boolean
    report?: boolean | ReportDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["reportKeyword"]>

  export type ReportKeywordSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    reportId?: boolean
    keyword?: boolean
    frequency?: boolean
    densityPercent?: boolean
    inTitle?: boolean
    inH1?: boolean
    inFirstParagraph?: boolean
    inMetaDescription?: boolean
    rank?: boolean
    isTarget?: boolean
    report?: boolean | ReportDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["reportKeyword"]>

  export type ReportKeywordSelectScalar = {
    id?: boolean
    reportId?: boolean
    keyword?: boolean
    frequency?: boolean
    densityPercent?: boolean
    inTitle?: boolean
    inH1?: boolean
    inFirstParagraph?: boolean
    inMetaDescription?: boolean
    rank?: boolean
    isTarget?: boolean
  }

  export type ReportKeywordInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    report?: boolean | ReportDefaultArgs<ExtArgs>
  }
  export type ReportKeywordIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    report?: boolean | ReportDefaultArgs<ExtArgs>
  }

  export type $ReportKeywordPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ReportKeyword"
    objects: {
      report: Prisma.$ReportPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      reportId: string
      keyword: string
      frequency: number
      densityPercent: Prisma.Decimal
      inTitle: boolean
      inH1: boolean
      inFirstParagraph: boolean
      inMetaDescription: boolean
      rank: number
      isTarget: boolean
    }, ExtArgs["result"]["reportKeyword"]>
    composites: {}
  }

  type ReportKeywordGetPayload<S extends boolean | null | undefined | ReportKeywordDefaultArgs> = $Result.GetResult<Prisma.$ReportKeywordPayload, S>

  type ReportKeywordCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ReportKeywordFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ReportKeywordCountAggregateInputType | true
    }

  export interface ReportKeywordDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ReportKeyword'], meta: { name: 'ReportKeyword' } }
    /**
     * Find zero or one ReportKeyword that matches the filter.
     * @param {ReportKeywordFindUniqueArgs} args - Arguments to find a ReportKeyword
     * @example
     * // Get one ReportKeyword
     * const reportKeyword = await prisma.reportKeyword.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ReportKeywordFindUniqueArgs>(args: SelectSubset<T, ReportKeywordFindUniqueArgs<ExtArgs>>): Prisma__ReportKeywordClient<$Result.GetResult<Prisma.$ReportKeywordPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ReportKeyword that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ReportKeywordFindUniqueOrThrowArgs} args - Arguments to find a ReportKeyword
     * @example
     * // Get one ReportKeyword
     * const reportKeyword = await prisma.reportKeyword.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ReportKeywordFindUniqueOrThrowArgs>(args: SelectSubset<T, ReportKeywordFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ReportKeywordClient<$Result.GetResult<Prisma.$ReportKeywordPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ReportKeyword that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportKeywordFindFirstArgs} args - Arguments to find a ReportKeyword
     * @example
     * // Get one ReportKeyword
     * const reportKeyword = await prisma.reportKeyword.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ReportKeywordFindFirstArgs>(args?: SelectSubset<T, ReportKeywordFindFirstArgs<ExtArgs>>): Prisma__ReportKeywordClient<$Result.GetResult<Prisma.$ReportKeywordPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ReportKeyword that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportKeywordFindFirstOrThrowArgs} args - Arguments to find a ReportKeyword
     * @example
     * // Get one ReportKeyword
     * const reportKeyword = await prisma.reportKeyword.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ReportKeywordFindFirstOrThrowArgs>(args?: SelectSubset<T, ReportKeywordFindFirstOrThrowArgs<ExtArgs>>): Prisma__ReportKeywordClient<$Result.GetResult<Prisma.$ReportKeywordPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ReportKeywords that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportKeywordFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ReportKeywords
     * const reportKeywords = await prisma.reportKeyword.findMany()
     * 
     * // Get first 10 ReportKeywords
     * const reportKeywords = await prisma.reportKeyword.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const reportKeywordWithIdOnly = await prisma.reportKeyword.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ReportKeywordFindManyArgs>(args?: SelectSubset<T, ReportKeywordFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportKeywordPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ReportKeyword.
     * @param {ReportKeywordCreateArgs} args - Arguments to create a ReportKeyword.
     * @example
     * // Create one ReportKeyword
     * const ReportKeyword = await prisma.reportKeyword.create({
     *   data: {
     *     // ... data to create a ReportKeyword
     *   }
     * })
     * 
     */
    create<T extends ReportKeywordCreateArgs>(args: SelectSubset<T, ReportKeywordCreateArgs<ExtArgs>>): Prisma__ReportKeywordClient<$Result.GetResult<Prisma.$ReportKeywordPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ReportKeywords.
     * @param {ReportKeywordCreateManyArgs} args - Arguments to create many ReportKeywords.
     * @example
     * // Create many ReportKeywords
     * const reportKeyword = await prisma.reportKeyword.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ReportKeywordCreateManyArgs>(args?: SelectSubset<T, ReportKeywordCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ReportKeywords and returns the data saved in the database.
     * @param {ReportKeywordCreateManyAndReturnArgs} args - Arguments to create many ReportKeywords.
     * @example
     * // Create many ReportKeywords
     * const reportKeyword = await prisma.reportKeyword.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ReportKeywords and only return the `id`
     * const reportKeywordWithIdOnly = await prisma.reportKeyword.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ReportKeywordCreateManyAndReturnArgs>(args?: SelectSubset<T, ReportKeywordCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportKeywordPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ReportKeyword.
     * @param {ReportKeywordDeleteArgs} args - Arguments to delete one ReportKeyword.
     * @example
     * // Delete one ReportKeyword
     * const ReportKeyword = await prisma.reportKeyword.delete({
     *   where: {
     *     // ... filter to delete one ReportKeyword
     *   }
     * })
     * 
     */
    delete<T extends ReportKeywordDeleteArgs>(args: SelectSubset<T, ReportKeywordDeleteArgs<ExtArgs>>): Prisma__ReportKeywordClient<$Result.GetResult<Prisma.$ReportKeywordPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ReportKeyword.
     * @param {ReportKeywordUpdateArgs} args - Arguments to update one ReportKeyword.
     * @example
     * // Update one ReportKeyword
     * const reportKeyword = await prisma.reportKeyword.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ReportKeywordUpdateArgs>(args: SelectSubset<T, ReportKeywordUpdateArgs<ExtArgs>>): Prisma__ReportKeywordClient<$Result.GetResult<Prisma.$ReportKeywordPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ReportKeywords.
     * @param {ReportKeywordDeleteManyArgs} args - Arguments to filter ReportKeywords to delete.
     * @example
     * // Delete a few ReportKeywords
     * const { count } = await prisma.reportKeyword.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ReportKeywordDeleteManyArgs>(args?: SelectSubset<T, ReportKeywordDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ReportKeywords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportKeywordUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ReportKeywords
     * const reportKeyword = await prisma.reportKeyword.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ReportKeywordUpdateManyArgs>(args: SelectSubset<T, ReportKeywordUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ReportKeyword.
     * @param {ReportKeywordUpsertArgs} args - Arguments to update or create a ReportKeyword.
     * @example
     * // Update or create a ReportKeyword
     * const reportKeyword = await prisma.reportKeyword.upsert({
     *   create: {
     *     // ... data to create a ReportKeyword
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ReportKeyword we want to update
     *   }
     * })
     */
    upsert<T extends ReportKeywordUpsertArgs>(args: SelectSubset<T, ReportKeywordUpsertArgs<ExtArgs>>): Prisma__ReportKeywordClient<$Result.GetResult<Prisma.$ReportKeywordPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ReportKeywords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportKeywordCountArgs} args - Arguments to filter ReportKeywords to count.
     * @example
     * // Count the number of ReportKeywords
     * const count = await prisma.reportKeyword.count({
     *   where: {
     *     // ... the filter for the ReportKeywords we want to count
     *   }
     * })
    **/
    count<T extends ReportKeywordCountArgs>(
      args?: Subset<T, ReportKeywordCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ReportKeywordCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ReportKeyword.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportKeywordAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ReportKeywordAggregateArgs>(args: Subset<T, ReportKeywordAggregateArgs>): Prisma.PrismaPromise<GetReportKeywordAggregateType<T>>

    /**
     * Group by ReportKeyword.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportKeywordGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ReportKeywordGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ReportKeywordGroupByArgs['orderBy'] }
        : { orderBy?: ReportKeywordGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ReportKeywordGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetReportKeywordGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ReportKeyword model
   */
  readonly fields: ReportKeywordFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ReportKeyword.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ReportKeywordClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    report<T extends ReportDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ReportDefaultArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ReportKeyword model
   */ 
  interface ReportKeywordFieldRefs {
    readonly id: FieldRef<"ReportKeyword", 'String'>
    readonly reportId: FieldRef<"ReportKeyword", 'String'>
    readonly keyword: FieldRef<"ReportKeyword", 'String'>
    readonly frequency: FieldRef<"ReportKeyword", 'Int'>
    readonly densityPercent: FieldRef<"ReportKeyword", 'Decimal'>
    readonly inTitle: FieldRef<"ReportKeyword", 'Boolean'>
    readonly inH1: FieldRef<"ReportKeyword", 'Boolean'>
    readonly inFirstParagraph: FieldRef<"ReportKeyword", 'Boolean'>
    readonly inMetaDescription: FieldRef<"ReportKeyword", 'Boolean'>
    readonly rank: FieldRef<"ReportKeyword", 'Int'>
    readonly isTarget: FieldRef<"ReportKeyword", 'Boolean'>
  }
    

  // Custom InputTypes
  /**
   * ReportKeyword findUnique
   */
  export type ReportKeywordFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportKeyword
     */
    select?: ReportKeywordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportKeywordInclude<ExtArgs> | null
    /**
     * Filter, which ReportKeyword to fetch.
     */
    where: ReportKeywordWhereUniqueInput
  }

  /**
   * ReportKeyword findUniqueOrThrow
   */
  export type ReportKeywordFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportKeyword
     */
    select?: ReportKeywordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportKeywordInclude<ExtArgs> | null
    /**
     * Filter, which ReportKeyword to fetch.
     */
    where: ReportKeywordWhereUniqueInput
  }

  /**
   * ReportKeyword findFirst
   */
  export type ReportKeywordFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportKeyword
     */
    select?: ReportKeywordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportKeywordInclude<ExtArgs> | null
    /**
     * Filter, which ReportKeyword to fetch.
     */
    where?: ReportKeywordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportKeywords to fetch.
     */
    orderBy?: ReportKeywordOrderByWithRelationInput | ReportKeywordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ReportKeywords.
     */
    cursor?: ReportKeywordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportKeywords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportKeywords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ReportKeywords.
     */
    distinct?: ReportKeywordScalarFieldEnum | ReportKeywordScalarFieldEnum[]
  }

  /**
   * ReportKeyword findFirstOrThrow
   */
  export type ReportKeywordFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportKeyword
     */
    select?: ReportKeywordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportKeywordInclude<ExtArgs> | null
    /**
     * Filter, which ReportKeyword to fetch.
     */
    where?: ReportKeywordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportKeywords to fetch.
     */
    orderBy?: ReportKeywordOrderByWithRelationInput | ReportKeywordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ReportKeywords.
     */
    cursor?: ReportKeywordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportKeywords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportKeywords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ReportKeywords.
     */
    distinct?: ReportKeywordScalarFieldEnum | ReportKeywordScalarFieldEnum[]
  }

  /**
   * ReportKeyword findMany
   */
  export type ReportKeywordFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportKeyword
     */
    select?: ReportKeywordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportKeywordInclude<ExtArgs> | null
    /**
     * Filter, which ReportKeywords to fetch.
     */
    where?: ReportKeywordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportKeywords to fetch.
     */
    orderBy?: ReportKeywordOrderByWithRelationInput | ReportKeywordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ReportKeywords.
     */
    cursor?: ReportKeywordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportKeywords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportKeywords.
     */
    skip?: number
    distinct?: ReportKeywordScalarFieldEnum | ReportKeywordScalarFieldEnum[]
  }

  /**
   * ReportKeyword create
   */
  export type ReportKeywordCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportKeyword
     */
    select?: ReportKeywordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportKeywordInclude<ExtArgs> | null
    /**
     * The data needed to create a ReportKeyword.
     */
    data: XOR<ReportKeywordCreateInput, ReportKeywordUncheckedCreateInput>
  }

  /**
   * ReportKeyword createMany
   */
  export type ReportKeywordCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ReportKeywords.
     */
    data: ReportKeywordCreateManyInput | ReportKeywordCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ReportKeyword createManyAndReturn
   */
  export type ReportKeywordCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportKeyword
     */
    select?: ReportKeywordSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ReportKeywords.
     */
    data: ReportKeywordCreateManyInput | ReportKeywordCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportKeywordIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ReportKeyword update
   */
  export type ReportKeywordUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportKeyword
     */
    select?: ReportKeywordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportKeywordInclude<ExtArgs> | null
    /**
     * The data needed to update a ReportKeyword.
     */
    data: XOR<ReportKeywordUpdateInput, ReportKeywordUncheckedUpdateInput>
    /**
     * Choose, which ReportKeyword to update.
     */
    where: ReportKeywordWhereUniqueInput
  }

  /**
   * ReportKeyword updateMany
   */
  export type ReportKeywordUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ReportKeywords.
     */
    data: XOR<ReportKeywordUpdateManyMutationInput, ReportKeywordUncheckedUpdateManyInput>
    /**
     * Filter which ReportKeywords to update
     */
    where?: ReportKeywordWhereInput
  }

  /**
   * ReportKeyword upsert
   */
  export type ReportKeywordUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportKeyword
     */
    select?: ReportKeywordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportKeywordInclude<ExtArgs> | null
    /**
     * The filter to search for the ReportKeyword to update in case it exists.
     */
    where: ReportKeywordWhereUniqueInput
    /**
     * In case the ReportKeyword found by the `where` argument doesn't exist, create a new ReportKeyword with this data.
     */
    create: XOR<ReportKeywordCreateInput, ReportKeywordUncheckedCreateInput>
    /**
     * In case the ReportKeyword was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ReportKeywordUpdateInput, ReportKeywordUncheckedUpdateInput>
  }

  /**
   * ReportKeyword delete
   */
  export type ReportKeywordDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportKeyword
     */
    select?: ReportKeywordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportKeywordInclude<ExtArgs> | null
    /**
     * Filter which ReportKeyword to delete.
     */
    where: ReportKeywordWhereUniqueInput
  }

  /**
   * ReportKeyword deleteMany
   */
  export type ReportKeywordDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ReportKeywords to delete
     */
    where?: ReportKeywordWhereInput
  }

  /**
   * ReportKeyword without action
   */
  export type ReportKeywordDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportKeyword
     */
    select?: ReportKeywordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportKeywordInclude<ExtArgs> | null
  }


  /**
   * Model ReportCwv
   */

  export type AggregateReportCwv = {
    _count: ReportCwvCountAggregateOutputType | null
    _avg: ReportCwvAvgAggregateOutputType | null
    _sum: ReportCwvSumAggregateOutputType | null
    _min: ReportCwvMinAggregateOutputType | null
    _max: ReportCwvMaxAggregateOutputType | null
  }

  export type ReportCwvAvgAggregateOutputType = {
    lcpMs: Decimal | null
    inpMs: Decimal | null
    cls: Decimal | null
    performanceScore: number | null
    accessibilityScore: number | null
    bestPracticesScore: number | null
    lighthouseSeoScore: number | null
    desktopLcpMs: Decimal | null
    desktopInpMs: Decimal | null
    desktopCls: Decimal | null
    desktopPerformanceScore: number | null
    desktopAccessibilityScore: number | null
    desktopBestPracticesScore: number | null
    desktopLighthouseSeoScore: number | null
  }

  export type ReportCwvSumAggregateOutputType = {
    lcpMs: Decimal | null
    inpMs: Decimal | null
    cls: Decimal | null
    performanceScore: number | null
    accessibilityScore: number | null
    bestPracticesScore: number | null
    lighthouseSeoScore: number | null
    desktopLcpMs: Decimal | null
    desktopInpMs: Decimal | null
    desktopCls: Decimal | null
    desktopPerformanceScore: number | null
    desktopAccessibilityScore: number | null
    desktopBestPracticesScore: number | null
    desktopLighthouseSeoScore: number | null
  }

  export type ReportCwvMinAggregateOutputType = {
    id: string | null
    reportId: string | null
    lcpMs: Decimal | null
    inpMs: Decimal | null
    cls: Decimal | null
    performanceScore: number | null
    accessibilityScore: number | null
    bestPracticesScore: number | null
    lighthouseSeoScore: number | null
    desktopLcpMs: Decimal | null
    desktopInpMs: Decimal | null
    desktopCls: Decimal | null
    desktopPerformanceScore: number | null
    desktopAccessibilityScore: number | null
    desktopBestPracticesScore: number | null
    desktopLighthouseSeoScore: number | null
  }

  export type ReportCwvMaxAggregateOutputType = {
    id: string | null
    reportId: string | null
    lcpMs: Decimal | null
    inpMs: Decimal | null
    cls: Decimal | null
    performanceScore: number | null
    accessibilityScore: number | null
    bestPracticesScore: number | null
    lighthouseSeoScore: number | null
    desktopLcpMs: Decimal | null
    desktopInpMs: Decimal | null
    desktopCls: Decimal | null
    desktopPerformanceScore: number | null
    desktopAccessibilityScore: number | null
    desktopBestPracticesScore: number | null
    desktopLighthouseSeoScore: number | null
  }

  export type ReportCwvCountAggregateOutputType = {
    id: number
    reportId: number
    lcpMs: number
    inpMs: number
    cls: number
    performanceScore: number
    accessibilityScore: number
    bestPracticesScore: number
    lighthouseSeoScore: number
    desktopLcpMs: number
    desktopInpMs: number
    desktopCls: number
    desktopPerformanceScore: number
    desktopAccessibilityScore: number
    desktopBestPracticesScore: number
    desktopLighthouseSeoScore: number
    _all: number
  }


  export type ReportCwvAvgAggregateInputType = {
    lcpMs?: true
    inpMs?: true
    cls?: true
    performanceScore?: true
    accessibilityScore?: true
    bestPracticesScore?: true
    lighthouseSeoScore?: true
    desktopLcpMs?: true
    desktopInpMs?: true
    desktopCls?: true
    desktopPerformanceScore?: true
    desktopAccessibilityScore?: true
    desktopBestPracticesScore?: true
    desktopLighthouseSeoScore?: true
  }

  export type ReportCwvSumAggregateInputType = {
    lcpMs?: true
    inpMs?: true
    cls?: true
    performanceScore?: true
    accessibilityScore?: true
    bestPracticesScore?: true
    lighthouseSeoScore?: true
    desktopLcpMs?: true
    desktopInpMs?: true
    desktopCls?: true
    desktopPerformanceScore?: true
    desktopAccessibilityScore?: true
    desktopBestPracticesScore?: true
    desktopLighthouseSeoScore?: true
  }

  export type ReportCwvMinAggregateInputType = {
    id?: true
    reportId?: true
    lcpMs?: true
    inpMs?: true
    cls?: true
    performanceScore?: true
    accessibilityScore?: true
    bestPracticesScore?: true
    lighthouseSeoScore?: true
    desktopLcpMs?: true
    desktopInpMs?: true
    desktopCls?: true
    desktopPerformanceScore?: true
    desktopAccessibilityScore?: true
    desktopBestPracticesScore?: true
    desktopLighthouseSeoScore?: true
  }

  export type ReportCwvMaxAggregateInputType = {
    id?: true
    reportId?: true
    lcpMs?: true
    inpMs?: true
    cls?: true
    performanceScore?: true
    accessibilityScore?: true
    bestPracticesScore?: true
    lighthouseSeoScore?: true
    desktopLcpMs?: true
    desktopInpMs?: true
    desktopCls?: true
    desktopPerformanceScore?: true
    desktopAccessibilityScore?: true
    desktopBestPracticesScore?: true
    desktopLighthouseSeoScore?: true
  }

  export type ReportCwvCountAggregateInputType = {
    id?: true
    reportId?: true
    lcpMs?: true
    inpMs?: true
    cls?: true
    performanceScore?: true
    accessibilityScore?: true
    bestPracticesScore?: true
    lighthouseSeoScore?: true
    desktopLcpMs?: true
    desktopInpMs?: true
    desktopCls?: true
    desktopPerformanceScore?: true
    desktopAccessibilityScore?: true
    desktopBestPracticesScore?: true
    desktopLighthouseSeoScore?: true
    _all?: true
  }

  export type ReportCwvAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ReportCwv to aggregate.
     */
    where?: ReportCwvWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportCwvs to fetch.
     */
    orderBy?: ReportCwvOrderByWithRelationInput | ReportCwvOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ReportCwvWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportCwvs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportCwvs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ReportCwvs
    **/
    _count?: true | ReportCwvCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ReportCwvAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ReportCwvSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ReportCwvMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ReportCwvMaxAggregateInputType
  }

  export type GetReportCwvAggregateType<T extends ReportCwvAggregateArgs> = {
        [P in keyof T & keyof AggregateReportCwv]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateReportCwv[P]>
      : GetScalarType<T[P], AggregateReportCwv[P]>
  }




  export type ReportCwvGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ReportCwvWhereInput
    orderBy?: ReportCwvOrderByWithAggregationInput | ReportCwvOrderByWithAggregationInput[]
    by: ReportCwvScalarFieldEnum[] | ReportCwvScalarFieldEnum
    having?: ReportCwvScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ReportCwvCountAggregateInputType | true
    _avg?: ReportCwvAvgAggregateInputType
    _sum?: ReportCwvSumAggregateInputType
    _min?: ReportCwvMinAggregateInputType
    _max?: ReportCwvMaxAggregateInputType
  }

  export type ReportCwvGroupByOutputType = {
    id: string
    reportId: string
    lcpMs: Decimal
    inpMs: Decimal
    cls: Decimal
    performanceScore: number
    accessibilityScore: number
    bestPracticesScore: number
    lighthouseSeoScore: number
    desktopLcpMs: Decimal | null
    desktopInpMs: Decimal | null
    desktopCls: Decimal | null
    desktopPerformanceScore: number | null
    desktopAccessibilityScore: number | null
    desktopBestPracticesScore: number | null
    desktopLighthouseSeoScore: number | null
    _count: ReportCwvCountAggregateOutputType | null
    _avg: ReportCwvAvgAggregateOutputType | null
    _sum: ReportCwvSumAggregateOutputType | null
    _min: ReportCwvMinAggregateOutputType | null
    _max: ReportCwvMaxAggregateOutputType | null
  }

  type GetReportCwvGroupByPayload<T extends ReportCwvGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ReportCwvGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ReportCwvGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ReportCwvGroupByOutputType[P]>
            : GetScalarType<T[P], ReportCwvGroupByOutputType[P]>
        }
      >
    >


  export type ReportCwvSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    reportId?: boolean
    lcpMs?: boolean
    inpMs?: boolean
    cls?: boolean
    performanceScore?: boolean
    accessibilityScore?: boolean
    bestPracticesScore?: boolean
    lighthouseSeoScore?: boolean
    desktopLcpMs?: boolean
    desktopInpMs?: boolean
    desktopCls?: boolean
    desktopPerformanceScore?: boolean
    desktopAccessibilityScore?: boolean
    desktopBestPracticesScore?: boolean
    desktopLighthouseSeoScore?: boolean
    report?: boolean | ReportDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["reportCwv"]>

  export type ReportCwvSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    reportId?: boolean
    lcpMs?: boolean
    inpMs?: boolean
    cls?: boolean
    performanceScore?: boolean
    accessibilityScore?: boolean
    bestPracticesScore?: boolean
    lighthouseSeoScore?: boolean
    desktopLcpMs?: boolean
    desktopInpMs?: boolean
    desktopCls?: boolean
    desktopPerformanceScore?: boolean
    desktopAccessibilityScore?: boolean
    desktopBestPracticesScore?: boolean
    desktopLighthouseSeoScore?: boolean
    report?: boolean | ReportDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["reportCwv"]>

  export type ReportCwvSelectScalar = {
    id?: boolean
    reportId?: boolean
    lcpMs?: boolean
    inpMs?: boolean
    cls?: boolean
    performanceScore?: boolean
    accessibilityScore?: boolean
    bestPracticesScore?: boolean
    lighthouseSeoScore?: boolean
    desktopLcpMs?: boolean
    desktopInpMs?: boolean
    desktopCls?: boolean
    desktopPerformanceScore?: boolean
    desktopAccessibilityScore?: boolean
    desktopBestPracticesScore?: boolean
    desktopLighthouseSeoScore?: boolean
  }

  export type ReportCwvInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    report?: boolean | ReportDefaultArgs<ExtArgs>
  }
  export type ReportCwvIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    report?: boolean | ReportDefaultArgs<ExtArgs>
  }

  export type $ReportCwvPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ReportCwv"
    objects: {
      report: Prisma.$ReportPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      reportId: string
      lcpMs: Prisma.Decimal
      inpMs: Prisma.Decimal
      cls: Prisma.Decimal
      performanceScore: number
      accessibilityScore: number
      bestPracticesScore: number
      lighthouseSeoScore: number
      desktopLcpMs: Prisma.Decimal | null
      desktopInpMs: Prisma.Decimal | null
      desktopCls: Prisma.Decimal | null
      desktopPerformanceScore: number | null
      desktopAccessibilityScore: number | null
      desktopBestPracticesScore: number | null
      desktopLighthouseSeoScore: number | null
    }, ExtArgs["result"]["reportCwv"]>
    composites: {}
  }

  type ReportCwvGetPayload<S extends boolean | null | undefined | ReportCwvDefaultArgs> = $Result.GetResult<Prisma.$ReportCwvPayload, S>

  type ReportCwvCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ReportCwvFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ReportCwvCountAggregateInputType | true
    }

  export interface ReportCwvDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ReportCwv'], meta: { name: 'ReportCwv' } }
    /**
     * Find zero or one ReportCwv that matches the filter.
     * @param {ReportCwvFindUniqueArgs} args - Arguments to find a ReportCwv
     * @example
     * // Get one ReportCwv
     * const reportCwv = await prisma.reportCwv.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ReportCwvFindUniqueArgs>(args: SelectSubset<T, ReportCwvFindUniqueArgs<ExtArgs>>): Prisma__ReportCwvClient<$Result.GetResult<Prisma.$ReportCwvPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ReportCwv that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ReportCwvFindUniqueOrThrowArgs} args - Arguments to find a ReportCwv
     * @example
     * // Get one ReportCwv
     * const reportCwv = await prisma.reportCwv.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ReportCwvFindUniqueOrThrowArgs>(args: SelectSubset<T, ReportCwvFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ReportCwvClient<$Result.GetResult<Prisma.$ReportCwvPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ReportCwv that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportCwvFindFirstArgs} args - Arguments to find a ReportCwv
     * @example
     * // Get one ReportCwv
     * const reportCwv = await prisma.reportCwv.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ReportCwvFindFirstArgs>(args?: SelectSubset<T, ReportCwvFindFirstArgs<ExtArgs>>): Prisma__ReportCwvClient<$Result.GetResult<Prisma.$ReportCwvPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ReportCwv that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportCwvFindFirstOrThrowArgs} args - Arguments to find a ReportCwv
     * @example
     * // Get one ReportCwv
     * const reportCwv = await prisma.reportCwv.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ReportCwvFindFirstOrThrowArgs>(args?: SelectSubset<T, ReportCwvFindFirstOrThrowArgs<ExtArgs>>): Prisma__ReportCwvClient<$Result.GetResult<Prisma.$ReportCwvPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ReportCwvs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportCwvFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ReportCwvs
     * const reportCwvs = await prisma.reportCwv.findMany()
     * 
     * // Get first 10 ReportCwvs
     * const reportCwvs = await prisma.reportCwv.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const reportCwvWithIdOnly = await prisma.reportCwv.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ReportCwvFindManyArgs>(args?: SelectSubset<T, ReportCwvFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportCwvPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ReportCwv.
     * @param {ReportCwvCreateArgs} args - Arguments to create a ReportCwv.
     * @example
     * // Create one ReportCwv
     * const ReportCwv = await prisma.reportCwv.create({
     *   data: {
     *     // ... data to create a ReportCwv
     *   }
     * })
     * 
     */
    create<T extends ReportCwvCreateArgs>(args: SelectSubset<T, ReportCwvCreateArgs<ExtArgs>>): Prisma__ReportCwvClient<$Result.GetResult<Prisma.$ReportCwvPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ReportCwvs.
     * @param {ReportCwvCreateManyArgs} args - Arguments to create many ReportCwvs.
     * @example
     * // Create many ReportCwvs
     * const reportCwv = await prisma.reportCwv.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ReportCwvCreateManyArgs>(args?: SelectSubset<T, ReportCwvCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ReportCwvs and returns the data saved in the database.
     * @param {ReportCwvCreateManyAndReturnArgs} args - Arguments to create many ReportCwvs.
     * @example
     * // Create many ReportCwvs
     * const reportCwv = await prisma.reportCwv.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ReportCwvs and only return the `id`
     * const reportCwvWithIdOnly = await prisma.reportCwv.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ReportCwvCreateManyAndReturnArgs>(args?: SelectSubset<T, ReportCwvCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportCwvPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ReportCwv.
     * @param {ReportCwvDeleteArgs} args - Arguments to delete one ReportCwv.
     * @example
     * // Delete one ReportCwv
     * const ReportCwv = await prisma.reportCwv.delete({
     *   where: {
     *     // ... filter to delete one ReportCwv
     *   }
     * })
     * 
     */
    delete<T extends ReportCwvDeleteArgs>(args: SelectSubset<T, ReportCwvDeleteArgs<ExtArgs>>): Prisma__ReportCwvClient<$Result.GetResult<Prisma.$ReportCwvPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ReportCwv.
     * @param {ReportCwvUpdateArgs} args - Arguments to update one ReportCwv.
     * @example
     * // Update one ReportCwv
     * const reportCwv = await prisma.reportCwv.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ReportCwvUpdateArgs>(args: SelectSubset<T, ReportCwvUpdateArgs<ExtArgs>>): Prisma__ReportCwvClient<$Result.GetResult<Prisma.$ReportCwvPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ReportCwvs.
     * @param {ReportCwvDeleteManyArgs} args - Arguments to filter ReportCwvs to delete.
     * @example
     * // Delete a few ReportCwvs
     * const { count } = await prisma.reportCwv.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ReportCwvDeleteManyArgs>(args?: SelectSubset<T, ReportCwvDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ReportCwvs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportCwvUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ReportCwvs
     * const reportCwv = await prisma.reportCwv.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ReportCwvUpdateManyArgs>(args: SelectSubset<T, ReportCwvUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ReportCwv.
     * @param {ReportCwvUpsertArgs} args - Arguments to update or create a ReportCwv.
     * @example
     * // Update or create a ReportCwv
     * const reportCwv = await prisma.reportCwv.upsert({
     *   create: {
     *     // ... data to create a ReportCwv
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ReportCwv we want to update
     *   }
     * })
     */
    upsert<T extends ReportCwvUpsertArgs>(args: SelectSubset<T, ReportCwvUpsertArgs<ExtArgs>>): Prisma__ReportCwvClient<$Result.GetResult<Prisma.$ReportCwvPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ReportCwvs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportCwvCountArgs} args - Arguments to filter ReportCwvs to count.
     * @example
     * // Count the number of ReportCwvs
     * const count = await prisma.reportCwv.count({
     *   where: {
     *     // ... the filter for the ReportCwvs we want to count
     *   }
     * })
    **/
    count<T extends ReportCwvCountArgs>(
      args?: Subset<T, ReportCwvCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ReportCwvCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ReportCwv.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportCwvAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ReportCwvAggregateArgs>(args: Subset<T, ReportCwvAggregateArgs>): Prisma.PrismaPromise<GetReportCwvAggregateType<T>>

    /**
     * Group by ReportCwv.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportCwvGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ReportCwvGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ReportCwvGroupByArgs['orderBy'] }
        : { orderBy?: ReportCwvGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ReportCwvGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetReportCwvGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ReportCwv model
   */
  readonly fields: ReportCwvFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ReportCwv.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ReportCwvClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    report<T extends ReportDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ReportDefaultArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ReportCwv model
   */ 
  interface ReportCwvFieldRefs {
    readonly id: FieldRef<"ReportCwv", 'String'>
    readonly reportId: FieldRef<"ReportCwv", 'String'>
    readonly lcpMs: FieldRef<"ReportCwv", 'Decimal'>
    readonly inpMs: FieldRef<"ReportCwv", 'Decimal'>
    readonly cls: FieldRef<"ReportCwv", 'Decimal'>
    readonly performanceScore: FieldRef<"ReportCwv", 'Int'>
    readonly accessibilityScore: FieldRef<"ReportCwv", 'Int'>
    readonly bestPracticesScore: FieldRef<"ReportCwv", 'Int'>
    readonly lighthouseSeoScore: FieldRef<"ReportCwv", 'Int'>
    readonly desktopLcpMs: FieldRef<"ReportCwv", 'Decimal'>
    readonly desktopInpMs: FieldRef<"ReportCwv", 'Decimal'>
    readonly desktopCls: FieldRef<"ReportCwv", 'Decimal'>
    readonly desktopPerformanceScore: FieldRef<"ReportCwv", 'Int'>
    readonly desktopAccessibilityScore: FieldRef<"ReportCwv", 'Int'>
    readonly desktopBestPracticesScore: FieldRef<"ReportCwv", 'Int'>
    readonly desktopLighthouseSeoScore: FieldRef<"ReportCwv", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * ReportCwv findUnique
   */
  export type ReportCwvFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportCwv
     */
    select?: ReportCwvSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportCwvInclude<ExtArgs> | null
    /**
     * Filter, which ReportCwv to fetch.
     */
    where: ReportCwvWhereUniqueInput
  }

  /**
   * ReportCwv findUniqueOrThrow
   */
  export type ReportCwvFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportCwv
     */
    select?: ReportCwvSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportCwvInclude<ExtArgs> | null
    /**
     * Filter, which ReportCwv to fetch.
     */
    where: ReportCwvWhereUniqueInput
  }

  /**
   * ReportCwv findFirst
   */
  export type ReportCwvFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportCwv
     */
    select?: ReportCwvSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportCwvInclude<ExtArgs> | null
    /**
     * Filter, which ReportCwv to fetch.
     */
    where?: ReportCwvWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportCwvs to fetch.
     */
    orderBy?: ReportCwvOrderByWithRelationInput | ReportCwvOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ReportCwvs.
     */
    cursor?: ReportCwvWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportCwvs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportCwvs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ReportCwvs.
     */
    distinct?: ReportCwvScalarFieldEnum | ReportCwvScalarFieldEnum[]
  }

  /**
   * ReportCwv findFirstOrThrow
   */
  export type ReportCwvFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportCwv
     */
    select?: ReportCwvSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportCwvInclude<ExtArgs> | null
    /**
     * Filter, which ReportCwv to fetch.
     */
    where?: ReportCwvWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportCwvs to fetch.
     */
    orderBy?: ReportCwvOrderByWithRelationInput | ReportCwvOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ReportCwvs.
     */
    cursor?: ReportCwvWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportCwvs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportCwvs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ReportCwvs.
     */
    distinct?: ReportCwvScalarFieldEnum | ReportCwvScalarFieldEnum[]
  }

  /**
   * ReportCwv findMany
   */
  export type ReportCwvFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportCwv
     */
    select?: ReportCwvSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportCwvInclude<ExtArgs> | null
    /**
     * Filter, which ReportCwvs to fetch.
     */
    where?: ReportCwvWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportCwvs to fetch.
     */
    orderBy?: ReportCwvOrderByWithRelationInput | ReportCwvOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ReportCwvs.
     */
    cursor?: ReportCwvWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportCwvs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportCwvs.
     */
    skip?: number
    distinct?: ReportCwvScalarFieldEnum | ReportCwvScalarFieldEnum[]
  }

  /**
   * ReportCwv create
   */
  export type ReportCwvCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportCwv
     */
    select?: ReportCwvSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportCwvInclude<ExtArgs> | null
    /**
     * The data needed to create a ReportCwv.
     */
    data: XOR<ReportCwvCreateInput, ReportCwvUncheckedCreateInput>
  }

  /**
   * ReportCwv createMany
   */
  export type ReportCwvCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ReportCwvs.
     */
    data: ReportCwvCreateManyInput | ReportCwvCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ReportCwv createManyAndReturn
   */
  export type ReportCwvCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportCwv
     */
    select?: ReportCwvSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ReportCwvs.
     */
    data: ReportCwvCreateManyInput | ReportCwvCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportCwvIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ReportCwv update
   */
  export type ReportCwvUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportCwv
     */
    select?: ReportCwvSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportCwvInclude<ExtArgs> | null
    /**
     * The data needed to update a ReportCwv.
     */
    data: XOR<ReportCwvUpdateInput, ReportCwvUncheckedUpdateInput>
    /**
     * Choose, which ReportCwv to update.
     */
    where: ReportCwvWhereUniqueInput
  }

  /**
   * ReportCwv updateMany
   */
  export type ReportCwvUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ReportCwvs.
     */
    data: XOR<ReportCwvUpdateManyMutationInput, ReportCwvUncheckedUpdateManyInput>
    /**
     * Filter which ReportCwvs to update
     */
    where?: ReportCwvWhereInput
  }

  /**
   * ReportCwv upsert
   */
  export type ReportCwvUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportCwv
     */
    select?: ReportCwvSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportCwvInclude<ExtArgs> | null
    /**
     * The filter to search for the ReportCwv to update in case it exists.
     */
    where: ReportCwvWhereUniqueInput
    /**
     * In case the ReportCwv found by the `where` argument doesn't exist, create a new ReportCwv with this data.
     */
    create: XOR<ReportCwvCreateInput, ReportCwvUncheckedCreateInput>
    /**
     * In case the ReportCwv was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ReportCwvUpdateInput, ReportCwvUncheckedUpdateInput>
  }

  /**
   * ReportCwv delete
   */
  export type ReportCwvDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportCwv
     */
    select?: ReportCwvSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportCwvInclude<ExtArgs> | null
    /**
     * Filter which ReportCwv to delete.
     */
    where: ReportCwvWhereUniqueInput
  }

  /**
   * ReportCwv deleteMany
   */
  export type ReportCwvDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ReportCwvs to delete
     */
    where?: ReportCwvWhereInput
  }

  /**
   * ReportCwv without action
   */
  export type ReportCwvDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportCwv
     */
    select?: ReportCwvSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportCwvInclude<ExtArgs> | null
  }


  /**
   * Model ShareLink
   */

  export type AggregateShareLink = {
    _count: ShareLinkCountAggregateOutputType | null
    _avg: ShareLinkAvgAggregateOutputType | null
    _sum: ShareLinkSumAggregateOutputType | null
    _min: ShareLinkMinAggregateOutputType | null
    _max: ShareLinkMaxAggregateOutputType | null
  }

  export type ShareLinkAvgAggregateOutputType = {
    accessedCount: number | null
  }

  export type ShareLinkSumAggregateOutputType = {
    accessedCount: number | null
  }

  export type ShareLinkMinAggregateOutputType = {
    id: string | null
    reportId: string | null
    auditId: string | null
    token: string | null
    isActive: boolean | null
    accessedCount: number | null
    lastAccessedAt: Date | null
    createdAt: Date | null
  }

  export type ShareLinkMaxAggregateOutputType = {
    id: string | null
    reportId: string | null
    auditId: string | null
    token: string | null
    isActive: boolean | null
    accessedCount: number | null
    lastAccessedAt: Date | null
    createdAt: Date | null
  }

  export type ShareLinkCountAggregateOutputType = {
    id: number
    reportId: number
    auditId: number
    token: number
    isActive: number
    accessedCount: number
    lastAccessedAt: number
    createdAt: number
    _all: number
  }


  export type ShareLinkAvgAggregateInputType = {
    accessedCount?: true
  }

  export type ShareLinkSumAggregateInputType = {
    accessedCount?: true
  }

  export type ShareLinkMinAggregateInputType = {
    id?: true
    reportId?: true
    auditId?: true
    token?: true
    isActive?: true
    accessedCount?: true
    lastAccessedAt?: true
    createdAt?: true
  }

  export type ShareLinkMaxAggregateInputType = {
    id?: true
    reportId?: true
    auditId?: true
    token?: true
    isActive?: true
    accessedCount?: true
    lastAccessedAt?: true
    createdAt?: true
  }

  export type ShareLinkCountAggregateInputType = {
    id?: true
    reportId?: true
    auditId?: true
    token?: true
    isActive?: true
    accessedCount?: true
    lastAccessedAt?: true
    createdAt?: true
    _all?: true
  }

  export type ShareLinkAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ShareLink to aggregate.
     */
    where?: ShareLinkWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ShareLinks to fetch.
     */
    orderBy?: ShareLinkOrderByWithRelationInput | ShareLinkOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ShareLinkWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ShareLinks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ShareLinks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ShareLinks
    **/
    _count?: true | ShareLinkCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ShareLinkAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ShareLinkSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ShareLinkMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ShareLinkMaxAggregateInputType
  }

  export type GetShareLinkAggregateType<T extends ShareLinkAggregateArgs> = {
        [P in keyof T & keyof AggregateShareLink]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateShareLink[P]>
      : GetScalarType<T[P], AggregateShareLink[P]>
  }




  export type ShareLinkGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ShareLinkWhereInput
    orderBy?: ShareLinkOrderByWithAggregationInput | ShareLinkOrderByWithAggregationInput[]
    by: ShareLinkScalarFieldEnum[] | ShareLinkScalarFieldEnum
    having?: ShareLinkScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ShareLinkCountAggregateInputType | true
    _avg?: ShareLinkAvgAggregateInputType
    _sum?: ShareLinkSumAggregateInputType
    _min?: ShareLinkMinAggregateInputType
    _max?: ShareLinkMaxAggregateInputType
  }

  export type ShareLinkGroupByOutputType = {
    id: string
    reportId: string
    auditId: string
    token: string
    isActive: boolean
    accessedCount: number
    lastAccessedAt: Date | null
    createdAt: Date
    _count: ShareLinkCountAggregateOutputType | null
    _avg: ShareLinkAvgAggregateOutputType | null
    _sum: ShareLinkSumAggregateOutputType | null
    _min: ShareLinkMinAggregateOutputType | null
    _max: ShareLinkMaxAggregateOutputType | null
  }

  type GetShareLinkGroupByPayload<T extends ShareLinkGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ShareLinkGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ShareLinkGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ShareLinkGroupByOutputType[P]>
            : GetScalarType<T[P], ShareLinkGroupByOutputType[P]>
        }
      >
    >


  export type ShareLinkSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    reportId?: boolean
    auditId?: boolean
    token?: boolean
    isActive?: boolean
    accessedCount?: boolean
    lastAccessedAt?: boolean
    createdAt?: boolean
    report?: boolean | ReportDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["shareLink"]>

  export type ShareLinkSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    reportId?: boolean
    auditId?: boolean
    token?: boolean
    isActive?: boolean
    accessedCount?: boolean
    lastAccessedAt?: boolean
    createdAt?: boolean
    report?: boolean | ReportDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["shareLink"]>

  export type ShareLinkSelectScalar = {
    id?: boolean
    reportId?: boolean
    auditId?: boolean
    token?: boolean
    isActive?: boolean
    accessedCount?: boolean
    lastAccessedAt?: boolean
    createdAt?: boolean
  }

  export type ShareLinkInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    report?: boolean | ReportDefaultArgs<ExtArgs>
  }
  export type ShareLinkIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    report?: boolean | ReportDefaultArgs<ExtArgs>
  }

  export type $ShareLinkPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ShareLink"
    objects: {
      report: Prisma.$ReportPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      reportId: string
      auditId: string
      token: string
      isActive: boolean
      accessedCount: number
      lastAccessedAt: Date | null
      createdAt: Date
    }, ExtArgs["result"]["shareLink"]>
    composites: {}
  }

  type ShareLinkGetPayload<S extends boolean | null | undefined | ShareLinkDefaultArgs> = $Result.GetResult<Prisma.$ShareLinkPayload, S>

  type ShareLinkCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ShareLinkFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ShareLinkCountAggregateInputType | true
    }

  export interface ShareLinkDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ShareLink'], meta: { name: 'ShareLink' } }
    /**
     * Find zero or one ShareLink that matches the filter.
     * @param {ShareLinkFindUniqueArgs} args - Arguments to find a ShareLink
     * @example
     * // Get one ShareLink
     * const shareLink = await prisma.shareLink.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ShareLinkFindUniqueArgs>(args: SelectSubset<T, ShareLinkFindUniqueArgs<ExtArgs>>): Prisma__ShareLinkClient<$Result.GetResult<Prisma.$ShareLinkPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ShareLink that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ShareLinkFindUniqueOrThrowArgs} args - Arguments to find a ShareLink
     * @example
     * // Get one ShareLink
     * const shareLink = await prisma.shareLink.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ShareLinkFindUniqueOrThrowArgs>(args: SelectSubset<T, ShareLinkFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ShareLinkClient<$Result.GetResult<Prisma.$ShareLinkPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ShareLink that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShareLinkFindFirstArgs} args - Arguments to find a ShareLink
     * @example
     * // Get one ShareLink
     * const shareLink = await prisma.shareLink.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ShareLinkFindFirstArgs>(args?: SelectSubset<T, ShareLinkFindFirstArgs<ExtArgs>>): Prisma__ShareLinkClient<$Result.GetResult<Prisma.$ShareLinkPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ShareLink that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShareLinkFindFirstOrThrowArgs} args - Arguments to find a ShareLink
     * @example
     * // Get one ShareLink
     * const shareLink = await prisma.shareLink.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ShareLinkFindFirstOrThrowArgs>(args?: SelectSubset<T, ShareLinkFindFirstOrThrowArgs<ExtArgs>>): Prisma__ShareLinkClient<$Result.GetResult<Prisma.$ShareLinkPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ShareLinks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShareLinkFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ShareLinks
     * const shareLinks = await prisma.shareLink.findMany()
     * 
     * // Get first 10 ShareLinks
     * const shareLinks = await prisma.shareLink.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const shareLinkWithIdOnly = await prisma.shareLink.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ShareLinkFindManyArgs>(args?: SelectSubset<T, ShareLinkFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShareLinkPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ShareLink.
     * @param {ShareLinkCreateArgs} args - Arguments to create a ShareLink.
     * @example
     * // Create one ShareLink
     * const ShareLink = await prisma.shareLink.create({
     *   data: {
     *     // ... data to create a ShareLink
     *   }
     * })
     * 
     */
    create<T extends ShareLinkCreateArgs>(args: SelectSubset<T, ShareLinkCreateArgs<ExtArgs>>): Prisma__ShareLinkClient<$Result.GetResult<Prisma.$ShareLinkPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ShareLinks.
     * @param {ShareLinkCreateManyArgs} args - Arguments to create many ShareLinks.
     * @example
     * // Create many ShareLinks
     * const shareLink = await prisma.shareLink.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ShareLinkCreateManyArgs>(args?: SelectSubset<T, ShareLinkCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ShareLinks and returns the data saved in the database.
     * @param {ShareLinkCreateManyAndReturnArgs} args - Arguments to create many ShareLinks.
     * @example
     * // Create many ShareLinks
     * const shareLink = await prisma.shareLink.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ShareLinks and only return the `id`
     * const shareLinkWithIdOnly = await prisma.shareLink.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ShareLinkCreateManyAndReturnArgs>(args?: SelectSubset<T, ShareLinkCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ShareLinkPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ShareLink.
     * @param {ShareLinkDeleteArgs} args - Arguments to delete one ShareLink.
     * @example
     * // Delete one ShareLink
     * const ShareLink = await prisma.shareLink.delete({
     *   where: {
     *     // ... filter to delete one ShareLink
     *   }
     * })
     * 
     */
    delete<T extends ShareLinkDeleteArgs>(args: SelectSubset<T, ShareLinkDeleteArgs<ExtArgs>>): Prisma__ShareLinkClient<$Result.GetResult<Prisma.$ShareLinkPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ShareLink.
     * @param {ShareLinkUpdateArgs} args - Arguments to update one ShareLink.
     * @example
     * // Update one ShareLink
     * const shareLink = await prisma.shareLink.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ShareLinkUpdateArgs>(args: SelectSubset<T, ShareLinkUpdateArgs<ExtArgs>>): Prisma__ShareLinkClient<$Result.GetResult<Prisma.$ShareLinkPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ShareLinks.
     * @param {ShareLinkDeleteManyArgs} args - Arguments to filter ShareLinks to delete.
     * @example
     * // Delete a few ShareLinks
     * const { count } = await prisma.shareLink.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ShareLinkDeleteManyArgs>(args?: SelectSubset<T, ShareLinkDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ShareLinks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShareLinkUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ShareLinks
     * const shareLink = await prisma.shareLink.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ShareLinkUpdateManyArgs>(args: SelectSubset<T, ShareLinkUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ShareLink.
     * @param {ShareLinkUpsertArgs} args - Arguments to update or create a ShareLink.
     * @example
     * // Update or create a ShareLink
     * const shareLink = await prisma.shareLink.upsert({
     *   create: {
     *     // ... data to create a ShareLink
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ShareLink we want to update
     *   }
     * })
     */
    upsert<T extends ShareLinkUpsertArgs>(args: SelectSubset<T, ShareLinkUpsertArgs<ExtArgs>>): Prisma__ShareLinkClient<$Result.GetResult<Prisma.$ShareLinkPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ShareLinks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShareLinkCountArgs} args - Arguments to filter ShareLinks to count.
     * @example
     * // Count the number of ShareLinks
     * const count = await prisma.shareLink.count({
     *   where: {
     *     // ... the filter for the ShareLinks we want to count
     *   }
     * })
    **/
    count<T extends ShareLinkCountArgs>(
      args?: Subset<T, ShareLinkCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ShareLinkCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ShareLink.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShareLinkAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ShareLinkAggregateArgs>(args: Subset<T, ShareLinkAggregateArgs>): Prisma.PrismaPromise<GetShareLinkAggregateType<T>>

    /**
     * Group by ShareLink.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ShareLinkGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ShareLinkGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ShareLinkGroupByArgs['orderBy'] }
        : { orderBy?: ShareLinkGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ShareLinkGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetShareLinkGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ShareLink model
   */
  readonly fields: ShareLinkFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ShareLink.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ShareLinkClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    report<T extends ReportDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ReportDefaultArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ShareLink model
   */ 
  interface ShareLinkFieldRefs {
    readonly id: FieldRef<"ShareLink", 'String'>
    readonly reportId: FieldRef<"ShareLink", 'String'>
    readonly auditId: FieldRef<"ShareLink", 'String'>
    readonly token: FieldRef<"ShareLink", 'String'>
    readonly isActive: FieldRef<"ShareLink", 'Boolean'>
    readonly accessedCount: FieldRef<"ShareLink", 'Int'>
    readonly lastAccessedAt: FieldRef<"ShareLink", 'DateTime'>
    readonly createdAt: FieldRef<"ShareLink", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ShareLink findUnique
   */
  export type ShareLinkFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShareLink
     */
    select?: ShareLinkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShareLinkInclude<ExtArgs> | null
    /**
     * Filter, which ShareLink to fetch.
     */
    where: ShareLinkWhereUniqueInput
  }

  /**
   * ShareLink findUniqueOrThrow
   */
  export type ShareLinkFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShareLink
     */
    select?: ShareLinkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShareLinkInclude<ExtArgs> | null
    /**
     * Filter, which ShareLink to fetch.
     */
    where: ShareLinkWhereUniqueInput
  }

  /**
   * ShareLink findFirst
   */
  export type ShareLinkFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShareLink
     */
    select?: ShareLinkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShareLinkInclude<ExtArgs> | null
    /**
     * Filter, which ShareLink to fetch.
     */
    where?: ShareLinkWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ShareLinks to fetch.
     */
    orderBy?: ShareLinkOrderByWithRelationInput | ShareLinkOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ShareLinks.
     */
    cursor?: ShareLinkWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ShareLinks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ShareLinks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ShareLinks.
     */
    distinct?: ShareLinkScalarFieldEnum | ShareLinkScalarFieldEnum[]
  }

  /**
   * ShareLink findFirstOrThrow
   */
  export type ShareLinkFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShareLink
     */
    select?: ShareLinkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShareLinkInclude<ExtArgs> | null
    /**
     * Filter, which ShareLink to fetch.
     */
    where?: ShareLinkWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ShareLinks to fetch.
     */
    orderBy?: ShareLinkOrderByWithRelationInput | ShareLinkOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ShareLinks.
     */
    cursor?: ShareLinkWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ShareLinks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ShareLinks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ShareLinks.
     */
    distinct?: ShareLinkScalarFieldEnum | ShareLinkScalarFieldEnum[]
  }

  /**
   * ShareLink findMany
   */
  export type ShareLinkFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShareLink
     */
    select?: ShareLinkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShareLinkInclude<ExtArgs> | null
    /**
     * Filter, which ShareLinks to fetch.
     */
    where?: ShareLinkWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ShareLinks to fetch.
     */
    orderBy?: ShareLinkOrderByWithRelationInput | ShareLinkOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ShareLinks.
     */
    cursor?: ShareLinkWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ShareLinks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ShareLinks.
     */
    skip?: number
    distinct?: ShareLinkScalarFieldEnum | ShareLinkScalarFieldEnum[]
  }

  /**
   * ShareLink create
   */
  export type ShareLinkCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShareLink
     */
    select?: ShareLinkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShareLinkInclude<ExtArgs> | null
    /**
     * The data needed to create a ShareLink.
     */
    data: XOR<ShareLinkCreateInput, ShareLinkUncheckedCreateInput>
  }

  /**
   * ShareLink createMany
   */
  export type ShareLinkCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ShareLinks.
     */
    data: ShareLinkCreateManyInput | ShareLinkCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ShareLink createManyAndReturn
   */
  export type ShareLinkCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShareLink
     */
    select?: ShareLinkSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ShareLinks.
     */
    data: ShareLinkCreateManyInput | ShareLinkCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShareLinkIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ShareLink update
   */
  export type ShareLinkUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShareLink
     */
    select?: ShareLinkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShareLinkInclude<ExtArgs> | null
    /**
     * The data needed to update a ShareLink.
     */
    data: XOR<ShareLinkUpdateInput, ShareLinkUncheckedUpdateInput>
    /**
     * Choose, which ShareLink to update.
     */
    where: ShareLinkWhereUniqueInput
  }

  /**
   * ShareLink updateMany
   */
  export type ShareLinkUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ShareLinks.
     */
    data: XOR<ShareLinkUpdateManyMutationInput, ShareLinkUncheckedUpdateManyInput>
    /**
     * Filter which ShareLinks to update
     */
    where?: ShareLinkWhereInput
  }

  /**
   * ShareLink upsert
   */
  export type ShareLinkUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShareLink
     */
    select?: ShareLinkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShareLinkInclude<ExtArgs> | null
    /**
     * The filter to search for the ShareLink to update in case it exists.
     */
    where: ShareLinkWhereUniqueInput
    /**
     * In case the ShareLink found by the `where` argument doesn't exist, create a new ShareLink with this data.
     */
    create: XOR<ShareLinkCreateInput, ShareLinkUncheckedCreateInput>
    /**
     * In case the ShareLink was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ShareLinkUpdateInput, ShareLinkUncheckedUpdateInput>
  }

  /**
   * ShareLink delete
   */
  export type ShareLinkDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShareLink
     */
    select?: ShareLinkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShareLinkInclude<ExtArgs> | null
    /**
     * Filter which ShareLink to delete.
     */
    where: ShareLinkWhereUniqueInput
  }

  /**
   * ShareLink deleteMany
   */
  export type ShareLinkDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ShareLinks to delete
     */
    where?: ShareLinkWhereInput
  }

  /**
   * ShareLink without action
   */
  export type ShareLinkDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ShareLink
     */
    select?: ShareLinkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ShareLinkInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const ReportScalarFieldEnum: {
    id: 'id',
    auditId: 'auditId',
    url: 'url',
    domain: 'domain',
    finalScore: 'finalScore',
    classification: 'classification',
    totalIssues: 'totalIssues',
    criticalIssues: 'criticalIssues',
    warnIssues: 'warnIssues',
    passCount: 'passCount',
    analysisSnapshot: 'analysisSnapshot',
    cwvSnapshot: 'cwvSnapshot',
    createdAt: 'createdAt'
  };

  export type ReportScalarFieldEnum = (typeof ReportScalarFieldEnum)[keyof typeof ReportScalarFieldEnum]


  export const ReportKeywordScalarFieldEnum: {
    id: 'id',
    reportId: 'reportId',
    keyword: 'keyword',
    frequency: 'frequency',
    densityPercent: 'densityPercent',
    inTitle: 'inTitle',
    inH1: 'inH1',
    inFirstParagraph: 'inFirstParagraph',
    inMetaDescription: 'inMetaDescription',
    rank: 'rank',
    isTarget: 'isTarget'
  };

  export type ReportKeywordScalarFieldEnum = (typeof ReportKeywordScalarFieldEnum)[keyof typeof ReportKeywordScalarFieldEnum]


  export const ReportCwvScalarFieldEnum: {
    id: 'id',
    reportId: 'reportId',
    lcpMs: 'lcpMs',
    inpMs: 'inpMs',
    cls: 'cls',
    performanceScore: 'performanceScore',
    accessibilityScore: 'accessibilityScore',
    bestPracticesScore: 'bestPracticesScore',
    lighthouseSeoScore: 'lighthouseSeoScore',
    desktopLcpMs: 'desktopLcpMs',
    desktopInpMs: 'desktopInpMs',
    desktopCls: 'desktopCls',
    desktopPerformanceScore: 'desktopPerformanceScore',
    desktopAccessibilityScore: 'desktopAccessibilityScore',
    desktopBestPracticesScore: 'desktopBestPracticesScore',
    desktopLighthouseSeoScore: 'desktopLighthouseSeoScore'
  };

  export type ReportCwvScalarFieldEnum = (typeof ReportCwvScalarFieldEnum)[keyof typeof ReportCwvScalarFieldEnum]


  export const ShareLinkScalarFieldEnum: {
    id: 'id',
    reportId: 'reportId',
    auditId: 'auditId',
    token: 'token',
    isActive: 'isActive',
    accessedCount: 'accessedCount',
    lastAccessedAt: 'lastAccessedAt',
    createdAt: 'createdAt'
  };

  export type ShareLinkScalarFieldEnum = (typeof ShareLinkScalarFieldEnum)[keyof typeof ShareLinkScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type ReportWhereInput = {
    AND?: ReportWhereInput | ReportWhereInput[]
    OR?: ReportWhereInput[]
    NOT?: ReportWhereInput | ReportWhereInput[]
    id?: UuidFilter<"Report"> | string
    auditId?: UuidFilter<"Report"> | string
    url?: StringFilter<"Report"> | string
    domain?: StringFilter<"Report"> | string
    finalScore?: DecimalFilter<"Report"> | Decimal | DecimalJsLike | number | string
    classification?: StringFilter<"Report"> | string
    totalIssues?: IntFilter<"Report"> | number
    criticalIssues?: IntFilter<"Report"> | number
    warnIssues?: IntFilter<"Report"> | number
    passCount?: IntFilter<"Report"> | number
    analysisSnapshot?: JsonFilter<"Report">
    cwvSnapshot?: JsonFilter<"Report">
    createdAt?: DateTimeFilter<"Report"> | Date | string
    keywords?: ReportKeywordListRelationFilter
    cwv?: XOR<ReportCwvNullableRelationFilter, ReportCwvWhereInput> | null
    shareLink?: XOR<ShareLinkNullableRelationFilter, ShareLinkWhereInput> | null
  }

  export type ReportOrderByWithRelationInput = {
    id?: SortOrder
    auditId?: SortOrder
    url?: SortOrder
    domain?: SortOrder
    finalScore?: SortOrder
    classification?: SortOrder
    totalIssues?: SortOrder
    criticalIssues?: SortOrder
    warnIssues?: SortOrder
    passCount?: SortOrder
    analysisSnapshot?: SortOrder
    cwvSnapshot?: SortOrder
    createdAt?: SortOrder
    keywords?: ReportKeywordOrderByRelationAggregateInput
    cwv?: ReportCwvOrderByWithRelationInput
    shareLink?: ShareLinkOrderByWithRelationInput
  }

  export type ReportWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    auditId?: string
    AND?: ReportWhereInput | ReportWhereInput[]
    OR?: ReportWhereInput[]
    NOT?: ReportWhereInput | ReportWhereInput[]
    url?: StringFilter<"Report"> | string
    domain?: StringFilter<"Report"> | string
    finalScore?: DecimalFilter<"Report"> | Decimal | DecimalJsLike | number | string
    classification?: StringFilter<"Report"> | string
    totalIssues?: IntFilter<"Report"> | number
    criticalIssues?: IntFilter<"Report"> | number
    warnIssues?: IntFilter<"Report"> | number
    passCount?: IntFilter<"Report"> | number
    analysisSnapshot?: JsonFilter<"Report">
    cwvSnapshot?: JsonFilter<"Report">
    createdAt?: DateTimeFilter<"Report"> | Date | string
    keywords?: ReportKeywordListRelationFilter
    cwv?: XOR<ReportCwvNullableRelationFilter, ReportCwvWhereInput> | null
    shareLink?: XOR<ShareLinkNullableRelationFilter, ShareLinkWhereInput> | null
  }, "id" | "auditId">

  export type ReportOrderByWithAggregationInput = {
    id?: SortOrder
    auditId?: SortOrder
    url?: SortOrder
    domain?: SortOrder
    finalScore?: SortOrder
    classification?: SortOrder
    totalIssues?: SortOrder
    criticalIssues?: SortOrder
    warnIssues?: SortOrder
    passCount?: SortOrder
    analysisSnapshot?: SortOrder
    cwvSnapshot?: SortOrder
    createdAt?: SortOrder
    _count?: ReportCountOrderByAggregateInput
    _avg?: ReportAvgOrderByAggregateInput
    _max?: ReportMaxOrderByAggregateInput
    _min?: ReportMinOrderByAggregateInput
    _sum?: ReportSumOrderByAggregateInput
  }

  export type ReportScalarWhereWithAggregatesInput = {
    AND?: ReportScalarWhereWithAggregatesInput | ReportScalarWhereWithAggregatesInput[]
    OR?: ReportScalarWhereWithAggregatesInput[]
    NOT?: ReportScalarWhereWithAggregatesInput | ReportScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Report"> | string
    auditId?: UuidWithAggregatesFilter<"Report"> | string
    url?: StringWithAggregatesFilter<"Report"> | string
    domain?: StringWithAggregatesFilter<"Report"> | string
    finalScore?: DecimalWithAggregatesFilter<"Report"> | Decimal | DecimalJsLike | number | string
    classification?: StringWithAggregatesFilter<"Report"> | string
    totalIssues?: IntWithAggregatesFilter<"Report"> | number
    criticalIssues?: IntWithAggregatesFilter<"Report"> | number
    warnIssues?: IntWithAggregatesFilter<"Report"> | number
    passCount?: IntWithAggregatesFilter<"Report"> | number
    analysisSnapshot?: JsonWithAggregatesFilter<"Report">
    cwvSnapshot?: JsonWithAggregatesFilter<"Report">
    createdAt?: DateTimeWithAggregatesFilter<"Report"> | Date | string
  }

  export type ReportKeywordWhereInput = {
    AND?: ReportKeywordWhereInput | ReportKeywordWhereInput[]
    OR?: ReportKeywordWhereInput[]
    NOT?: ReportKeywordWhereInput | ReportKeywordWhereInput[]
    id?: UuidFilter<"ReportKeyword"> | string
    reportId?: UuidFilter<"ReportKeyword"> | string
    keyword?: StringFilter<"ReportKeyword"> | string
    frequency?: IntFilter<"ReportKeyword"> | number
    densityPercent?: DecimalFilter<"ReportKeyword"> | Decimal | DecimalJsLike | number | string
    inTitle?: BoolFilter<"ReportKeyword"> | boolean
    inH1?: BoolFilter<"ReportKeyword"> | boolean
    inFirstParagraph?: BoolFilter<"ReportKeyword"> | boolean
    inMetaDescription?: BoolFilter<"ReportKeyword"> | boolean
    rank?: IntFilter<"ReportKeyword"> | number
    isTarget?: BoolFilter<"ReportKeyword"> | boolean
    report?: XOR<ReportRelationFilter, ReportWhereInput>
  }

  export type ReportKeywordOrderByWithRelationInput = {
    id?: SortOrder
    reportId?: SortOrder
    keyword?: SortOrder
    frequency?: SortOrder
    densityPercent?: SortOrder
    inTitle?: SortOrder
    inH1?: SortOrder
    inFirstParagraph?: SortOrder
    inMetaDescription?: SortOrder
    rank?: SortOrder
    isTarget?: SortOrder
    report?: ReportOrderByWithRelationInput
  }

  export type ReportKeywordWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ReportKeywordWhereInput | ReportKeywordWhereInput[]
    OR?: ReportKeywordWhereInput[]
    NOT?: ReportKeywordWhereInput | ReportKeywordWhereInput[]
    reportId?: UuidFilter<"ReportKeyword"> | string
    keyword?: StringFilter<"ReportKeyword"> | string
    frequency?: IntFilter<"ReportKeyword"> | number
    densityPercent?: DecimalFilter<"ReportKeyword"> | Decimal | DecimalJsLike | number | string
    inTitle?: BoolFilter<"ReportKeyword"> | boolean
    inH1?: BoolFilter<"ReportKeyword"> | boolean
    inFirstParagraph?: BoolFilter<"ReportKeyword"> | boolean
    inMetaDescription?: BoolFilter<"ReportKeyword"> | boolean
    rank?: IntFilter<"ReportKeyword"> | number
    isTarget?: BoolFilter<"ReportKeyword"> | boolean
    report?: XOR<ReportRelationFilter, ReportWhereInput>
  }, "id">

  export type ReportKeywordOrderByWithAggregationInput = {
    id?: SortOrder
    reportId?: SortOrder
    keyword?: SortOrder
    frequency?: SortOrder
    densityPercent?: SortOrder
    inTitle?: SortOrder
    inH1?: SortOrder
    inFirstParagraph?: SortOrder
    inMetaDescription?: SortOrder
    rank?: SortOrder
    isTarget?: SortOrder
    _count?: ReportKeywordCountOrderByAggregateInput
    _avg?: ReportKeywordAvgOrderByAggregateInput
    _max?: ReportKeywordMaxOrderByAggregateInput
    _min?: ReportKeywordMinOrderByAggregateInput
    _sum?: ReportKeywordSumOrderByAggregateInput
  }

  export type ReportKeywordScalarWhereWithAggregatesInput = {
    AND?: ReportKeywordScalarWhereWithAggregatesInput | ReportKeywordScalarWhereWithAggregatesInput[]
    OR?: ReportKeywordScalarWhereWithAggregatesInput[]
    NOT?: ReportKeywordScalarWhereWithAggregatesInput | ReportKeywordScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ReportKeyword"> | string
    reportId?: UuidWithAggregatesFilter<"ReportKeyword"> | string
    keyword?: StringWithAggregatesFilter<"ReportKeyword"> | string
    frequency?: IntWithAggregatesFilter<"ReportKeyword"> | number
    densityPercent?: DecimalWithAggregatesFilter<"ReportKeyword"> | Decimal | DecimalJsLike | number | string
    inTitle?: BoolWithAggregatesFilter<"ReportKeyword"> | boolean
    inH1?: BoolWithAggregatesFilter<"ReportKeyword"> | boolean
    inFirstParagraph?: BoolWithAggregatesFilter<"ReportKeyword"> | boolean
    inMetaDescription?: BoolWithAggregatesFilter<"ReportKeyword"> | boolean
    rank?: IntWithAggregatesFilter<"ReportKeyword"> | number
    isTarget?: BoolWithAggregatesFilter<"ReportKeyword"> | boolean
  }

  export type ReportCwvWhereInput = {
    AND?: ReportCwvWhereInput | ReportCwvWhereInput[]
    OR?: ReportCwvWhereInput[]
    NOT?: ReportCwvWhereInput | ReportCwvWhereInput[]
    id?: UuidFilter<"ReportCwv"> | string
    reportId?: UuidFilter<"ReportCwv"> | string
    lcpMs?: DecimalFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string
    inpMs?: DecimalFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string
    cls?: DecimalFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string
    performanceScore?: IntFilter<"ReportCwv"> | number
    accessibilityScore?: IntFilter<"ReportCwv"> | number
    bestPracticesScore?: IntFilter<"ReportCwv"> | number
    lighthouseSeoScore?: IntFilter<"ReportCwv"> | number
    desktopLcpMs?: DecimalNullableFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: DecimalNullableFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string | null
    desktopCls?: DecimalNullableFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: IntNullableFilter<"ReportCwv"> | number | null
    desktopAccessibilityScore?: IntNullableFilter<"ReportCwv"> | number | null
    desktopBestPracticesScore?: IntNullableFilter<"ReportCwv"> | number | null
    desktopLighthouseSeoScore?: IntNullableFilter<"ReportCwv"> | number | null
    report?: XOR<ReportRelationFilter, ReportWhereInput>
  }

  export type ReportCwvOrderByWithRelationInput = {
    id?: SortOrder
    reportId?: SortOrder
    lcpMs?: SortOrder
    inpMs?: SortOrder
    cls?: SortOrder
    performanceScore?: SortOrder
    accessibilityScore?: SortOrder
    bestPracticesScore?: SortOrder
    lighthouseSeoScore?: SortOrder
    desktopLcpMs?: SortOrderInput | SortOrder
    desktopInpMs?: SortOrderInput | SortOrder
    desktopCls?: SortOrderInput | SortOrder
    desktopPerformanceScore?: SortOrderInput | SortOrder
    desktopAccessibilityScore?: SortOrderInput | SortOrder
    desktopBestPracticesScore?: SortOrderInput | SortOrder
    desktopLighthouseSeoScore?: SortOrderInput | SortOrder
    report?: ReportOrderByWithRelationInput
  }

  export type ReportCwvWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    reportId?: string
    AND?: ReportCwvWhereInput | ReportCwvWhereInput[]
    OR?: ReportCwvWhereInput[]
    NOT?: ReportCwvWhereInput | ReportCwvWhereInput[]
    lcpMs?: DecimalFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string
    inpMs?: DecimalFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string
    cls?: DecimalFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string
    performanceScore?: IntFilter<"ReportCwv"> | number
    accessibilityScore?: IntFilter<"ReportCwv"> | number
    bestPracticesScore?: IntFilter<"ReportCwv"> | number
    lighthouseSeoScore?: IntFilter<"ReportCwv"> | number
    desktopLcpMs?: DecimalNullableFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: DecimalNullableFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string | null
    desktopCls?: DecimalNullableFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: IntNullableFilter<"ReportCwv"> | number | null
    desktopAccessibilityScore?: IntNullableFilter<"ReportCwv"> | number | null
    desktopBestPracticesScore?: IntNullableFilter<"ReportCwv"> | number | null
    desktopLighthouseSeoScore?: IntNullableFilter<"ReportCwv"> | number | null
    report?: XOR<ReportRelationFilter, ReportWhereInput>
  }, "id" | "reportId">

  export type ReportCwvOrderByWithAggregationInput = {
    id?: SortOrder
    reportId?: SortOrder
    lcpMs?: SortOrder
    inpMs?: SortOrder
    cls?: SortOrder
    performanceScore?: SortOrder
    accessibilityScore?: SortOrder
    bestPracticesScore?: SortOrder
    lighthouseSeoScore?: SortOrder
    desktopLcpMs?: SortOrderInput | SortOrder
    desktopInpMs?: SortOrderInput | SortOrder
    desktopCls?: SortOrderInput | SortOrder
    desktopPerformanceScore?: SortOrderInput | SortOrder
    desktopAccessibilityScore?: SortOrderInput | SortOrder
    desktopBestPracticesScore?: SortOrderInput | SortOrder
    desktopLighthouseSeoScore?: SortOrderInput | SortOrder
    _count?: ReportCwvCountOrderByAggregateInput
    _avg?: ReportCwvAvgOrderByAggregateInput
    _max?: ReportCwvMaxOrderByAggregateInput
    _min?: ReportCwvMinOrderByAggregateInput
    _sum?: ReportCwvSumOrderByAggregateInput
  }

  export type ReportCwvScalarWhereWithAggregatesInput = {
    AND?: ReportCwvScalarWhereWithAggregatesInput | ReportCwvScalarWhereWithAggregatesInput[]
    OR?: ReportCwvScalarWhereWithAggregatesInput[]
    NOT?: ReportCwvScalarWhereWithAggregatesInput | ReportCwvScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ReportCwv"> | string
    reportId?: UuidWithAggregatesFilter<"ReportCwv"> | string
    lcpMs?: DecimalWithAggregatesFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string
    inpMs?: DecimalWithAggregatesFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string
    cls?: DecimalWithAggregatesFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string
    performanceScore?: IntWithAggregatesFilter<"ReportCwv"> | number
    accessibilityScore?: IntWithAggregatesFilter<"ReportCwv"> | number
    bestPracticesScore?: IntWithAggregatesFilter<"ReportCwv"> | number
    lighthouseSeoScore?: IntWithAggregatesFilter<"ReportCwv"> | number
    desktopLcpMs?: DecimalNullableWithAggregatesFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: DecimalNullableWithAggregatesFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string | null
    desktopCls?: DecimalNullableWithAggregatesFilter<"ReportCwv"> | Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: IntNullableWithAggregatesFilter<"ReportCwv"> | number | null
    desktopAccessibilityScore?: IntNullableWithAggregatesFilter<"ReportCwv"> | number | null
    desktopBestPracticesScore?: IntNullableWithAggregatesFilter<"ReportCwv"> | number | null
    desktopLighthouseSeoScore?: IntNullableWithAggregatesFilter<"ReportCwv"> | number | null
  }

  export type ShareLinkWhereInput = {
    AND?: ShareLinkWhereInput | ShareLinkWhereInput[]
    OR?: ShareLinkWhereInput[]
    NOT?: ShareLinkWhereInput | ShareLinkWhereInput[]
    id?: UuidFilter<"ShareLink"> | string
    reportId?: UuidFilter<"ShareLink"> | string
    auditId?: UuidFilter<"ShareLink"> | string
    token?: StringFilter<"ShareLink"> | string
    isActive?: BoolFilter<"ShareLink"> | boolean
    accessedCount?: IntFilter<"ShareLink"> | number
    lastAccessedAt?: DateTimeNullableFilter<"ShareLink"> | Date | string | null
    createdAt?: DateTimeFilter<"ShareLink"> | Date | string
    report?: XOR<ReportRelationFilter, ReportWhereInput>
  }

  export type ShareLinkOrderByWithRelationInput = {
    id?: SortOrder
    reportId?: SortOrder
    auditId?: SortOrder
    token?: SortOrder
    isActive?: SortOrder
    accessedCount?: SortOrder
    lastAccessedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    report?: ReportOrderByWithRelationInput
  }

  export type ShareLinkWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    reportId?: string
    token?: string
    AND?: ShareLinkWhereInput | ShareLinkWhereInput[]
    OR?: ShareLinkWhereInput[]
    NOT?: ShareLinkWhereInput | ShareLinkWhereInput[]
    auditId?: UuidFilter<"ShareLink"> | string
    isActive?: BoolFilter<"ShareLink"> | boolean
    accessedCount?: IntFilter<"ShareLink"> | number
    lastAccessedAt?: DateTimeNullableFilter<"ShareLink"> | Date | string | null
    createdAt?: DateTimeFilter<"ShareLink"> | Date | string
    report?: XOR<ReportRelationFilter, ReportWhereInput>
  }, "id" | "reportId" | "token">

  export type ShareLinkOrderByWithAggregationInput = {
    id?: SortOrder
    reportId?: SortOrder
    auditId?: SortOrder
    token?: SortOrder
    isActive?: SortOrder
    accessedCount?: SortOrder
    lastAccessedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: ShareLinkCountOrderByAggregateInput
    _avg?: ShareLinkAvgOrderByAggregateInput
    _max?: ShareLinkMaxOrderByAggregateInput
    _min?: ShareLinkMinOrderByAggregateInput
    _sum?: ShareLinkSumOrderByAggregateInput
  }

  export type ShareLinkScalarWhereWithAggregatesInput = {
    AND?: ShareLinkScalarWhereWithAggregatesInput | ShareLinkScalarWhereWithAggregatesInput[]
    OR?: ShareLinkScalarWhereWithAggregatesInput[]
    NOT?: ShareLinkScalarWhereWithAggregatesInput | ShareLinkScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ShareLink"> | string
    reportId?: UuidWithAggregatesFilter<"ShareLink"> | string
    auditId?: UuidWithAggregatesFilter<"ShareLink"> | string
    token?: StringWithAggregatesFilter<"ShareLink"> | string
    isActive?: BoolWithAggregatesFilter<"ShareLink"> | boolean
    accessedCount?: IntWithAggregatesFilter<"ShareLink"> | number
    lastAccessedAt?: DateTimeNullableWithAggregatesFilter<"ShareLink"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ShareLink"> | Date | string
  }

  export type ReportCreateInput = {
    id?: string
    auditId: string
    url: string
    domain: string
    finalScore: Decimal | DecimalJsLike | number | string
    classification: string
    totalIssues: number
    criticalIssues: number
    warnIssues: number
    passCount: number
    analysisSnapshot: JsonNullValueInput | InputJsonValue
    cwvSnapshot: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    keywords?: ReportKeywordCreateNestedManyWithoutReportInput
    cwv?: ReportCwvCreateNestedOneWithoutReportInput
    shareLink?: ShareLinkCreateNestedOneWithoutReportInput
  }

  export type ReportUncheckedCreateInput = {
    id?: string
    auditId: string
    url: string
    domain: string
    finalScore: Decimal | DecimalJsLike | number | string
    classification: string
    totalIssues: number
    criticalIssues: number
    warnIssues: number
    passCount: number
    analysisSnapshot: JsonNullValueInput | InputJsonValue
    cwvSnapshot: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    keywords?: ReportKeywordUncheckedCreateNestedManyWithoutReportInput
    cwv?: ReportCwvUncheckedCreateNestedOneWithoutReportInput
    shareLink?: ShareLinkUncheckedCreateNestedOneWithoutReportInput
  }

  export type ReportUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    finalScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    classification?: StringFieldUpdateOperationsInput | string
    totalIssues?: IntFieldUpdateOperationsInput | number
    criticalIssues?: IntFieldUpdateOperationsInput | number
    warnIssues?: IntFieldUpdateOperationsInput | number
    passCount?: IntFieldUpdateOperationsInput | number
    analysisSnapshot?: JsonNullValueInput | InputJsonValue
    cwvSnapshot?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    keywords?: ReportKeywordUpdateManyWithoutReportNestedInput
    cwv?: ReportCwvUpdateOneWithoutReportNestedInput
    shareLink?: ShareLinkUpdateOneWithoutReportNestedInput
  }

  export type ReportUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    finalScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    classification?: StringFieldUpdateOperationsInput | string
    totalIssues?: IntFieldUpdateOperationsInput | number
    criticalIssues?: IntFieldUpdateOperationsInput | number
    warnIssues?: IntFieldUpdateOperationsInput | number
    passCount?: IntFieldUpdateOperationsInput | number
    analysisSnapshot?: JsonNullValueInput | InputJsonValue
    cwvSnapshot?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    keywords?: ReportKeywordUncheckedUpdateManyWithoutReportNestedInput
    cwv?: ReportCwvUncheckedUpdateOneWithoutReportNestedInput
    shareLink?: ShareLinkUncheckedUpdateOneWithoutReportNestedInput
  }

  export type ReportCreateManyInput = {
    id?: string
    auditId: string
    url: string
    domain: string
    finalScore: Decimal | DecimalJsLike | number | string
    classification: string
    totalIssues: number
    criticalIssues: number
    warnIssues: number
    passCount: number
    analysisSnapshot: JsonNullValueInput | InputJsonValue
    cwvSnapshot: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type ReportUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    finalScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    classification?: StringFieldUpdateOperationsInput | string
    totalIssues?: IntFieldUpdateOperationsInput | number
    criticalIssues?: IntFieldUpdateOperationsInput | number
    warnIssues?: IntFieldUpdateOperationsInput | number
    passCount?: IntFieldUpdateOperationsInput | number
    analysisSnapshot?: JsonNullValueInput | InputJsonValue
    cwvSnapshot?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    finalScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    classification?: StringFieldUpdateOperationsInput | string
    totalIssues?: IntFieldUpdateOperationsInput | number
    criticalIssues?: IntFieldUpdateOperationsInput | number
    warnIssues?: IntFieldUpdateOperationsInput | number
    passCount?: IntFieldUpdateOperationsInput | number
    analysisSnapshot?: JsonNullValueInput | InputJsonValue
    cwvSnapshot?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportKeywordCreateInput = {
    id?: string
    keyword: string
    frequency: number
    densityPercent: Decimal | DecimalJsLike | number | string
    inTitle: boolean
    inH1: boolean
    inFirstParagraph: boolean
    inMetaDescription: boolean
    rank: number
    isTarget?: boolean
    report: ReportCreateNestedOneWithoutKeywordsInput
  }

  export type ReportKeywordUncheckedCreateInput = {
    id?: string
    reportId: string
    keyword: string
    frequency: number
    densityPercent: Decimal | DecimalJsLike | number | string
    inTitle: boolean
    inH1: boolean
    inFirstParagraph: boolean
    inMetaDescription: boolean
    rank: number
    isTarget?: boolean
  }

  export type ReportKeywordUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    keyword?: StringFieldUpdateOperationsInput | string
    frequency?: IntFieldUpdateOperationsInput | number
    densityPercent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inTitle?: BoolFieldUpdateOperationsInput | boolean
    inH1?: BoolFieldUpdateOperationsInput | boolean
    inFirstParagraph?: BoolFieldUpdateOperationsInput | boolean
    inMetaDescription?: BoolFieldUpdateOperationsInput | boolean
    rank?: IntFieldUpdateOperationsInput | number
    isTarget?: BoolFieldUpdateOperationsInput | boolean
    report?: ReportUpdateOneRequiredWithoutKeywordsNestedInput
  }

  export type ReportKeywordUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    reportId?: StringFieldUpdateOperationsInput | string
    keyword?: StringFieldUpdateOperationsInput | string
    frequency?: IntFieldUpdateOperationsInput | number
    densityPercent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inTitle?: BoolFieldUpdateOperationsInput | boolean
    inH1?: BoolFieldUpdateOperationsInput | boolean
    inFirstParagraph?: BoolFieldUpdateOperationsInput | boolean
    inMetaDescription?: BoolFieldUpdateOperationsInput | boolean
    rank?: IntFieldUpdateOperationsInput | number
    isTarget?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ReportKeywordCreateManyInput = {
    id?: string
    reportId: string
    keyword: string
    frequency: number
    densityPercent: Decimal | DecimalJsLike | number | string
    inTitle: boolean
    inH1: boolean
    inFirstParagraph: boolean
    inMetaDescription: boolean
    rank: number
    isTarget?: boolean
  }

  export type ReportKeywordUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    keyword?: StringFieldUpdateOperationsInput | string
    frequency?: IntFieldUpdateOperationsInput | number
    densityPercent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inTitle?: BoolFieldUpdateOperationsInput | boolean
    inH1?: BoolFieldUpdateOperationsInput | boolean
    inFirstParagraph?: BoolFieldUpdateOperationsInput | boolean
    inMetaDescription?: BoolFieldUpdateOperationsInput | boolean
    rank?: IntFieldUpdateOperationsInput | number
    isTarget?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ReportKeywordUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    reportId?: StringFieldUpdateOperationsInput | string
    keyword?: StringFieldUpdateOperationsInput | string
    frequency?: IntFieldUpdateOperationsInput | number
    densityPercent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inTitle?: BoolFieldUpdateOperationsInput | boolean
    inH1?: BoolFieldUpdateOperationsInput | boolean
    inFirstParagraph?: BoolFieldUpdateOperationsInput | boolean
    inMetaDescription?: BoolFieldUpdateOperationsInput | boolean
    rank?: IntFieldUpdateOperationsInput | number
    isTarget?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ReportCwvCreateInput = {
    id?: string
    lcpMs: Decimal | DecimalJsLike | number | string
    inpMs: Decimal | DecimalJsLike | number | string
    cls: Decimal | DecimalJsLike | number | string
    performanceScore: number
    accessibilityScore: number
    bestPracticesScore: number
    lighthouseSeoScore: number
    desktopLcpMs?: Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: Decimal | DecimalJsLike | number | string | null
    desktopCls?: Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: number | null
    desktopAccessibilityScore?: number | null
    desktopBestPracticesScore?: number | null
    desktopLighthouseSeoScore?: number | null
    report: ReportCreateNestedOneWithoutCwvInput
  }

  export type ReportCwvUncheckedCreateInput = {
    id?: string
    reportId: string
    lcpMs: Decimal | DecimalJsLike | number | string
    inpMs: Decimal | DecimalJsLike | number | string
    cls: Decimal | DecimalJsLike | number | string
    performanceScore: number
    accessibilityScore: number
    bestPracticesScore: number
    lighthouseSeoScore: number
    desktopLcpMs?: Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: Decimal | DecimalJsLike | number | string | null
    desktopCls?: Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: number | null
    desktopAccessibilityScore?: number | null
    desktopBestPracticesScore?: number | null
    desktopLighthouseSeoScore?: number | null
  }

  export type ReportCwvUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    lcpMs?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inpMs?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    cls?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    performanceScore?: IntFieldUpdateOperationsInput | number
    accessibilityScore?: IntFieldUpdateOperationsInput | number
    bestPracticesScore?: IntFieldUpdateOperationsInput | number
    lighthouseSeoScore?: IntFieldUpdateOperationsInput | number
    desktopLcpMs?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopCls?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopAccessibilityScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopBestPracticesScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopLighthouseSeoScore?: NullableIntFieldUpdateOperationsInput | number | null
    report?: ReportUpdateOneRequiredWithoutCwvNestedInput
  }

  export type ReportCwvUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    reportId?: StringFieldUpdateOperationsInput | string
    lcpMs?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inpMs?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    cls?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    performanceScore?: IntFieldUpdateOperationsInput | number
    accessibilityScore?: IntFieldUpdateOperationsInput | number
    bestPracticesScore?: IntFieldUpdateOperationsInput | number
    lighthouseSeoScore?: IntFieldUpdateOperationsInput | number
    desktopLcpMs?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopCls?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopAccessibilityScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopBestPracticesScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopLighthouseSeoScore?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ReportCwvCreateManyInput = {
    id?: string
    reportId: string
    lcpMs: Decimal | DecimalJsLike | number | string
    inpMs: Decimal | DecimalJsLike | number | string
    cls: Decimal | DecimalJsLike | number | string
    performanceScore: number
    accessibilityScore: number
    bestPracticesScore: number
    lighthouseSeoScore: number
    desktopLcpMs?: Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: Decimal | DecimalJsLike | number | string | null
    desktopCls?: Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: number | null
    desktopAccessibilityScore?: number | null
    desktopBestPracticesScore?: number | null
    desktopLighthouseSeoScore?: number | null
  }

  export type ReportCwvUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    lcpMs?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inpMs?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    cls?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    performanceScore?: IntFieldUpdateOperationsInput | number
    accessibilityScore?: IntFieldUpdateOperationsInput | number
    bestPracticesScore?: IntFieldUpdateOperationsInput | number
    lighthouseSeoScore?: IntFieldUpdateOperationsInput | number
    desktopLcpMs?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopCls?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopAccessibilityScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopBestPracticesScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopLighthouseSeoScore?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ReportCwvUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    reportId?: StringFieldUpdateOperationsInput | string
    lcpMs?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inpMs?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    cls?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    performanceScore?: IntFieldUpdateOperationsInput | number
    accessibilityScore?: IntFieldUpdateOperationsInput | number
    bestPracticesScore?: IntFieldUpdateOperationsInput | number
    lighthouseSeoScore?: IntFieldUpdateOperationsInput | number
    desktopLcpMs?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopCls?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopAccessibilityScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopBestPracticesScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopLighthouseSeoScore?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ShareLinkCreateInput = {
    id?: string
    auditId: string
    token: string
    isActive?: boolean
    accessedCount?: number
    lastAccessedAt?: Date | string | null
    createdAt?: Date | string
    report: ReportCreateNestedOneWithoutShareLinkInput
  }

  export type ShareLinkUncheckedCreateInput = {
    id?: string
    reportId: string
    auditId: string
    token: string
    isActive?: boolean
    accessedCount?: number
    lastAccessedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type ShareLinkUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    accessedCount?: IntFieldUpdateOperationsInput | number
    lastAccessedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    report?: ReportUpdateOneRequiredWithoutShareLinkNestedInput
  }

  export type ShareLinkUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    reportId?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    accessedCount?: IntFieldUpdateOperationsInput | number
    lastAccessedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShareLinkCreateManyInput = {
    id?: string
    reportId: string
    auditId: string
    token: string
    isActive?: boolean
    accessedCount?: number
    lastAccessedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type ShareLinkUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    accessedCount?: IntFieldUpdateOperationsInput | number
    lastAccessedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShareLinkUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    reportId?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    accessedCount?: IntFieldUpdateOperationsInput | number
    lastAccessedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }
  export type JsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type ReportKeywordListRelationFilter = {
    every?: ReportKeywordWhereInput
    some?: ReportKeywordWhereInput
    none?: ReportKeywordWhereInput
  }

  export type ReportCwvNullableRelationFilter = {
    is?: ReportCwvWhereInput | null
    isNot?: ReportCwvWhereInput | null
  }

  export type ShareLinkNullableRelationFilter = {
    is?: ShareLinkWhereInput | null
    isNot?: ShareLinkWhereInput | null
  }

  export type ReportKeywordOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ReportCountOrderByAggregateInput = {
    id?: SortOrder
    auditId?: SortOrder
    url?: SortOrder
    domain?: SortOrder
    finalScore?: SortOrder
    classification?: SortOrder
    totalIssues?: SortOrder
    criticalIssues?: SortOrder
    warnIssues?: SortOrder
    passCount?: SortOrder
    analysisSnapshot?: SortOrder
    cwvSnapshot?: SortOrder
    createdAt?: SortOrder
  }

  export type ReportAvgOrderByAggregateInput = {
    finalScore?: SortOrder
    totalIssues?: SortOrder
    criticalIssues?: SortOrder
    warnIssues?: SortOrder
    passCount?: SortOrder
  }

  export type ReportMaxOrderByAggregateInput = {
    id?: SortOrder
    auditId?: SortOrder
    url?: SortOrder
    domain?: SortOrder
    finalScore?: SortOrder
    classification?: SortOrder
    totalIssues?: SortOrder
    criticalIssues?: SortOrder
    warnIssues?: SortOrder
    passCount?: SortOrder
    createdAt?: SortOrder
  }

  export type ReportMinOrderByAggregateInput = {
    id?: SortOrder
    auditId?: SortOrder
    url?: SortOrder
    domain?: SortOrder
    finalScore?: SortOrder
    classification?: SortOrder
    totalIssues?: SortOrder
    criticalIssues?: SortOrder
    warnIssues?: SortOrder
    passCount?: SortOrder
    createdAt?: SortOrder
  }

  export type ReportSumOrderByAggregateInput = {
    finalScore?: SortOrder
    totalIssues?: SortOrder
    criticalIssues?: SortOrder
    warnIssues?: SortOrder
    passCount?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type ReportRelationFilter = {
    is?: ReportWhereInput
    isNot?: ReportWhereInput
  }

  export type ReportKeywordCountOrderByAggregateInput = {
    id?: SortOrder
    reportId?: SortOrder
    keyword?: SortOrder
    frequency?: SortOrder
    densityPercent?: SortOrder
    inTitle?: SortOrder
    inH1?: SortOrder
    inFirstParagraph?: SortOrder
    inMetaDescription?: SortOrder
    rank?: SortOrder
    isTarget?: SortOrder
  }

  export type ReportKeywordAvgOrderByAggregateInput = {
    frequency?: SortOrder
    densityPercent?: SortOrder
    rank?: SortOrder
  }

  export type ReportKeywordMaxOrderByAggregateInput = {
    id?: SortOrder
    reportId?: SortOrder
    keyword?: SortOrder
    frequency?: SortOrder
    densityPercent?: SortOrder
    inTitle?: SortOrder
    inH1?: SortOrder
    inFirstParagraph?: SortOrder
    inMetaDescription?: SortOrder
    rank?: SortOrder
    isTarget?: SortOrder
  }

  export type ReportKeywordMinOrderByAggregateInput = {
    id?: SortOrder
    reportId?: SortOrder
    keyword?: SortOrder
    frequency?: SortOrder
    densityPercent?: SortOrder
    inTitle?: SortOrder
    inH1?: SortOrder
    inFirstParagraph?: SortOrder
    inMetaDescription?: SortOrder
    rank?: SortOrder
    isTarget?: SortOrder
  }

  export type ReportKeywordSumOrderByAggregateInput = {
    frequency?: SortOrder
    densityPercent?: SortOrder
    rank?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ReportCwvCountOrderByAggregateInput = {
    id?: SortOrder
    reportId?: SortOrder
    lcpMs?: SortOrder
    inpMs?: SortOrder
    cls?: SortOrder
    performanceScore?: SortOrder
    accessibilityScore?: SortOrder
    bestPracticesScore?: SortOrder
    lighthouseSeoScore?: SortOrder
    desktopLcpMs?: SortOrder
    desktopInpMs?: SortOrder
    desktopCls?: SortOrder
    desktopPerformanceScore?: SortOrder
    desktopAccessibilityScore?: SortOrder
    desktopBestPracticesScore?: SortOrder
    desktopLighthouseSeoScore?: SortOrder
  }

  export type ReportCwvAvgOrderByAggregateInput = {
    lcpMs?: SortOrder
    inpMs?: SortOrder
    cls?: SortOrder
    performanceScore?: SortOrder
    accessibilityScore?: SortOrder
    bestPracticesScore?: SortOrder
    lighthouseSeoScore?: SortOrder
    desktopLcpMs?: SortOrder
    desktopInpMs?: SortOrder
    desktopCls?: SortOrder
    desktopPerformanceScore?: SortOrder
    desktopAccessibilityScore?: SortOrder
    desktopBestPracticesScore?: SortOrder
    desktopLighthouseSeoScore?: SortOrder
  }

  export type ReportCwvMaxOrderByAggregateInput = {
    id?: SortOrder
    reportId?: SortOrder
    lcpMs?: SortOrder
    inpMs?: SortOrder
    cls?: SortOrder
    performanceScore?: SortOrder
    accessibilityScore?: SortOrder
    bestPracticesScore?: SortOrder
    lighthouseSeoScore?: SortOrder
    desktopLcpMs?: SortOrder
    desktopInpMs?: SortOrder
    desktopCls?: SortOrder
    desktopPerformanceScore?: SortOrder
    desktopAccessibilityScore?: SortOrder
    desktopBestPracticesScore?: SortOrder
    desktopLighthouseSeoScore?: SortOrder
  }

  export type ReportCwvMinOrderByAggregateInput = {
    id?: SortOrder
    reportId?: SortOrder
    lcpMs?: SortOrder
    inpMs?: SortOrder
    cls?: SortOrder
    performanceScore?: SortOrder
    accessibilityScore?: SortOrder
    bestPracticesScore?: SortOrder
    lighthouseSeoScore?: SortOrder
    desktopLcpMs?: SortOrder
    desktopInpMs?: SortOrder
    desktopCls?: SortOrder
    desktopPerformanceScore?: SortOrder
    desktopAccessibilityScore?: SortOrder
    desktopBestPracticesScore?: SortOrder
    desktopLighthouseSeoScore?: SortOrder
  }

  export type ReportCwvSumOrderByAggregateInput = {
    lcpMs?: SortOrder
    inpMs?: SortOrder
    cls?: SortOrder
    performanceScore?: SortOrder
    accessibilityScore?: SortOrder
    bestPracticesScore?: SortOrder
    lighthouseSeoScore?: SortOrder
    desktopLcpMs?: SortOrder
    desktopInpMs?: SortOrder
    desktopCls?: SortOrder
    desktopPerformanceScore?: SortOrder
    desktopAccessibilityScore?: SortOrder
    desktopBestPracticesScore?: SortOrder
    desktopLighthouseSeoScore?: SortOrder
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type ShareLinkCountOrderByAggregateInput = {
    id?: SortOrder
    reportId?: SortOrder
    auditId?: SortOrder
    token?: SortOrder
    isActive?: SortOrder
    accessedCount?: SortOrder
    lastAccessedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type ShareLinkAvgOrderByAggregateInput = {
    accessedCount?: SortOrder
  }

  export type ShareLinkMaxOrderByAggregateInput = {
    id?: SortOrder
    reportId?: SortOrder
    auditId?: SortOrder
    token?: SortOrder
    isActive?: SortOrder
    accessedCount?: SortOrder
    lastAccessedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type ShareLinkMinOrderByAggregateInput = {
    id?: SortOrder
    reportId?: SortOrder
    auditId?: SortOrder
    token?: SortOrder
    isActive?: SortOrder
    accessedCount?: SortOrder
    lastAccessedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type ShareLinkSumOrderByAggregateInput = {
    accessedCount?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type ReportKeywordCreateNestedManyWithoutReportInput = {
    create?: XOR<ReportKeywordCreateWithoutReportInput, ReportKeywordUncheckedCreateWithoutReportInput> | ReportKeywordCreateWithoutReportInput[] | ReportKeywordUncheckedCreateWithoutReportInput[]
    connectOrCreate?: ReportKeywordCreateOrConnectWithoutReportInput | ReportKeywordCreateOrConnectWithoutReportInput[]
    createMany?: ReportKeywordCreateManyReportInputEnvelope
    connect?: ReportKeywordWhereUniqueInput | ReportKeywordWhereUniqueInput[]
  }

  export type ReportCwvCreateNestedOneWithoutReportInput = {
    create?: XOR<ReportCwvCreateWithoutReportInput, ReportCwvUncheckedCreateWithoutReportInput>
    connectOrCreate?: ReportCwvCreateOrConnectWithoutReportInput
    connect?: ReportCwvWhereUniqueInput
  }

  export type ShareLinkCreateNestedOneWithoutReportInput = {
    create?: XOR<ShareLinkCreateWithoutReportInput, ShareLinkUncheckedCreateWithoutReportInput>
    connectOrCreate?: ShareLinkCreateOrConnectWithoutReportInput
    connect?: ShareLinkWhereUniqueInput
  }

  export type ReportKeywordUncheckedCreateNestedManyWithoutReportInput = {
    create?: XOR<ReportKeywordCreateWithoutReportInput, ReportKeywordUncheckedCreateWithoutReportInput> | ReportKeywordCreateWithoutReportInput[] | ReportKeywordUncheckedCreateWithoutReportInput[]
    connectOrCreate?: ReportKeywordCreateOrConnectWithoutReportInput | ReportKeywordCreateOrConnectWithoutReportInput[]
    createMany?: ReportKeywordCreateManyReportInputEnvelope
    connect?: ReportKeywordWhereUniqueInput | ReportKeywordWhereUniqueInput[]
  }

  export type ReportCwvUncheckedCreateNestedOneWithoutReportInput = {
    create?: XOR<ReportCwvCreateWithoutReportInput, ReportCwvUncheckedCreateWithoutReportInput>
    connectOrCreate?: ReportCwvCreateOrConnectWithoutReportInput
    connect?: ReportCwvWhereUniqueInput
  }

  export type ShareLinkUncheckedCreateNestedOneWithoutReportInput = {
    create?: XOR<ShareLinkCreateWithoutReportInput, ShareLinkUncheckedCreateWithoutReportInput>
    connectOrCreate?: ShareLinkCreateOrConnectWithoutReportInput
    connect?: ShareLinkWhereUniqueInput
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type ReportKeywordUpdateManyWithoutReportNestedInput = {
    create?: XOR<ReportKeywordCreateWithoutReportInput, ReportKeywordUncheckedCreateWithoutReportInput> | ReportKeywordCreateWithoutReportInput[] | ReportKeywordUncheckedCreateWithoutReportInput[]
    connectOrCreate?: ReportKeywordCreateOrConnectWithoutReportInput | ReportKeywordCreateOrConnectWithoutReportInput[]
    upsert?: ReportKeywordUpsertWithWhereUniqueWithoutReportInput | ReportKeywordUpsertWithWhereUniqueWithoutReportInput[]
    createMany?: ReportKeywordCreateManyReportInputEnvelope
    set?: ReportKeywordWhereUniqueInput | ReportKeywordWhereUniqueInput[]
    disconnect?: ReportKeywordWhereUniqueInput | ReportKeywordWhereUniqueInput[]
    delete?: ReportKeywordWhereUniqueInput | ReportKeywordWhereUniqueInput[]
    connect?: ReportKeywordWhereUniqueInput | ReportKeywordWhereUniqueInput[]
    update?: ReportKeywordUpdateWithWhereUniqueWithoutReportInput | ReportKeywordUpdateWithWhereUniqueWithoutReportInput[]
    updateMany?: ReportKeywordUpdateManyWithWhereWithoutReportInput | ReportKeywordUpdateManyWithWhereWithoutReportInput[]
    deleteMany?: ReportKeywordScalarWhereInput | ReportKeywordScalarWhereInput[]
  }

  export type ReportCwvUpdateOneWithoutReportNestedInput = {
    create?: XOR<ReportCwvCreateWithoutReportInput, ReportCwvUncheckedCreateWithoutReportInput>
    connectOrCreate?: ReportCwvCreateOrConnectWithoutReportInput
    upsert?: ReportCwvUpsertWithoutReportInput
    disconnect?: ReportCwvWhereInput | boolean
    delete?: ReportCwvWhereInput | boolean
    connect?: ReportCwvWhereUniqueInput
    update?: XOR<XOR<ReportCwvUpdateToOneWithWhereWithoutReportInput, ReportCwvUpdateWithoutReportInput>, ReportCwvUncheckedUpdateWithoutReportInput>
  }

  export type ShareLinkUpdateOneWithoutReportNestedInput = {
    create?: XOR<ShareLinkCreateWithoutReportInput, ShareLinkUncheckedCreateWithoutReportInput>
    connectOrCreate?: ShareLinkCreateOrConnectWithoutReportInput
    upsert?: ShareLinkUpsertWithoutReportInput
    disconnect?: ShareLinkWhereInput | boolean
    delete?: ShareLinkWhereInput | boolean
    connect?: ShareLinkWhereUniqueInput
    update?: XOR<XOR<ShareLinkUpdateToOneWithWhereWithoutReportInput, ShareLinkUpdateWithoutReportInput>, ShareLinkUncheckedUpdateWithoutReportInput>
  }

  export type ReportKeywordUncheckedUpdateManyWithoutReportNestedInput = {
    create?: XOR<ReportKeywordCreateWithoutReportInput, ReportKeywordUncheckedCreateWithoutReportInput> | ReportKeywordCreateWithoutReportInput[] | ReportKeywordUncheckedCreateWithoutReportInput[]
    connectOrCreate?: ReportKeywordCreateOrConnectWithoutReportInput | ReportKeywordCreateOrConnectWithoutReportInput[]
    upsert?: ReportKeywordUpsertWithWhereUniqueWithoutReportInput | ReportKeywordUpsertWithWhereUniqueWithoutReportInput[]
    createMany?: ReportKeywordCreateManyReportInputEnvelope
    set?: ReportKeywordWhereUniqueInput | ReportKeywordWhereUniqueInput[]
    disconnect?: ReportKeywordWhereUniqueInput | ReportKeywordWhereUniqueInput[]
    delete?: ReportKeywordWhereUniqueInput | ReportKeywordWhereUniqueInput[]
    connect?: ReportKeywordWhereUniqueInput | ReportKeywordWhereUniqueInput[]
    update?: ReportKeywordUpdateWithWhereUniqueWithoutReportInput | ReportKeywordUpdateWithWhereUniqueWithoutReportInput[]
    updateMany?: ReportKeywordUpdateManyWithWhereWithoutReportInput | ReportKeywordUpdateManyWithWhereWithoutReportInput[]
    deleteMany?: ReportKeywordScalarWhereInput | ReportKeywordScalarWhereInput[]
  }

  export type ReportCwvUncheckedUpdateOneWithoutReportNestedInput = {
    create?: XOR<ReportCwvCreateWithoutReportInput, ReportCwvUncheckedCreateWithoutReportInput>
    connectOrCreate?: ReportCwvCreateOrConnectWithoutReportInput
    upsert?: ReportCwvUpsertWithoutReportInput
    disconnect?: ReportCwvWhereInput | boolean
    delete?: ReportCwvWhereInput | boolean
    connect?: ReportCwvWhereUniqueInput
    update?: XOR<XOR<ReportCwvUpdateToOneWithWhereWithoutReportInput, ReportCwvUpdateWithoutReportInput>, ReportCwvUncheckedUpdateWithoutReportInput>
  }

  export type ShareLinkUncheckedUpdateOneWithoutReportNestedInput = {
    create?: XOR<ShareLinkCreateWithoutReportInput, ShareLinkUncheckedCreateWithoutReportInput>
    connectOrCreate?: ShareLinkCreateOrConnectWithoutReportInput
    upsert?: ShareLinkUpsertWithoutReportInput
    disconnect?: ShareLinkWhereInput | boolean
    delete?: ShareLinkWhereInput | boolean
    connect?: ShareLinkWhereUniqueInput
    update?: XOR<XOR<ShareLinkUpdateToOneWithWhereWithoutReportInput, ShareLinkUpdateWithoutReportInput>, ShareLinkUncheckedUpdateWithoutReportInput>
  }

  export type ReportCreateNestedOneWithoutKeywordsInput = {
    create?: XOR<ReportCreateWithoutKeywordsInput, ReportUncheckedCreateWithoutKeywordsInput>
    connectOrCreate?: ReportCreateOrConnectWithoutKeywordsInput
    connect?: ReportWhereUniqueInput
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type ReportUpdateOneRequiredWithoutKeywordsNestedInput = {
    create?: XOR<ReportCreateWithoutKeywordsInput, ReportUncheckedCreateWithoutKeywordsInput>
    connectOrCreate?: ReportCreateOrConnectWithoutKeywordsInput
    upsert?: ReportUpsertWithoutKeywordsInput
    connect?: ReportWhereUniqueInput
    update?: XOR<XOR<ReportUpdateToOneWithWhereWithoutKeywordsInput, ReportUpdateWithoutKeywordsInput>, ReportUncheckedUpdateWithoutKeywordsInput>
  }

  export type ReportCreateNestedOneWithoutCwvInput = {
    create?: XOR<ReportCreateWithoutCwvInput, ReportUncheckedCreateWithoutCwvInput>
    connectOrCreate?: ReportCreateOrConnectWithoutCwvInput
    connect?: ReportWhereUniqueInput
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ReportUpdateOneRequiredWithoutCwvNestedInput = {
    create?: XOR<ReportCreateWithoutCwvInput, ReportUncheckedCreateWithoutCwvInput>
    connectOrCreate?: ReportCreateOrConnectWithoutCwvInput
    upsert?: ReportUpsertWithoutCwvInput
    connect?: ReportWhereUniqueInput
    update?: XOR<XOR<ReportUpdateToOneWithWhereWithoutCwvInput, ReportUpdateWithoutCwvInput>, ReportUncheckedUpdateWithoutCwvInput>
  }

  export type ReportCreateNestedOneWithoutShareLinkInput = {
    create?: XOR<ReportCreateWithoutShareLinkInput, ReportUncheckedCreateWithoutShareLinkInput>
    connectOrCreate?: ReportCreateOrConnectWithoutShareLinkInput
    connect?: ReportWhereUniqueInput
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type ReportUpdateOneRequiredWithoutShareLinkNestedInput = {
    create?: XOR<ReportCreateWithoutShareLinkInput, ReportUncheckedCreateWithoutShareLinkInput>
    connectOrCreate?: ReportCreateOrConnectWithoutShareLinkInput
    upsert?: ReportUpsertWithoutShareLinkInput
    connect?: ReportWhereUniqueInput
    update?: XOR<XOR<ReportUpdateToOneWithWhereWithoutShareLinkInput, ReportUpdateWithoutShareLinkInput>, ReportUncheckedUpdateWithoutShareLinkInput>
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedDecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }
  export type NestedJsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type ReportKeywordCreateWithoutReportInput = {
    id?: string
    keyword: string
    frequency: number
    densityPercent: Decimal | DecimalJsLike | number | string
    inTitle: boolean
    inH1: boolean
    inFirstParagraph: boolean
    inMetaDescription: boolean
    rank: number
    isTarget?: boolean
  }

  export type ReportKeywordUncheckedCreateWithoutReportInput = {
    id?: string
    keyword: string
    frequency: number
    densityPercent: Decimal | DecimalJsLike | number | string
    inTitle: boolean
    inH1: boolean
    inFirstParagraph: boolean
    inMetaDescription: boolean
    rank: number
    isTarget?: boolean
  }

  export type ReportKeywordCreateOrConnectWithoutReportInput = {
    where: ReportKeywordWhereUniqueInput
    create: XOR<ReportKeywordCreateWithoutReportInput, ReportKeywordUncheckedCreateWithoutReportInput>
  }

  export type ReportKeywordCreateManyReportInputEnvelope = {
    data: ReportKeywordCreateManyReportInput | ReportKeywordCreateManyReportInput[]
    skipDuplicates?: boolean
  }

  export type ReportCwvCreateWithoutReportInput = {
    id?: string
    lcpMs: Decimal | DecimalJsLike | number | string
    inpMs: Decimal | DecimalJsLike | number | string
    cls: Decimal | DecimalJsLike | number | string
    performanceScore: number
    accessibilityScore: number
    bestPracticesScore: number
    lighthouseSeoScore: number
    desktopLcpMs?: Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: Decimal | DecimalJsLike | number | string | null
    desktopCls?: Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: number | null
    desktopAccessibilityScore?: number | null
    desktopBestPracticesScore?: number | null
    desktopLighthouseSeoScore?: number | null
  }

  export type ReportCwvUncheckedCreateWithoutReportInput = {
    id?: string
    lcpMs: Decimal | DecimalJsLike | number | string
    inpMs: Decimal | DecimalJsLike | number | string
    cls: Decimal | DecimalJsLike | number | string
    performanceScore: number
    accessibilityScore: number
    bestPracticesScore: number
    lighthouseSeoScore: number
    desktopLcpMs?: Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: Decimal | DecimalJsLike | number | string | null
    desktopCls?: Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: number | null
    desktopAccessibilityScore?: number | null
    desktopBestPracticesScore?: number | null
    desktopLighthouseSeoScore?: number | null
  }

  export type ReportCwvCreateOrConnectWithoutReportInput = {
    where: ReportCwvWhereUniqueInput
    create: XOR<ReportCwvCreateWithoutReportInput, ReportCwvUncheckedCreateWithoutReportInput>
  }

  export type ShareLinkCreateWithoutReportInput = {
    id?: string
    auditId: string
    token: string
    isActive?: boolean
    accessedCount?: number
    lastAccessedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type ShareLinkUncheckedCreateWithoutReportInput = {
    id?: string
    auditId: string
    token: string
    isActive?: boolean
    accessedCount?: number
    lastAccessedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type ShareLinkCreateOrConnectWithoutReportInput = {
    where: ShareLinkWhereUniqueInput
    create: XOR<ShareLinkCreateWithoutReportInput, ShareLinkUncheckedCreateWithoutReportInput>
  }

  export type ReportKeywordUpsertWithWhereUniqueWithoutReportInput = {
    where: ReportKeywordWhereUniqueInput
    update: XOR<ReportKeywordUpdateWithoutReportInput, ReportKeywordUncheckedUpdateWithoutReportInput>
    create: XOR<ReportKeywordCreateWithoutReportInput, ReportKeywordUncheckedCreateWithoutReportInput>
  }

  export type ReportKeywordUpdateWithWhereUniqueWithoutReportInput = {
    where: ReportKeywordWhereUniqueInput
    data: XOR<ReportKeywordUpdateWithoutReportInput, ReportKeywordUncheckedUpdateWithoutReportInput>
  }

  export type ReportKeywordUpdateManyWithWhereWithoutReportInput = {
    where: ReportKeywordScalarWhereInput
    data: XOR<ReportKeywordUpdateManyMutationInput, ReportKeywordUncheckedUpdateManyWithoutReportInput>
  }

  export type ReportKeywordScalarWhereInput = {
    AND?: ReportKeywordScalarWhereInput | ReportKeywordScalarWhereInput[]
    OR?: ReportKeywordScalarWhereInput[]
    NOT?: ReportKeywordScalarWhereInput | ReportKeywordScalarWhereInput[]
    id?: UuidFilter<"ReportKeyword"> | string
    reportId?: UuidFilter<"ReportKeyword"> | string
    keyword?: StringFilter<"ReportKeyword"> | string
    frequency?: IntFilter<"ReportKeyword"> | number
    densityPercent?: DecimalFilter<"ReportKeyword"> | Decimal | DecimalJsLike | number | string
    inTitle?: BoolFilter<"ReportKeyword"> | boolean
    inH1?: BoolFilter<"ReportKeyword"> | boolean
    inFirstParagraph?: BoolFilter<"ReportKeyword"> | boolean
    inMetaDescription?: BoolFilter<"ReportKeyword"> | boolean
    rank?: IntFilter<"ReportKeyword"> | number
    isTarget?: BoolFilter<"ReportKeyword"> | boolean
  }

  export type ReportCwvUpsertWithoutReportInput = {
    update: XOR<ReportCwvUpdateWithoutReportInput, ReportCwvUncheckedUpdateWithoutReportInput>
    create: XOR<ReportCwvCreateWithoutReportInput, ReportCwvUncheckedCreateWithoutReportInput>
    where?: ReportCwvWhereInput
  }

  export type ReportCwvUpdateToOneWithWhereWithoutReportInput = {
    where?: ReportCwvWhereInput
    data: XOR<ReportCwvUpdateWithoutReportInput, ReportCwvUncheckedUpdateWithoutReportInput>
  }

  export type ReportCwvUpdateWithoutReportInput = {
    id?: StringFieldUpdateOperationsInput | string
    lcpMs?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inpMs?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    cls?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    performanceScore?: IntFieldUpdateOperationsInput | number
    accessibilityScore?: IntFieldUpdateOperationsInput | number
    bestPracticesScore?: IntFieldUpdateOperationsInput | number
    lighthouseSeoScore?: IntFieldUpdateOperationsInput | number
    desktopLcpMs?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopCls?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopAccessibilityScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopBestPracticesScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopLighthouseSeoScore?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ReportCwvUncheckedUpdateWithoutReportInput = {
    id?: StringFieldUpdateOperationsInput | string
    lcpMs?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inpMs?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    cls?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    performanceScore?: IntFieldUpdateOperationsInput | number
    accessibilityScore?: IntFieldUpdateOperationsInput | number
    bestPracticesScore?: IntFieldUpdateOperationsInput | number
    lighthouseSeoScore?: IntFieldUpdateOperationsInput | number
    desktopLcpMs?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopInpMs?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopCls?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    desktopPerformanceScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopAccessibilityScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopBestPracticesScore?: NullableIntFieldUpdateOperationsInput | number | null
    desktopLighthouseSeoScore?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ShareLinkUpsertWithoutReportInput = {
    update: XOR<ShareLinkUpdateWithoutReportInput, ShareLinkUncheckedUpdateWithoutReportInput>
    create: XOR<ShareLinkCreateWithoutReportInput, ShareLinkUncheckedCreateWithoutReportInput>
    where?: ShareLinkWhereInput
  }

  export type ShareLinkUpdateToOneWithWhereWithoutReportInput = {
    where?: ShareLinkWhereInput
    data: XOR<ShareLinkUpdateWithoutReportInput, ShareLinkUncheckedUpdateWithoutReportInput>
  }

  export type ShareLinkUpdateWithoutReportInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    accessedCount?: IntFieldUpdateOperationsInput | number
    lastAccessedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ShareLinkUncheckedUpdateWithoutReportInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    accessedCount?: IntFieldUpdateOperationsInput | number
    lastAccessedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportCreateWithoutKeywordsInput = {
    id?: string
    auditId: string
    url: string
    domain: string
    finalScore: Decimal | DecimalJsLike | number | string
    classification: string
    totalIssues: number
    criticalIssues: number
    warnIssues: number
    passCount: number
    analysisSnapshot: JsonNullValueInput | InputJsonValue
    cwvSnapshot: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    cwv?: ReportCwvCreateNestedOneWithoutReportInput
    shareLink?: ShareLinkCreateNestedOneWithoutReportInput
  }

  export type ReportUncheckedCreateWithoutKeywordsInput = {
    id?: string
    auditId: string
    url: string
    domain: string
    finalScore: Decimal | DecimalJsLike | number | string
    classification: string
    totalIssues: number
    criticalIssues: number
    warnIssues: number
    passCount: number
    analysisSnapshot: JsonNullValueInput | InputJsonValue
    cwvSnapshot: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    cwv?: ReportCwvUncheckedCreateNestedOneWithoutReportInput
    shareLink?: ShareLinkUncheckedCreateNestedOneWithoutReportInput
  }

  export type ReportCreateOrConnectWithoutKeywordsInput = {
    where: ReportWhereUniqueInput
    create: XOR<ReportCreateWithoutKeywordsInput, ReportUncheckedCreateWithoutKeywordsInput>
  }

  export type ReportUpsertWithoutKeywordsInput = {
    update: XOR<ReportUpdateWithoutKeywordsInput, ReportUncheckedUpdateWithoutKeywordsInput>
    create: XOR<ReportCreateWithoutKeywordsInput, ReportUncheckedCreateWithoutKeywordsInput>
    where?: ReportWhereInput
  }

  export type ReportUpdateToOneWithWhereWithoutKeywordsInput = {
    where?: ReportWhereInput
    data: XOR<ReportUpdateWithoutKeywordsInput, ReportUncheckedUpdateWithoutKeywordsInput>
  }

  export type ReportUpdateWithoutKeywordsInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    finalScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    classification?: StringFieldUpdateOperationsInput | string
    totalIssues?: IntFieldUpdateOperationsInput | number
    criticalIssues?: IntFieldUpdateOperationsInput | number
    warnIssues?: IntFieldUpdateOperationsInput | number
    passCount?: IntFieldUpdateOperationsInput | number
    analysisSnapshot?: JsonNullValueInput | InputJsonValue
    cwvSnapshot?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cwv?: ReportCwvUpdateOneWithoutReportNestedInput
    shareLink?: ShareLinkUpdateOneWithoutReportNestedInput
  }

  export type ReportUncheckedUpdateWithoutKeywordsInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    finalScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    classification?: StringFieldUpdateOperationsInput | string
    totalIssues?: IntFieldUpdateOperationsInput | number
    criticalIssues?: IntFieldUpdateOperationsInput | number
    warnIssues?: IntFieldUpdateOperationsInput | number
    passCount?: IntFieldUpdateOperationsInput | number
    analysisSnapshot?: JsonNullValueInput | InputJsonValue
    cwvSnapshot?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cwv?: ReportCwvUncheckedUpdateOneWithoutReportNestedInput
    shareLink?: ShareLinkUncheckedUpdateOneWithoutReportNestedInput
  }

  export type ReportCreateWithoutCwvInput = {
    id?: string
    auditId: string
    url: string
    domain: string
    finalScore: Decimal | DecimalJsLike | number | string
    classification: string
    totalIssues: number
    criticalIssues: number
    warnIssues: number
    passCount: number
    analysisSnapshot: JsonNullValueInput | InputJsonValue
    cwvSnapshot: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    keywords?: ReportKeywordCreateNestedManyWithoutReportInput
    shareLink?: ShareLinkCreateNestedOneWithoutReportInput
  }

  export type ReportUncheckedCreateWithoutCwvInput = {
    id?: string
    auditId: string
    url: string
    domain: string
    finalScore: Decimal | DecimalJsLike | number | string
    classification: string
    totalIssues: number
    criticalIssues: number
    warnIssues: number
    passCount: number
    analysisSnapshot: JsonNullValueInput | InputJsonValue
    cwvSnapshot: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    keywords?: ReportKeywordUncheckedCreateNestedManyWithoutReportInput
    shareLink?: ShareLinkUncheckedCreateNestedOneWithoutReportInput
  }

  export type ReportCreateOrConnectWithoutCwvInput = {
    where: ReportWhereUniqueInput
    create: XOR<ReportCreateWithoutCwvInput, ReportUncheckedCreateWithoutCwvInput>
  }

  export type ReportUpsertWithoutCwvInput = {
    update: XOR<ReportUpdateWithoutCwvInput, ReportUncheckedUpdateWithoutCwvInput>
    create: XOR<ReportCreateWithoutCwvInput, ReportUncheckedCreateWithoutCwvInput>
    where?: ReportWhereInput
  }

  export type ReportUpdateToOneWithWhereWithoutCwvInput = {
    where?: ReportWhereInput
    data: XOR<ReportUpdateWithoutCwvInput, ReportUncheckedUpdateWithoutCwvInput>
  }

  export type ReportUpdateWithoutCwvInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    finalScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    classification?: StringFieldUpdateOperationsInput | string
    totalIssues?: IntFieldUpdateOperationsInput | number
    criticalIssues?: IntFieldUpdateOperationsInput | number
    warnIssues?: IntFieldUpdateOperationsInput | number
    passCount?: IntFieldUpdateOperationsInput | number
    analysisSnapshot?: JsonNullValueInput | InputJsonValue
    cwvSnapshot?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    keywords?: ReportKeywordUpdateManyWithoutReportNestedInput
    shareLink?: ShareLinkUpdateOneWithoutReportNestedInput
  }

  export type ReportUncheckedUpdateWithoutCwvInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    finalScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    classification?: StringFieldUpdateOperationsInput | string
    totalIssues?: IntFieldUpdateOperationsInput | number
    criticalIssues?: IntFieldUpdateOperationsInput | number
    warnIssues?: IntFieldUpdateOperationsInput | number
    passCount?: IntFieldUpdateOperationsInput | number
    analysisSnapshot?: JsonNullValueInput | InputJsonValue
    cwvSnapshot?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    keywords?: ReportKeywordUncheckedUpdateManyWithoutReportNestedInput
    shareLink?: ShareLinkUncheckedUpdateOneWithoutReportNestedInput
  }

  export type ReportCreateWithoutShareLinkInput = {
    id?: string
    auditId: string
    url: string
    domain: string
    finalScore: Decimal | DecimalJsLike | number | string
    classification: string
    totalIssues: number
    criticalIssues: number
    warnIssues: number
    passCount: number
    analysisSnapshot: JsonNullValueInput | InputJsonValue
    cwvSnapshot: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    keywords?: ReportKeywordCreateNestedManyWithoutReportInput
    cwv?: ReportCwvCreateNestedOneWithoutReportInput
  }

  export type ReportUncheckedCreateWithoutShareLinkInput = {
    id?: string
    auditId: string
    url: string
    domain: string
    finalScore: Decimal | DecimalJsLike | number | string
    classification: string
    totalIssues: number
    criticalIssues: number
    warnIssues: number
    passCount: number
    analysisSnapshot: JsonNullValueInput | InputJsonValue
    cwvSnapshot: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    keywords?: ReportKeywordUncheckedCreateNestedManyWithoutReportInput
    cwv?: ReportCwvUncheckedCreateNestedOneWithoutReportInput
  }

  export type ReportCreateOrConnectWithoutShareLinkInput = {
    where: ReportWhereUniqueInput
    create: XOR<ReportCreateWithoutShareLinkInput, ReportUncheckedCreateWithoutShareLinkInput>
  }

  export type ReportUpsertWithoutShareLinkInput = {
    update: XOR<ReportUpdateWithoutShareLinkInput, ReportUncheckedUpdateWithoutShareLinkInput>
    create: XOR<ReportCreateWithoutShareLinkInput, ReportUncheckedCreateWithoutShareLinkInput>
    where?: ReportWhereInput
  }

  export type ReportUpdateToOneWithWhereWithoutShareLinkInput = {
    where?: ReportWhereInput
    data: XOR<ReportUpdateWithoutShareLinkInput, ReportUncheckedUpdateWithoutShareLinkInput>
  }

  export type ReportUpdateWithoutShareLinkInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    finalScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    classification?: StringFieldUpdateOperationsInput | string
    totalIssues?: IntFieldUpdateOperationsInput | number
    criticalIssues?: IntFieldUpdateOperationsInput | number
    warnIssues?: IntFieldUpdateOperationsInput | number
    passCount?: IntFieldUpdateOperationsInput | number
    analysisSnapshot?: JsonNullValueInput | InputJsonValue
    cwvSnapshot?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    keywords?: ReportKeywordUpdateManyWithoutReportNestedInput
    cwv?: ReportCwvUpdateOneWithoutReportNestedInput
  }

  export type ReportUncheckedUpdateWithoutShareLinkInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    finalScore?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    classification?: StringFieldUpdateOperationsInput | string
    totalIssues?: IntFieldUpdateOperationsInput | number
    criticalIssues?: IntFieldUpdateOperationsInput | number
    warnIssues?: IntFieldUpdateOperationsInput | number
    passCount?: IntFieldUpdateOperationsInput | number
    analysisSnapshot?: JsonNullValueInput | InputJsonValue
    cwvSnapshot?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    keywords?: ReportKeywordUncheckedUpdateManyWithoutReportNestedInput
    cwv?: ReportCwvUncheckedUpdateOneWithoutReportNestedInput
  }

  export type ReportKeywordCreateManyReportInput = {
    id?: string
    keyword: string
    frequency: number
    densityPercent: Decimal | DecimalJsLike | number | string
    inTitle: boolean
    inH1: boolean
    inFirstParagraph: boolean
    inMetaDescription: boolean
    rank: number
    isTarget?: boolean
  }

  export type ReportKeywordUpdateWithoutReportInput = {
    id?: StringFieldUpdateOperationsInput | string
    keyword?: StringFieldUpdateOperationsInput | string
    frequency?: IntFieldUpdateOperationsInput | number
    densityPercent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inTitle?: BoolFieldUpdateOperationsInput | boolean
    inH1?: BoolFieldUpdateOperationsInput | boolean
    inFirstParagraph?: BoolFieldUpdateOperationsInput | boolean
    inMetaDescription?: BoolFieldUpdateOperationsInput | boolean
    rank?: IntFieldUpdateOperationsInput | number
    isTarget?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ReportKeywordUncheckedUpdateWithoutReportInput = {
    id?: StringFieldUpdateOperationsInput | string
    keyword?: StringFieldUpdateOperationsInput | string
    frequency?: IntFieldUpdateOperationsInput | number
    densityPercent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inTitle?: BoolFieldUpdateOperationsInput | boolean
    inH1?: BoolFieldUpdateOperationsInput | boolean
    inFirstParagraph?: BoolFieldUpdateOperationsInput | boolean
    inMetaDescription?: BoolFieldUpdateOperationsInput | boolean
    rank?: IntFieldUpdateOperationsInput | number
    isTarget?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ReportKeywordUncheckedUpdateManyWithoutReportInput = {
    id?: StringFieldUpdateOperationsInput | string
    keyword?: StringFieldUpdateOperationsInput | string
    frequency?: IntFieldUpdateOperationsInput | number
    densityPercent?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inTitle?: BoolFieldUpdateOperationsInput | boolean
    inH1?: BoolFieldUpdateOperationsInput | boolean
    inFirstParagraph?: BoolFieldUpdateOperationsInput | boolean
    inMetaDescription?: BoolFieldUpdateOperationsInput | boolean
    rank?: IntFieldUpdateOperationsInput | number
    isTarget?: BoolFieldUpdateOperationsInput | boolean
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use ReportCountOutputTypeDefaultArgs instead
     */
    export type ReportCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ReportCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ReportDefaultArgs instead
     */
    export type ReportArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ReportDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ReportKeywordDefaultArgs instead
     */
    export type ReportKeywordArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ReportKeywordDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ReportCwvDefaultArgs instead
     */
    export type ReportCwvArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ReportCwvDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ShareLinkDefaultArgs instead
     */
    export type ShareLinkArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ShareLinkDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}