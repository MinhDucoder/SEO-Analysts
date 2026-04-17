
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
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model RefreshToken
 * 
 */
export type RefreshToken = $Result.DefaultSelection<Prisma.$RefreshTokenPayload>
/**
 * Model Audit
 * 
 */
export type Audit = $Result.DefaultSelection<Prisma.$AuditPayload>
/**
 * Model PageAudit
 * One row per URL crawled inside a SITE-mode audit. For SINGLE-mode
 * audits this table stays empty; the Audit row itself holds the score.
 */
export type PageAudit = $Result.DefaultSelection<Prisma.$PageAuditPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const UserRole: {
  user: 'user',
  admin: 'admin'
};

export type UserRole = (typeof UserRole)[keyof typeof UserRole]


export const AuditStatus: {
  pending: 'pending',
  crawling: 'crawling',
  analyzing: 'analyzing',
  reporting: 'reporting',
  completed: 'completed',
  failed: 'failed'
};

export type AuditStatus = (typeof AuditStatus)[keyof typeof AuditStatus]


export const AuditMode: {
  single: 'single',
  site: 'site'
};

export type AuditMode = (typeof AuditMode)[keyof typeof AuditMode]

}

export type UserRole = $Enums.UserRole

export const UserRole: typeof $Enums.UserRole

export type AuditStatus = $Enums.AuditStatus

export const AuditStatus: typeof $Enums.AuditStatus

export type AuditMode = $Enums.AuditMode

export const AuditMode: typeof $Enums.AuditMode

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
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
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
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
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs>;

  /**
   * `prisma.refreshToken`: Exposes CRUD operations for the **RefreshToken** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RefreshTokens
    * const refreshTokens = await prisma.refreshToken.findMany()
    * ```
    */
  get refreshToken(): Prisma.RefreshTokenDelegate<ExtArgs>;

  /**
   * `prisma.audit`: Exposes CRUD operations for the **Audit** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Audits
    * const audits = await prisma.audit.findMany()
    * ```
    */
  get audit(): Prisma.AuditDelegate<ExtArgs>;

  /**
   * `prisma.pageAudit`: Exposes CRUD operations for the **PageAudit** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PageAudits
    * const pageAudits = await prisma.pageAudit.findMany()
    * ```
    */
  get pageAudit(): Prisma.PageAuditDelegate<ExtArgs>;
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
    User: 'User',
    RefreshToken: 'RefreshToken',
    Audit: 'Audit',
    PageAudit: 'PageAudit'
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
      modelProps: "user" | "refreshToken" | "audit" | "pageAudit"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      RefreshToken: {
        payload: Prisma.$RefreshTokenPayload<ExtArgs>
        fields: Prisma.RefreshTokenFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RefreshTokenFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RefreshTokenFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>
          }
          findFirst: {
            args: Prisma.RefreshTokenFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RefreshTokenFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>
          }
          findMany: {
            args: Prisma.RefreshTokenFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>[]
          }
          create: {
            args: Prisma.RefreshTokenCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>
          }
          createMany: {
            args: Prisma.RefreshTokenCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RefreshTokenCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>[]
          }
          delete: {
            args: Prisma.RefreshTokenDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>
          }
          update: {
            args: Prisma.RefreshTokenUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>
          }
          deleteMany: {
            args: Prisma.RefreshTokenDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RefreshTokenUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.RefreshTokenUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RefreshTokenPayload>
          }
          aggregate: {
            args: Prisma.RefreshTokenAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRefreshToken>
          }
          groupBy: {
            args: Prisma.RefreshTokenGroupByArgs<ExtArgs>
            result: $Utils.Optional<RefreshTokenGroupByOutputType>[]
          }
          count: {
            args: Prisma.RefreshTokenCountArgs<ExtArgs>
            result: $Utils.Optional<RefreshTokenCountAggregateOutputType> | number
          }
        }
      }
      Audit: {
        payload: Prisma.$AuditPayload<ExtArgs>
        fields: Prisma.AuditFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuditFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuditFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditPayload>
          }
          findFirst: {
            args: Prisma.AuditFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuditFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditPayload>
          }
          findMany: {
            args: Prisma.AuditFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditPayload>[]
          }
          create: {
            args: Prisma.AuditCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditPayload>
          }
          createMany: {
            args: Prisma.AuditCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuditCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditPayload>[]
          }
          delete: {
            args: Prisma.AuditDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditPayload>
          }
          update: {
            args: Prisma.AuditUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditPayload>
          }
          deleteMany: {
            args: Prisma.AuditDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuditUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.AuditUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditPayload>
          }
          aggregate: {
            args: Prisma.AuditAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAudit>
          }
          groupBy: {
            args: Prisma.AuditGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuditGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuditCountArgs<ExtArgs>
            result: $Utils.Optional<AuditCountAggregateOutputType> | number
          }
        }
      }
      PageAudit: {
        payload: Prisma.$PageAuditPayload<ExtArgs>
        fields: Prisma.PageAuditFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PageAuditFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageAuditPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PageAuditFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageAuditPayload>
          }
          findFirst: {
            args: Prisma.PageAuditFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageAuditPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PageAuditFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageAuditPayload>
          }
          findMany: {
            args: Prisma.PageAuditFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageAuditPayload>[]
          }
          create: {
            args: Prisma.PageAuditCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageAuditPayload>
          }
          createMany: {
            args: Prisma.PageAuditCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PageAuditCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageAuditPayload>[]
          }
          delete: {
            args: Prisma.PageAuditDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageAuditPayload>
          }
          update: {
            args: Prisma.PageAuditUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageAuditPayload>
          }
          deleteMany: {
            args: Prisma.PageAuditDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PageAuditUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.PageAuditUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PageAuditPayload>
          }
          aggregate: {
            args: Prisma.PageAuditAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePageAudit>
          }
          groupBy: {
            args: Prisma.PageAuditGroupByArgs<ExtArgs>
            result: $Utils.Optional<PageAuditGroupByOutputType>[]
          }
          count: {
            args: Prisma.PageAuditCountArgs<ExtArgs>
            result: $Utils.Optional<PageAuditCountAggregateOutputType> | number
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
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    refreshTokens: number
    audits: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    refreshTokens?: boolean | UserCountOutputTypeCountRefreshTokensArgs
    audits?: boolean | UserCountOutputTypeCountAuditsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountRefreshTokensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RefreshTokenWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAuditsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditWhereInput
  }


  /**
   * Count Type AuditCountOutputType
   */

  export type AuditCountOutputType = {
    pageAudits: number
  }

  export type AuditCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pageAudits?: boolean | AuditCountOutputTypeCountPageAuditsArgs
  }

  // Custom InputTypes
  /**
   * AuditCountOutputType without action
   */
  export type AuditCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditCountOutputType
     */
    select?: AuditCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AuditCountOutputType without action
   */
  export type AuditCountOutputTypeCountPageAuditsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PageAuditWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    passwordHash: string | null
    fullName: string | null
    role: $Enums.UserRole | null
    isVerified: boolean | null
    isLocked: boolean | null
    oauthProvider: string | null
    avatarUrl: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    passwordHash: string | null
    fullName: string | null
    role: $Enums.UserRole | null
    isVerified: boolean | null
    isLocked: boolean | null
    oauthProvider: string | null
    avatarUrl: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    passwordHash: number
    fullName: number
    role: number
    isVerified: number
    isLocked: number
    oauthProvider: number
    avatarUrl: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    fullName?: true
    role?: true
    isVerified?: true
    isLocked?: true
    oauthProvider?: true
    avatarUrl?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    fullName?: true
    role?: true
    isVerified?: true
    isLocked?: true
    oauthProvider?: true
    avatarUrl?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    fullName?: true
    role?: true
    isVerified?: true
    isLocked?: true
    oauthProvider?: true
    avatarUrl?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string
    passwordHash: string | null
    fullName: string
    role: $Enums.UserRole
    isVerified: boolean
    isLocked: boolean
    oauthProvider: string | null
    avatarUrl: string | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    fullName?: boolean
    role?: boolean
    isVerified?: boolean
    isLocked?: boolean
    oauthProvider?: boolean
    avatarUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    refreshTokens?: boolean | User$refreshTokensArgs<ExtArgs>
    audits?: boolean | User$auditsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    fullName?: boolean
    role?: boolean
    isVerified?: boolean
    isLocked?: boolean
    oauthProvider?: boolean
    avatarUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    fullName?: boolean
    role?: boolean
    isVerified?: boolean
    isLocked?: boolean
    oauthProvider?: boolean
    avatarUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    refreshTokens?: boolean | User$refreshTokensArgs<ExtArgs>
    audits?: boolean | User$auditsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      refreshTokens: Prisma.$RefreshTokenPayload<ExtArgs>[]
      audits: Prisma.$AuditPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string
      passwordHash: string | null
      fullName: string
      role: $Enums.UserRole
      isVerified: boolean
      isLocked: boolean
      oauthProvider: string | null
      avatarUrl: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
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
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    refreshTokens<T extends User$refreshTokensArgs<ExtArgs> = {}>(args?: Subset<T, User$refreshTokensArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "findMany"> | Null>
    audits<T extends User$auditsArgs<ExtArgs> = {}>(args?: Subset<T, User$auditsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditPayload<ExtArgs>, T, "findMany"> | Null>
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
   * Fields of the User model
   */ 
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly passwordHash: FieldRef<"User", 'String'>
    readonly fullName: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'UserRole'>
    readonly isVerified: FieldRef<"User", 'Boolean'>
    readonly isLocked: FieldRef<"User", 'Boolean'>
    readonly oauthProvider: FieldRef<"User", 'String'>
    readonly avatarUrl: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
  }

  /**
   * User.refreshTokens
   */
  export type User$refreshTokensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    where?: RefreshTokenWhereInput
    orderBy?: RefreshTokenOrderByWithRelationInput | RefreshTokenOrderByWithRelationInput[]
    cursor?: RefreshTokenWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RefreshTokenScalarFieldEnum | RefreshTokenScalarFieldEnum[]
  }

  /**
   * User.audits
   */
  export type User$auditsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Audit
     */
    select?: AuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditInclude<ExtArgs> | null
    where?: AuditWhereInput
    orderBy?: AuditOrderByWithRelationInput | AuditOrderByWithRelationInput[]
    cursor?: AuditWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AuditScalarFieldEnum | AuditScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model RefreshToken
   */

  export type AggregateRefreshToken = {
    _count: RefreshTokenCountAggregateOutputType | null
    _min: RefreshTokenMinAggregateOutputType | null
    _max: RefreshTokenMaxAggregateOutputType | null
  }

  export type RefreshTokenMinAggregateOutputType = {
    id: string | null
    userId: string | null
    tokenHash: string | null
    userAgent: string | null
    ipAddress: string | null
    expiresAt: Date | null
    isRevoked: boolean | null
    createdAt: Date | null
  }

  export type RefreshTokenMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    tokenHash: string | null
    userAgent: string | null
    ipAddress: string | null
    expiresAt: Date | null
    isRevoked: boolean | null
    createdAt: Date | null
  }

  export type RefreshTokenCountAggregateOutputType = {
    id: number
    userId: number
    tokenHash: number
    userAgent: number
    ipAddress: number
    expiresAt: number
    isRevoked: number
    createdAt: number
    _all: number
  }


  export type RefreshTokenMinAggregateInputType = {
    id?: true
    userId?: true
    tokenHash?: true
    userAgent?: true
    ipAddress?: true
    expiresAt?: true
    isRevoked?: true
    createdAt?: true
  }

  export type RefreshTokenMaxAggregateInputType = {
    id?: true
    userId?: true
    tokenHash?: true
    userAgent?: true
    ipAddress?: true
    expiresAt?: true
    isRevoked?: true
    createdAt?: true
  }

  export type RefreshTokenCountAggregateInputType = {
    id?: true
    userId?: true
    tokenHash?: true
    userAgent?: true
    ipAddress?: true
    expiresAt?: true
    isRevoked?: true
    createdAt?: true
    _all?: true
  }

  export type RefreshTokenAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RefreshToken to aggregate.
     */
    where?: RefreshTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RefreshTokens to fetch.
     */
    orderBy?: RefreshTokenOrderByWithRelationInput | RefreshTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RefreshTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RefreshTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RefreshTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RefreshTokens
    **/
    _count?: true | RefreshTokenCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RefreshTokenMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RefreshTokenMaxAggregateInputType
  }

  export type GetRefreshTokenAggregateType<T extends RefreshTokenAggregateArgs> = {
        [P in keyof T & keyof AggregateRefreshToken]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRefreshToken[P]>
      : GetScalarType<T[P], AggregateRefreshToken[P]>
  }




  export type RefreshTokenGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RefreshTokenWhereInput
    orderBy?: RefreshTokenOrderByWithAggregationInput | RefreshTokenOrderByWithAggregationInput[]
    by: RefreshTokenScalarFieldEnum[] | RefreshTokenScalarFieldEnum
    having?: RefreshTokenScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RefreshTokenCountAggregateInputType | true
    _min?: RefreshTokenMinAggregateInputType
    _max?: RefreshTokenMaxAggregateInputType
  }

  export type RefreshTokenGroupByOutputType = {
    id: string
    userId: string
    tokenHash: string
    userAgent: string | null
    ipAddress: string | null
    expiresAt: Date
    isRevoked: boolean
    createdAt: Date
    _count: RefreshTokenCountAggregateOutputType | null
    _min: RefreshTokenMinAggregateOutputType | null
    _max: RefreshTokenMaxAggregateOutputType | null
  }

  type GetRefreshTokenGroupByPayload<T extends RefreshTokenGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RefreshTokenGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RefreshTokenGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RefreshTokenGroupByOutputType[P]>
            : GetScalarType<T[P], RefreshTokenGroupByOutputType[P]>
        }
      >
    >


  export type RefreshTokenSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    tokenHash?: boolean
    userAgent?: boolean
    ipAddress?: boolean
    expiresAt?: boolean
    isRevoked?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["refreshToken"]>

  export type RefreshTokenSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    tokenHash?: boolean
    userAgent?: boolean
    ipAddress?: boolean
    expiresAt?: boolean
    isRevoked?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["refreshToken"]>

  export type RefreshTokenSelectScalar = {
    id?: boolean
    userId?: boolean
    tokenHash?: boolean
    userAgent?: boolean
    ipAddress?: boolean
    expiresAt?: boolean
    isRevoked?: boolean
    createdAt?: boolean
  }

  export type RefreshTokenInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type RefreshTokenIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $RefreshTokenPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RefreshToken"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      tokenHash: string
      userAgent: string | null
      ipAddress: string | null
      expiresAt: Date
      isRevoked: boolean
      createdAt: Date
    }, ExtArgs["result"]["refreshToken"]>
    composites: {}
  }

  type RefreshTokenGetPayload<S extends boolean | null | undefined | RefreshTokenDefaultArgs> = $Result.GetResult<Prisma.$RefreshTokenPayload, S>

  type RefreshTokenCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<RefreshTokenFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: RefreshTokenCountAggregateInputType | true
    }

  export interface RefreshTokenDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RefreshToken'], meta: { name: 'RefreshToken' } }
    /**
     * Find zero or one RefreshToken that matches the filter.
     * @param {RefreshTokenFindUniqueArgs} args - Arguments to find a RefreshToken
     * @example
     * // Get one RefreshToken
     * const refreshToken = await prisma.refreshToken.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RefreshTokenFindUniqueArgs>(args: SelectSubset<T, RefreshTokenFindUniqueArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one RefreshToken that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {RefreshTokenFindUniqueOrThrowArgs} args - Arguments to find a RefreshToken
     * @example
     * // Get one RefreshToken
     * const refreshToken = await prisma.refreshToken.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RefreshTokenFindUniqueOrThrowArgs>(args: SelectSubset<T, RefreshTokenFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first RefreshToken that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenFindFirstArgs} args - Arguments to find a RefreshToken
     * @example
     * // Get one RefreshToken
     * const refreshToken = await prisma.refreshToken.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RefreshTokenFindFirstArgs>(args?: SelectSubset<T, RefreshTokenFindFirstArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first RefreshToken that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenFindFirstOrThrowArgs} args - Arguments to find a RefreshToken
     * @example
     * // Get one RefreshToken
     * const refreshToken = await prisma.refreshToken.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RefreshTokenFindFirstOrThrowArgs>(args?: SelectSubset<T, RefreshTokenFindFirstOrThrowArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more RefreshTokens that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RefreshTokens
     * const refreshTokens = await prisma.refreshToken.findMany()
     * 
     * // Get first 10 RefreshTokens
     * const refreshTokens = await prisma.refreshToken.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const refreshTokenWithIdOnly = await prisma.refreshToken.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RefreshTokenFindManyArgs>(args?: SelectSubset<T, RefreshTokenFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a RefreshToken.
     * @param {RefreshTokenCreateArgs} args - Arguments to create a RefreshToken.
     * @example
     * // Create one RefreshToken
     * const RefreshToken = await prisma.refreshToken.create({
     *   data: {
     *     // ... data to create a RefreshToken
     *   }
     * })
     * 
     */
    create<T extends RefreshTokenCreateArgs>(args: SelectSubset<T, RefreshTokenCreateArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many RefreshTokens.
     * @param {RefreshTokenCreateManyArgs} args - Arguments to create many RefreshTokens.
     * @example
     * // Create many RefreshTokens
     * const refreshToken = await prisma.refreshToken.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RefreshTokenCreateManyArgs>(args?: SelectSubset<T, RefreshTokenCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RefreshTokens and returns the data saved in the database.
     * @param {RefreshTokenCreateManyAndReturnArgs} args - Arguments to create many RefreshTokens.
     * @example
     * // Create many RefreshTokens
     * const refreshToken = await prisma.refreshToken.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RefreshTokens and only return the `id`
     * const refreshTokenWithIdOnly = await prisma.refreshToken.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RefreshTokenCreateManyAndReturnArgs>(args?: SelectSubset<T, RefreshTokenCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a RefreshToken.
     * @param {RefreshTokenDeleteArgs} args - Arguments to delete one RefreshToken.
     * @example
     * // Delete one RefreshToken
     * const RefreshToken = await prisma.refreshToken.delete({
     *   where: {
     *     // ... filter to delete one RefreshToken
     *   }
     * })
     * 
     */
    delete<T extends RefreshTokenDeleteArgs>(args: SelectSubset<T, RefreshTokenDeleteArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one RefreshToken.
     * @param {RefreshTokenUpdateArgs} args - Arguments to update one RefreshToken.
     * @example
     * // Update one RefreshToken
     * const refreshToken = await prisma.refreshToken.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RefreshTokenUpdateArgs>(args: SelectSubset<T, RefreshTokenUpdateArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more RefreshTokens.
     * @param {RefreshTokenDeleteManyArgs} args - Arguments to filter RefreshTokens to delete.
     * @example
     * // Delete a few RefreshTokens
     * const { count } = await prisma.refreshToken.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RefreshTokenDeleteManyArgs>(args?: SelectSubset<T, RefreshTokenDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RefreshTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RefreshTokens
     * const refreshToken = await prisma.refreshToken.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RefreshTokenUpdateManyArgs>(args: SelectSubset<T, RefreshTokenUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one RefreshToken.
     * @param {RefreshTokenUpsertArgs} args - Arguments to update or create a RefreshToken.
     * @example
     * // Update or create a RefreshToken
     * const refreshToken = await prisma.refreshToken.upsert({
     *   create: {
     *     // ... data to create a RefreshToken
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RefreshToken we want to update
     *   }
     * })
     */
    upsert<T extends RefreshTokenUpsertArgs>(args: SelectSubset<T, RefreshTokenUpsertArgs<ExtArgs>>): Prisma__RefreshTokenClient<$Result.GetResult<Prisma.$RefreshTokenPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of RefreshTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenCountArgs} args - Arguments to filter RefreshTokens to count.
     * @example
     * // Count the number of RefreshTokens
     * const count = await prisma.refreshToken.count({
     *   where: {
     *     // ... the filter for the RefreshTokens we want to count
     *   }
     * })
    **/
    count<T extends RefreshTokenCountArgs>(
      args?: Subset<T, RefreshTokenCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RefreshTokenCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RefreshToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends RefreshTokenAggregateArgs>(args: Subset<T, RefreshTokenAggregateArgs>): Prisma.PrismaPromise<GetRefreshTokenAggregateType<T>>

    /**
     * Group by RefreshToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RefreshTokenGroupByArgs} args - Group by arguments.
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
      T extends RefreshTokenGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RefreshTokenGroupByArgs['orderBy'] }
        : { orderBy?: RefreshTokenGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, RefreshTokenGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRefreshTokenGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RefreshToken model
   */
  readonly fields: RefreshTokenFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RefreshToken.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RefreshTokenClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
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
   * Fields of the RefreshToken model
   */ 
  interface RefreshTokenFieldRefs {
    readonly id: FieldRef<"RefreshToken", 'String'>
    readonly userId: FieldRef<"RefreshToken", 'String'>
    readonly tokenHash: FieldRef<"RefreshToken", 'String'>
    readonly userAgent: FieldRef<"RefreshToken", 'String'>
    readonly ipAddress: FieldRef<"RefreshToken", 'String'>
    readonly expiresAt: FieldRef<"RefreshToken", 'DateTime'>
    readonly isRevoked: FieldRef<"RefreshToken", 'Boolean'>
    readonly createdAt: FieldRef<"RefreshToken", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RefreshToken findUnique
   */
  export type RefreshTokenFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * Filter, which RefreshToken to fetch.
     */
    where: RefreshTokenWhereUniqueInput
  }

  /**
   * RefreshToken findUniqueOrThrow
   */
  export type RefreshTokenFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * Filter, which RefreshToken to fetch.
     */
    where: RefreshTokenWhereUniqueInput
  }

  /**
   * RefreshToken findFirst
   */
  export type RefreshTokenFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * Filter, which RefreshToken to fetch.
     */
    where?: RefreshTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RefreshTokens to fetch.
     */
    orderBy?: RefreshTokenOrderByWithRelationInput | RefreshTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RefreshTokens.
     */
    cursor?: RefreshTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RefreshTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RefreshTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RefreshTokens.
     */
    distinct?: RefreshTokenScalarFieldEnum | RefreshTokenScalarFieldEnum[]
  }

  /**
   * RefreshToken findFirstOrThrow
   */
  export type RefreshTokenFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * Filter, which RefreshToken to fetch.
     */
    where?: RefreshTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RefreshTokens to fetch.
     */
    orderBy?: RefreshTokenOrderByWithRelationInput | RefreshTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RefreshTokens.
     */
    cursor?: RefreshTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RefreshTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RefreshTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RefreshTokens.
     */
    distinct?: RefreshTokenScalarFieldEnum | RefreshTokenScalarFieldEnum[]
  }

  /**
   * RefreshToken findMany
   */
  export type RefreshTokenFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * Filter, which RefreshTokens to fetch.
     */
    where?: RefreshTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RefreshTokens to fetch.
     */
    orderBy?: RefreshTokenOrderByWithRelationInput | RefreshTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RefreshTokens.
     */
    cursor?: RefreshTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RefreshTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RefreshTokens.
     */
    skip?: number
    distinct?: RefreshTokenScalarFieldEnum | RefreshTokenScalarFieldEnum[]
  }

  /**
   * RefreshToken create
   */
  export type RefreshTokenCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * The data needed to create a RefreshToken.
     */
    data: XOR<RefreshTokenCreateInput, RefreshTokenUncheckedCreateInput>
  }

  /**
   * RefreshToken createMany
   */
  export type RefreshTokenCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RefreshTokens.
     */
    data: RefreshTokenCreateManyInput | RefreshTokenCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RefreshToken createManyAndReturn
   */
  export type RefreshTokenCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many RefreshTokens.
     */
    data: RefreshTokenCreateManyInput | RefreshTokenCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * RefreshToken update
   */
  export type RefreshTokenUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * The data needed to update a RefreshToken.
     */
    data: XOR<RefreshTokenUpdateInput, RefreshTokenUncheckedUpdateInput>
    /**
     * Choose, which RefreshToken to update.
     */
    where: RefreshTokenWhereUniqueInput
  }

  /**
   * RefreshToken updateMany
   */
  export type RefreshTokenUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RefreshTokens.
     */
    data: XOR<RefreshTokenUpdateManyMutationInput, RefreshTokenUncheckedUpdateManyInput>
    /**
     * Filter which RefreshTokens to update
     */
    where?: RefreshTokenWhereInput
  }

  /**
   * RefreshToken upsert
   */
  export type RefreshTokenUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * The filter to search for the RefreshToken to update in case it exists.
     */
    where: RefreshTokenWhereUniqueInput
    /**
     * In case the RefreshToken found by the `where` argument doesn't exist, create a new RefreshToken with this data.
     */
    create: XOR<RefreshTokenCreateInput, RefreshTokenUncheckedCreateInput>
    /**
     * In case the RefreshToken was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RefreshTokenUpdateInput, RefreshTokenUncheckedUpdateInput>
  }

  /**
   * RefreshToken delete
   */
  export type RefreshTokenDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
    /**
     * Filter which RefreshToken to delete.
     */
    where: RefreshTokenWhereUniqueInput
  }

  /**
   * RefreshToken deleteMany
   */
  export type RefreshTokenDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RefreshTokens to delete
     */
    where?: RefreshTokenWhereInput
  }

  /**
   * RefreshToken without action
   */
  export type RefreshTokenDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RefreshToken
     */
    select?: RefreshTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RefreshTokenInclude<ExtArgs> | null
  }


  /**
   * Model Audit
   */

  export type AggregateAudit = {
    _count: AuditCountAggregateOutputType | null
    _avg: AuditAvgAggregateOutputType | null
    _sum: AuditSumAggregateOutputType | null
    _min: AuditMinAggregateOutputType | null
    _max: AuditMaxAggregateOutputType | null
  }

  export type AuditAvgAggregateOutputType = {
    seoScore: Decimal | null
    crawlDurationMs: number | null
    discoveredUrlsCount: number | null
    auditedUrlsCount: number | null
  }

  export type AuditSumAggregateOutputType = {
    seoScore: Decimal | null
    crawlDurationMs: number | null
    discoveredUrlsCount: number | null
    auditedUrlsCount: number | null
  }

  export type AuditMinAggregateOutputType = {
    id: string | null
    userId: string | null
    url: string | null
    domain: string | null
    status: $Enums.AuditStatus | null
    mode: $Enums.AuditMode | null
    seoScore: Decimal | null
    targetKeyword: string | null
    errorMessage: string | null
    crawlerType: string | null
    crawlDurationMs: number | null
    discoveredUrlsCount: number | null
    auditedUrlsCount: number | null
    completedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AuditMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    url: string | null
    domain: string | null
    status: $Enums.AuditStatus | null
    mode: $Enums.AuditMode | null
    seoScore: Decimal | null
    targetKeyword: string | null
    errorMessage: string | null
    crawlerType: string | null
    crawlDurationMs: number | null
    discoveredUrlsCount: number | null
    auditedUrlsCount: number | null
    completedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AuditCountAggregateOutputType = {
    id: number
    userId: number
    url: number
    domain: number
    status: number
    mode: number
    seoScore: number
    targetKeyword: number
    errorMessage: number
    crawlerType: number
    crawlDurationMs: number
    discoveredUrlsCount: number
    auditedUrlsCount: number
    completedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AuditAvgAggregateInputType = {
    seoScore?: true
    crawlDurationMs?: true
    discoveredUrlsCount?: true
    auditedUrlsCount?: true
  }

  export type AuditSumAggregateInputType = {
    seoScore?: true
    crawlDurationMs?: true
    discoveredUrlsCount?: true
    auditedUrlsCount?: true
  }

  export type AuditMinAggregateInputType = {
    id?: true
    userId?: true
    url?: true
    domain?: true
    status?: true
    mode?: true
    seoScore?: true
    targetKeyword?: true
    errorMessage?: true
    crawlerType?: true
    crawlDurationMs?: true
    discoveredUrlsCount?: true
    auditedUrlsCount?: true
    completedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AuditMaxAggregateInputType = {
    id?: true
    userId?: true
    url?: true
    domain?: true
    status?: true
    mode?: true
    seoScore?: true
    targetKeyword?: true
    errorMessage?: true
    crawlerType?: true
    crawlDurationMs?: true
    discoveredUrlsCount?: true
    auditedUrlsCount?: true
    completedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AuditCountAggregateInputType = {
    id?: true
    userId?: true
    url?: true
    domain?: true
    status?: true
    mode?: true
    seoScore?: true
    targetKeyword?: true
    errorMessage?: true
    crawlerType?: true
    crawlDurationMs?: true
    discoveredUrlsCount?: true
    auditedUrlsCount?: true
    completedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AuditAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Audit to aggregate.
     */
    where?: AuditWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Audits to fetch.
     */
    orderBy?: AuditOrderByWithRelationInput | AuditOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuditWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Audits from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Audits.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Audits
    **/
    _count?: true | AuditCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AuditAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AuditSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuditMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuditMaxAggregateInputType
  }

  export type GetAuditAggregateType<T extends AuditAggregateArgs> = {
        [P in keyof T & keyof AggregateAudit]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAudit[P]>
      : GetScalarType<T[P], AggregateAudit[P]>
  }




  export type AuditGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditWhereInput
    orderBy?: AuditOrderByWithAggregationInput | AuditOrderByWithAggregationInput[]
    by: AuditScalarFieldEnum[] | AuditScalarFieldEnum
    having?: AuditScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuditCountAggregateInputType | true
    _avg?: AuditAvgAggregateInputType
    _sum?: AuditSumAggregateInputType
    _min?: AuditMinAggregateInputType
    _max?: AuditMaxAggregateInputType
  }

  export type AuditGroupByOutputType = {
    id: string
    userId: string
    url: string
    domain: string
    status: $Enums.AuditStatus
    mode: $Enums.AuditMode
    seoScore: Decimal | null
    targetKeyword: string | null
    errorMessage: string | null
    crawlerType: string | null
    crawlDurationMs: number | null
    discoveredUrlsCount: number | null
    auditedUrlsCount: number | null
    completedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: AuditCountAggregateOutputType | null
    _avg: AuditAvgAggregateOutputType | null
    _sum: AuditSumAggregateOutputType | null
    _min: AuditMinAggregateOutputType | null
    _max: AuditMaxAggregateOutputType | null
  }

  type GetAuditGroupByPayload<T extends AuditGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuditGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuditGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuditGroupByOutputType[P]>
            : GetScalarType<T[P], AuditGroupByOutputType[P]>
        }
      >
    >


  export type AuditSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    url?: boolean
    domain?: boolean
    status?: boolean
    mode?: boolean
    seoScore?: boolean
    targetKeyword?: boolean
    errorMessage?: boolean
    crawlerType?: boolean
    crawlDurationMs?: boolean
    discoveredUrlsCount?: boolean
    auditedUrlsCount?: boolean
    completedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    pageAudits?: boolean | Audit$pageAuditsArgs<ExtArgs>
    _count?: boolean | AuditCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["audit"]>

  export type AuditSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    url?: boolean
    domain?: boolean
    status?: boolean
    mode?: boolean
    seoScore?: boolean
    targetKeyword?: boolean
    errorMessage?: boolean
    crawlerType?: boolean
    crawlDurationMs?: boolean
    discoveredUrlsCount?: boolean
    auditedUrlsCount?: boolean
    completedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["audit"]>

  export type AuditSelectScalar = {
    id?: boolean
    userId?: boolean
    url?: boolean
    domain?: boolean
    status?: boolean
    mode?: boolean
    seoScore?: boolean
    targetKeyword?: boolean
    errorMessage?: boolean
    crawlerType?: boolean
    crawlDurationMs?: boolean
    discoveredUrlsCount?: boolean
    auditedUrlsCount?: boolean
    completedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AuditInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    pageAudits?: boolean | Audit$pageAuditsArgs<ExtArgs>
    _count?: boolean | AuditCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AuditIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $AuditPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Audit"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      pageAudits: Prisma.$PageAuditPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      url: string
      domain: string
      status: $Enums.AuditStatus
      mode: $Enums.AuditMode
      seoScore: Prisma.Decimal | null
      targetKeyword: string | null
      errorMessage: string | null
      crawlerType: string | null
      crawlDurationMs: number | null
      discoveredUrlsCount: number | null
      auditedUrlsCount: number | null
      completedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["audit"]>
    composites: {}
  }

  type AuditGetPayload<S extends boolean | null | undefined | AuditDefaultArgs> = $Result.GetResult<Prisma.$AuditPayload, S>

  type AuditCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AuditFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AuditCountAggregateInputType | true
    }

  export interface AuditDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Audit'], meta: { name: 'Audit' } }
    /**
     * Find zero or one Audit that matches the filter.
     * @param {AuditFindUniqueArgs} args - Arguments to find a Audit
     * @example
     * // Get one Audit
     * const audit = await prisma.audit.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuditFindUniqueArgs>(args: SelectSubset<T, AuditFindUniqueArgs<ExtArgs>>): Prisma__AuditClient<$Result.GetResult<Prisma.$AuditPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Audit that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {AuditFindUniqueOrThrowArgs} args - Arguments to find a Audit
     * @example
     * // Get one Audit
     * const audit = await prisma.audit.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuditFindUniqueOrThrowArgs>(args: SelectSubset<T, AuditFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuditClient<$Result.GetResult<Prisma.$AuditPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Audit that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditFindFirstArgs} args - Arguments to find a Audit
     * @example
     * // Get one Audit
     * const audit = await prisma.audit.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuditFindFirstArgs>(args?: SelectSubset<T, AuditFindFirstArgs<ExtArgs>>): Prisma__AuditClient<$Result.GetResult<Prisma.$AuditPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Audit that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditFindFirstOrThrowArgs} args - Arguments to find a Audit
     * @example
     * // Get one Audit
     * const audit = await prisma.audit.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuditFindFirstOrThrowArgs>(args?: SelectSubset<T, AuditFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuditClient<$Result.GetResult<Prisma.$AuditPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Audits that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Audits
     * const audits = await prisma.audit.findMany()
     * 
     * // Get first 10 Audits
     * const audits = await prisma.audit.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const auditWithIdOnly = await prisma.audit.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AuditFindManyArgs>(args?: SelectSubset<T, AuditFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Audit.
     * @param {AuditCreateArgs} args - Arguments to create a Audit.
     * @example
     * // Create one Audit
     * const Audit = await prisma.audit.create({
     *   data: {
     *     // ... data to create a Audit
     *   }
     * })
     * 
     */
    create<T extends AuditCreateArgs>(args: SelectSubset<T, AuditCreateArgs<ExtArgs>>): Prisma__AuditClient<$Result.GetResult<Prisma.$AuditPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Audits.
     * @param {AuditCreateManyArgs} args - Arguments to create many Audits.
     * @example
     * // Create many Audits
     * const audit = await prisma.audit.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuditCreateManyArgs>(args?: SelectSubset<T, AuditCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Audits and returns the data saved in the database.
     * @param {AuditCreateManyAndReturnArgs} args - Arguments to create many Audits.
     * @example
     * // Create many Audits
     * const audit = await prisma.audit.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Audits and only return the `id`
     * const auditWithIdOnly = await prisma.audit.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuditCreateManyAndReturnArgs>(args?: SelectSubset<T, AuditCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Audit.
     * @param {AuditDeleteArgs} args - Arguments to delete one Audit.
     * @example
     * // Delete one Audit
     * const Audit = await prisma.audit.delete({
     *   where: {
     *     // ... filter to delete one Audit
     *   }
     * })
     * 
     */
    delete<T extends AuditDeleteArgs>(args: SelectSubset<T, AuditDeleteArgs<ExtArgs>>): Prisma__AuditClient<$Result.GetResult<Prisma.$AuditPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Audit.
     * @param {AuditUpdateArgs} args - Arguments to update one Audit.
     * @example
     * // Update one Audit
     * const audit = await prisma.audit.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuditUpdateArgs>(args: SelectSubset<T, AuditUpdateArgs<ExtArgs>>): Prisma__AuditClient<$Result.GetResult<Prisma.$AuditPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Audits.
     * @param {AuditDeleteManyArgs} args - Arguments to filter Audits to delete.
     * @example
     * // Delete a few Audits
     * const { count } = await prisma.audit.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuditDeleteManyArgs>(args?: SelectSubset<T, AuditDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Audits.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Audits
     * const audit = await prisma.audit.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuditUpdateManyArgs>(args: SelectSubset<T, AuditUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Audit.
     * @param {AuditUpsertArgs} args - Arguments to update or create a Audit.
     * @example
     * // Update or create a Audit
     * const audit = await prisma.audit.upsert({
     *   create: {
     *     // ... data to create a Audit
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Audit we want to update
     *   }
     * })
     */
    upsert<T extends AuditUpsertArgs>(args: SelectSubset<T, AuditUpsertArgs<ExtArgs>>): Prisma__AuditClient<$Result.GetResult<Prisma.$AuditPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Audits.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditCountArgs} args - Arguments to filter Audits to count.
     * @example
     * // Count the number of Audits
     * const count = await prisma.audit.count({
     *   where: {
     *     // ... the filter for the Audits we want to count
     *   }
     * })
    **/
    count<T extends AuditCountArgs>(
      args?: Subset<T, AuditCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuditCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Audit.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends AuditAggregateArgs>(args: Subset<T, AuditAggregateArgs>): Prisma.PrismaPromise<GetAuditAggregateType<T>>

    /**
     * Group by Audit.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditGroupByArgs} args - Group by arguments.
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
      T extends AuditGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuditGroupByArgs['orderBy'] }
        : { orderBy?: AuditGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, AuditGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuditGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Audit model
   */
  readonly fields: AuditFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Audit.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuditClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    pageAudits<T extends Audit$pageAuditsArgs<ExtArgs> = {}>(args?: Subset<T, Audit$pageAuditsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PageAuditPayload<ExtArgs>, T, "findMany"> | Null>
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
   * Fields of the Audit model
   */ 
  interface AuditFieldRefs {
    readonly id: FieldRef<"Audit", 'String'>
    readonly userId: FieldRef<"Audit", 'String'>
    readonly url: FieldRef<"Audit", 'String'>
    readonly domain: FieldRef<"Audit", 'String'>
    readonly status: FieldRef<"Audit", 'AuditStatus'>
    readonly mode: FieldRef<"Audit", 'AuditMode'>
    readonly seoScore: FieldRef<"Audit", 'Decimal'>
    readonly targetKeyword: FieldRef<"Audit", 'String'>
    readonly errorMessage: FieldRef<"Audit", 'String'>
    readonly crawlerType: FieldRef<"Audit", 'String'>
    readonly crawlDurationMs: FieldRef<"Audit", 'Int'>
    readonly discoveredUrlsCount: FieldRef<"Audit", 'Int'>
    readonly auditedUrlsCount: FieldRef<"Audit", 'Int'>
    readonly completedAt: FieldRef<"Audit", 'DateTime'>
    readonly createdAt: FieldRef<"Audit", 'DateTime'>
    readonly updatedAt: FieldRef<"Audit", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Audit findUnique
   */
  export type AuditFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Audit
     */
    select?: AuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditInclude<ExtArgs> | null
    /**
     * Filter, which Audit to fetch.
     */
    where: AuditWhereUniqueInput
  }

  /**
   * Audit findUniqueOrThrow
   */
  export type AuditFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Audit
     */
    select?: AuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditInclude<ExtArgs> | null
    /**
     * Filter, which Audit to fetch.
     */
    where: AuditWhereUniqueInput
  }

  /**
   * Audit findFirst
   */
  export type AuditFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Audit
     */
    select?: AuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditInclude<ExtArgs> | null
    /**
     * Filter, which Audit to fetch.
     */
    where?: AuditWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Audits to fetch.
     */
    orderBy?: AuditOrderByWithRelationInput | AuditOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Audits.
     */
    cursor?: AuditWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Audits from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Audits.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Audits.
     */
    distinct?: AuditScalarFieldEnum | AuditScalarFieldEnum[]
  }

  /**
   * Audit findFirstOrThrow
   */
  export type AuditFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Audit
     */
    select?: AuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditInclude<ExtArgs> | null
    /**
     * Filter, which Audit to fetch.
     */
    where?: AuditWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Audits to fetch.
     */
    orderBy?: AuditOrderByWithRelationInput | AuditOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Audits.
     */
    cursor?: AuditWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Audits from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Audits.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Audits.
     */
    distinct?: AuditScalarFieldEnum | AuditScalarFieldEnum[]
  }

  /**
   * Audit findMany
   */
  export type AuditFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Audit
     */
    select?: AuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditInclude<ExtArgs> | null
    /**
     * Filter, which Audits to fetch.
     */
    where?: AuditWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Audits to fetch.
     */
    orderBy?: AuditOrderByWithRelationInput | AuditOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Audits.
     */
    cursor?: AuditWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Audits from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Audits.
     */
    skip?: number
    distinct?: AuditScalarFieldEnum | AuditScalarFieldEnum[]
  }

  /**
   * Audit create
   */
  export type AuditCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Audit
     */
    select?: AuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditInclude<ExtArgs> | null
    /**
     * The data needed to create a Audit.
     */
    data: XOR<AuditCreateInput, AuditUncheckedCreateInput>
  }

  /**
   * Audit createMany
   */
  export type AuditCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Audits.
     */
    data: AuditCreateManyInput | AuditCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Audit createManyAndReturn
   */
  export type AuditCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Audit
     */
    select?: AuditSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Audits.
     */
    data: AuditCreateManyInput | AuditCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Audit update
   */
  export type AuditUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Audit
     */
    select?: AuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditInclude<ExtArgs> | null
    /**
     * The data needed to update a Audit.
     */
    data: XOR<AuditUpdateInput, AuditUncheckedUpdateInput>
    /**
     * Choose, which Audit to update.
     */
    where: AuditWhereUniqueInput
  }

  /**
   * Audit updateMany
   */
  export type AuditUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Audits.
     */
    data: XOR<AuditUpdateManyMutationInput, AuditUncheckedUpdateManyInput>
    /**
     * Filter which Audits to update
     */
    where?: AuditWhereInput
  }

  /**
   * Audit upsert
   */
  export type AuditUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Audit
     */
    select?: AuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditInclude<ExtArgs> | null
    /**
     * The filter to search for the Audit to update in case it exists.
     */
    where: AuditWhereUniqueInput
    /**
     * In case the Audit found by the `where` argument doesn't exist, create a new Audit with this data.
     */
    create: XOR<AuditCreateInput, AuditUncheckedCreateInput>
    /**
     * In case the Audit was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuditUpdateInput, AuditUncheckedUpdateInput>
  }

  /**
   * Audit delete
   */
  export type AuditDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Audit
     */
    select?: AuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditInclude<ExtArgs> | null
    /**
     * Filter which Audit to delete.
     */
    where: AuditWhereUniqueInput
  }

  /**
   * Audit deleteMany
   */
  export type AuditDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Audits to delete
     */
    where?: AuditWhereInput
  }

  /**
   * Audit.pageAudits
   */
  export type Audit$pageAuditsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageAudit
     */
    select?: PageAuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PageAuditInclude<ExtArgs> | null
    where?: PageAuditWhereInput
    orderBy?: PageAuditOrderByWithRelationInput | PageAuditOrderByWithRelationInput[]
    cursor?: PageAuditWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PageAuditScalarFieldEnum | PageAuditScalarFieldEnum[]
  }

  /**
   * Audit without action
   */
  export type AuditDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Audit
     */
    select?: AuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditInclude<ExtArgs> | null
  }


  /**
   * Model PageAudit
   */

  export type AggregatePageAudit = {
    _count: PageAuditCountAggregateOutputType | null
    _avg: PageAuditAvgAggregateOutputType | null
    _sum: PageAuditSumAggregateOutputType | null
    _min: PageAuditMinAggregateOutputType | null
    _max: PageAuditMaxAggregateOutputType | null
  }

  export type PageAuditAvgAggregateOutputType = {
    score: number | null
  }

  export type PageAuditSumAggregateOutputType = {
    score: number | null
  }

  export type PageAuditMinAggregateOutputType = {
    id: string | null
    auditId: string | null
    url: string | null
    score: number | null
    fetchedAt: Date | null
  }

  export type PageAuditMaxAggregateOutputType = {
    id: string | null
    auditId: string | null
    url: string | null
    score: number | null
    fetchedAt: Date | null
  }

  export type PageAuditCountAggregateOutputType = {
    id: number
    auditId: number
    url: number
    score: number
    issues: number
    fetchedAt: number
    _all: number
  }


  export type PageAuditAvgAggregateInputType = {
    score?: true
  }

  export type PageAuditSumAggregateInputType = {
    score?: true
  }

  export type PageAuditMinAggregateInputType = {
    id?: true
    auditId?: true
    url?: true
    score?: true
    fetchedAt?: true
  }

  export type PageAuditMaxAggregateInputType = {
    id?: true
    auditId?: true
    url?: true
    score?: true
    fetchedAt?: true
  }

  export type PageAuditCountAggregateInputType = {
    id?: true
    auditId?: true
    url?: true
    score?: true
    issues?: true
    fetchedAt?: true
    _all?: true
  }

  export type PageAuditAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PageAudit to aggregate.
     */
    where?: PageAuditWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PageAudits to fetch.
     */
    orderBy?: PageAuditOrderByWithRelationInput | PageAuditOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PageAuditWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PageAudits from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PageAudits.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PageAudits
    **/
    _count?: true | PageAuditCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PageAuditAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PageAuditSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PageAuditMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PageAuditMaxAggregateInputType
  }

  export type GetPageAuditAggregateType<T extends PageAuditAggregateArgs> = {
        [P in keyof T & keyof AggregatePageAudit]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePageAudit[P]>
      : GetScalarType<T[P], AggregatePageAudit[P]>
  }




  export type PageAuditGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PageAuditWhereInput
    orderBy?: PageAuditOrderByWithAggregationInput | PageAuditOrderByWithAggregationInput[]
    by: PageAuditScalarFieldEnum[] | PageAuditScalarFieldEnum
    having?: PageAuditScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PageAuditCountAggregateInputType | true
    _avg?: PageAuditAvgAggregateInputType
    _sum?: PageAuditSumAggregateInputType
    _min?: PageAuditMinAggregateInputType
    _max?: PageAuditMaxAggregateInputType
  }

  export type PageAuditGroupByOutputType = {
    id: string
    auditId: string
    url: string
    score: number
    issues: JsonValue
    fetchedAt: Date
    _count: PageAuditCountAggregateOutputType | null
    _avg: PageAuditAvgAggregateOutputType | null
    _sum: PageAuditSumAggregateOutputType | null
    _min: PageAuditMinAggregateOutputType | null
    _max: PageAuditMaxAggregateOutputType | null
  }

  type GetPageAuditGroupByPayload<T extends PageAuditGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PageAuditGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PageAuditGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PageAuditGroupByOutputType[P]>
            : GetScalarType<T[P], PageAuditGroupByOutputType[P]>
        }
      >
    >


  export type PageAuditSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auditId?: boolean
    url?: boolean
    score?: boolean
    issues?: boolean
    fetchedAt?: boolean
    audit?: boolean | AuditDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pageAudit"]>

  export type PageAuditSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auditId?: boolean
    url?: boolean
    score?: boolean
    issues?: boolean
    fetchedAt?: boolean
    audit?: boolean | AuditDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pageAudit"]>

  export type PageAuditSelectScalar = {
    id?: boolean
    auditId?: boolean
    url?: boolean
    score?: boolean
    issues?: boolean
    fetchedAt?: boolean
  }

  export type PageAuditInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    audit?: boolean | AuditDefaultArgs<ExtArgs>
  }
  export type PageAuditIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    audit?: boolean | AuditDefaultArgs<ExtArgs>
  }

  export type $PageAuditPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PageAudit"
    objects: {
      audit: Prisma.$AuditPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      auditId: string
      url: string
      score: number
      issues: Prisma.JsonValue
      fetchedAt: Date
    }, ExtArgs["result"]["pageAudit"]>
    composites: {}
  }

  type PageAuditGetPayload<S extends boolean | null | undefined | PageAuditDefaultArgs> = $Result.GetResult<Prisma.$PageAuditPayload, S>

  type PageAuditCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<PageAuditFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: PageAuditCountAggregateInputType | true
    }

  export interface PageAuditDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PageAudit'], meta: { name: 'PageAudit' } }
    /**
     * Find zero or one PageAudit that matches the filter.
     * @param {PageAuditFindUniqueArgs} args - Arguments to find a PageAudit
     * @example
     * // Get one PageAudit
     * const pageAudit = await prisma.pageAudit.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PageAuditFindUniqueArgs>(args: SelectSubset<T, PageAuditFindUniqueArgs<ExtArgs>>): Prisma__PageAuditClient<$Result.GetResult<Prisma.$PageAuditPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one PageAudit that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {PageAuditFindUniqueOrThrowArgs} args - Arguments to find a PageAudit
     * @example
     * // Get one PageAudit
     * const pageAudit = await prisma.pageAudit.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PageAuditFindUniqueOrThrowArgs>(args: SelectSubset<T, PageAuditFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PageAuditClient<$Result.GetResult<Prisma.$PageAuditPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first PageAudit that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageAuditFindFirstArgs} args - Arguments to find a PageAudit
     * @example
     * // Get one PageAudit
     * const pageAudit = await prisma.pageAudit.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PageAuditFindFirstArgs>(args?: SelectSubset<T, PageAuditFindFirstArgs<ExtArgs>>): Prisma__PageAuditClient<$Result.GetResult<Prisma.$PageAuditPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first PageAudit that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageAuditFindFirstOrThrowArgs} args - Arguments to find a PageAudit
     * @example
     * // Get one PageAudit
     * const pageAudit = await prisma.pageAudit.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PageAuditFindFirstOrThrowArgs>(args?: SelectSubset<T, PageAuditFindFirstOrThrowArgs<ExtArgs>>): Prisma__PageAuditClient<$Result.GetResult<Prisma.$PageAuditPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more PageAudits that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageAuditFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PageAudits
     * const pageAudits = await prisma.pageAudit.findMany()
     * 
     * // Get first 10 PageAudits
     * const pageAudits = await prisma.pageAudit.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const pageAuditWithIdOnly = await prisma.pageAudit.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PageAuditFindManyArgs>(args?: SelectSubset<T, PageAuditFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PageAuditPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a PageAudit.
     * @param {PageAuditCreateArgs} args - Arguments to create a PageAudit.
     * @example
     * // Create one PageAudit
     * const PageAudit = await prisma.pageAudit.create({
     *   data: {
     *     // ... data to create a PageAudit
     *   }
     * })
     * 
     */
    create<T extends PageAuditCreateArgs>(args: SelectSubset<T, PageAuditCreateArgs<ExtArgs>>): Prisma__PageAuditClient<$Result.GetResult<Prisma.$PageAuditPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many PageAudits.
     * @param {PageAuditCreateManyArgs} args - Arguments to create many PageAudits.
     * @example
     * // Create many PageAudits
     * const pageAudit = await prisma.pageAudit.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PageAuditCreateManyArgs>(args?: SelectSubset<T, PageAuditCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PageAudits and returns the data saved in the database.
     * @param {PageAuditCreateManyAndReturnArgs} args - Arguments to create many PageAudits.
     * @example
     * // Create many PageAudits
     * const pageAudit = await prisma.pageAudit.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PageAudits and only return the `id`
     * const pageAuditWithIdOnly = await prisma.pageAudit.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PageAuditCreateManyAndReturnArgs>(args?: SelectSubset<T, PageAuditCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PageAuditPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a PageAudit.
     * @param {PageAuditDeleteArgs} args - Arguments to delete one PageAudit.
     * @example
     * // Delete one PageAudit
     * const PageAudit = await prisma.pageAudit.delete({
     *   where: {
     *     // ... filter to delete one PageAudit
     *   }
     * })
     * 
     */
    delete<T extends PageAuditDeleteArgs>(args: SelectSubset<T, PageAuditDeleteArgs<ExtArgs>>): Prisma__PageAuditClient<$Result.GetResult<Prisma.$PageAuditPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one PageAudit.
     * @param {PageAuditUpdateArgs} args - Arguments to update one PageAudit.
     * @example
     * // Update one PageAudit
     * const pageAudit = await prisma.pageAudit.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PageAuditUpdateArgs>(args: SelectSubset<T, PageAuditUpdateArgs<ExtArgs>>): Prisma__PageAuditClient<$Result.GetResult<Prisma.$PageAuditPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more PageAudits.
     * @param {PageAuditDeleteManyArgs} args - Arguments to filter PageAudits to delete.
     * @example
     * // Delete a few PageAudits
     * const { count } = await prisma.pageAudit.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PageAuditDeleteManyArgs>(args?: SelectSubset<T, PageAuditDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PageAudits.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageAuditUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PageAudits
     * const pageAudit = await prisma.pageAudit.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PageAuditUpdateManyArgs>(args: SelectSubset<T, PageAuditUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one PageAudit.
     * @param {PageAuditUpsertArgs} args - Arguments to update or create a PageAudit.
     * @example
     * // Update or create a PageAudit
     * const pageAudit = await prisma.pageAudit.upsert({
     *   create: {
     *     // ... data to create a PageAudit
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PageAudit we want to update
     *   }
     * })
     */
    upsert<T extends PageAuditUpsertArgs>(args: SelectSubset<T, PageAuditUpsertArgs<ExtArgs>>): Prisma__PageAuditClient<$Result.GetResult<Prisma.$PageAuditPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of PageAudits.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageAuditCountArgs} args - Arguments to filter PageAudits to count.
     * @example
     * // Count the number of PageAudits
     * const count = await prisma.pageAudit.count({
     *   where: {
     *     // ... the filter for the PageAudits we want to count
     *   }
     * })
    **/
    count<T extends PageAuditCountArgs>(
      args?: Subset<T, PageAuditCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PageAuditCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PageAudit.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageAuditAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends PageAuditAggregateArgs>(args: Subset<T, PageAuditAggregateArgs>): Prisma.PrismaPromise<GetPageAuditAggregateType<T>>

    /**
     * Group by PageAudit.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PageAuditGroupByArgs} args - Group by arguments.
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
      T extends PageAuditGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PageAuditGroupByArgs['orderBy'] }
        : { orderBy?: PageAuditGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, PageAuditGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPageAuditGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PageAudit model
   */
  readonly fields: PageAuditFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PageAudit.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PageAuditClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    audit<T extends AuditDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AuditDefaultArgs<ExtArgs>>): Prisma__AuditClient<$Result.GetResult<Prisma.$AuditPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
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
   * Fields of the PageAudit model
   */ 
  interface PageAuditFieldRefs {
    readonly id: FieldRef<"PageAudit", 'String'>
    readonly auditId: FieldRef<"PageAudit", 'String'>
    readonly url: FieldRef<"PageAudit", 'String'>
    readonly score: FieldRef<"PageAudit", 'Int'>
    readonly issues: FieldRef<"PageAudit", 'Json'>
    readonly fetchedAt: FieldRef<"PageAudit", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PageAudit findUnique
   */
  export type PageAuditFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageAudit
     */
    select?: PageAuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PageAuditInclude<ExtArgs> | null
    /**
     * Filter, which PageAudit to fetch.
     */
    where: PageAuditWhereUniqueInput
  }

  /**
   * PageAudit findUniqueOrThrow
   */
  export type PageAuditFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageAudit
     */
    select?: PageAuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PageAuditInclude<ExtArgs> | null
    /**
     * Filter, which PageAudit to fetch.
     */
    where: PageAuditWhereUniqueInput
  }

  /**
   * PageAudit findFirst
   */
  export type PageAuditFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageAudit
     */
    select?: PageAuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PageAuditInclude<ExtArgs> | null
    /**
     * Filter, which PageAudit to fetch.
     */
    where?: PageAuditWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PageAudits to fetch.
     */
    orderBy?: PageAuditOrderByWithRelationInput | PageAuditOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PageAudits.
     */
    cursor?: PageAuditWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PageAudits from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PageAudits.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PageAudits.
     */
    distinct?: PageAuditScalarFieldEnum | PageAuditScalarFieldEnum[]
  }

  /**
   * PageAudit findFirstOrThrow
   */
  export type PageAuditFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageAudit
     */
    select?: PageAuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PageAuditInclude<ExtArgs> | null
    /**
     * Filter, which PageAudit to fetch.
     */
    where?: PageAuditWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PageAudits to fetch.
     */
    orderBy?: PageAuditOrderByWithRelationInput | PageAuditOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PageAudits.
     */
    cursor?: PageAuditWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PageAudits from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PageAudits.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PageAudits.
     */
    distinct?: PageAuditScalarFieldEnum | PageAuditScalarFieldEnum[]
  }

  /**
   * PageAudit findMany
   */
  export type PageAuditFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageAudit
     */
    select?: PageAuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PageAuditInclude<ExtArgs> | null
    /**
     * Filter, which PageAudits to fetch.
     */
    where?: PageAuditWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PageAudits to fetch.
     */
    orderBy?: PageAuditOrderByWithRelationInput | PageAuditOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PageAudits.
     */
    cursor?: PageAuditWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PageAudits from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PageAudits.
     */
    skip?: number
    distinct?: PageAuditScalarFieldEnum | PageAuditScalarFieldEnum[]
  }

  /**
   * PageAudit create
   */
  export type PageAuditCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageAudit
     */
    select?: PageAuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PageAuditInclude<ExtArgs> | null
    /**
     * The data needed to create a PageAudit.
     */
    data: XOR<PageAuditCreateInput, PageAuditUncheckedCreateInput>
  }

  /**
   * PageAudit createMany
   */
  export type PageAuditCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PageAudits.
     */
    data: PageAuditCreateManyInput | PageAuditCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PageAudit createManyAndReturn
   */
  export type PageAuditCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageAudit
     */
    select?: PageAuditSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many PageAudits.
     */
    data: PageAuditCreateManyInput | PageAuditCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PageAuditIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * PageAudit update
   */
  export type PageAuditUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageAudit
     */
    select?: PageAuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PageAuditInclude<ExtArgs> | null
    /**
     * The data needed to update a PageAudit.
     */
    data: XOR<PageAuditUpdateInput, PageAuditUncheckedUpdateInput>
    /**
     * Choose, which PageAudit to update.
     */
    where: PageAuditWhereUniqueInput
  }

  /**
   * PageAudit updateMany
   */
  export type PageAuditUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PageAudits.
     */
    data: XOR<PageAuditUpdateManyMutationInput, PageAuditUncheckedUpdateManyInput>
    /**
     * Filter which PageAudits to update
     */
    where?: PageAuditWhereInput
  }

  /**
   * PageAudit upsert
   */
  export type PageAuditUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageAudit
     */
    select?: PageAuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PageAuditInclude<ExtArgs> | null
    /**
     * The filter to search for the PageAudit to update in case it exists.
     */
    where: PageAuditWhereUniqueInput
    /**
     * In case the PageAudit found by the `where` argument doesn't exist, create a new PageAudit with this data.
     */
    create: XOR<PageAuditCreateInput, PageAuditUncheckedCreateInput>
    /**
     * In case the PageAudit was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PageAuditUpdateInput, PageAuditUncheckedUpdateInput>
  }

  /**
   * PageAudit delete
   */
  export type PageAuditDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageAudit
     */
    select?: PageAuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PageAuditInclude<ExtArgs> | null
    /**
     * Filter which PageAudit to delete.
     */
    where: PageAuditWhereUniqueInput
  }

  /**
   * PageAudit deleteMany
   */
  export type PageAuditDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PageAudits to delete
     */
    where?: PageAuditWhereInput
  }

  /**
   * PageAudit without action
   */
  export type PageAuditDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PageAudit
     */
    select?: PageAuditSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PageAuditInclude<ExtArgs> | null
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


  export const UserScalarFieldEnum: {
    id: 'id',
    email: 'email',
    passwordHash: 'passwordHash',
    fullName: 'fullName',
    role: 'role',
    isVerified: 'isVerified',
    isLocked: 'isLocked',
    oauthProvider: 'oauthProvider',
    avatarUrl: 'avatarUrl',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const RefreshTokenScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    tokenHash: 'tokenHash',
    userAgent: 'userAgent',
    ipAddress: 'ipAddress',
    expiresAt: 'expiresAt',
    isRevoked: 'isRevoked',
    createdAt: 'createdAt'
  };

  export type RefreshTokenScalarFieldEnum = (typeof RefreshTokenScalarFieldEnum)[keyof typeof RefreshTokenScalarFieldEnum]


  export const AuditScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    url: 'url',
    domain: 'domain',
    status: 'status',
    mode: 'mode',
    seoScore: 'seoScore',
    targetKeyword: 'targetKeyword',
    errorMessage: 'errorMessage',
    crawlerType: 'crawlerType',
    crawlDurationMs: 'crawlDurationMs',
    discoveredUrlsCount: 'discoveredUrlsCount',
    auditedUrlsCount: 'auditedUrlsCount',
    completedAt: 'completedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AuditScalarFieldEnum = (typeof AuditScalarFieldEnum)[keyof typeof AuditScalarFieldEnum]


  export const PageAuditScalarFieldEnum: {
    id: 'id',
    auditId: 'auditId',
    url: 'url',
    score: 'score',
    issues: 'issues',
    fetchedAt: 'fetchedAt'
  };

  export type PageAuditScalarFieldEnum = (typeof PageAuditScalarFieldEnum)[keyof typeof PageAuditScalarFieldEnum]


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


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


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
   * Reference to a field of type 'UserRole'
   */
  export type EnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole'>
    


  /**
   * Reference to a field of type 'UserRole[]'
   */
  export type ListEnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'AuditStatus'
   */
  export type EnumAuditStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuditStatus'>
    


  /**
   * Reference to a field of type 'AuditStatus[]'
   */
  export type ListEnumAuditStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuditStatus[]'>
    


  /**
   * Reference to a field of type 'AuditMode'
   */
  export type EnumAuditModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuditMode'>
    


  /**
   * Reference to a field of type 'AuditMode[]'
   */
  export type ListEnumAuditModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuditMode[]'>
    


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


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: UuidFilter<"User"> | string
    email?: StringFilter<"User"> | string
    passwordHash?: StringNullableFilter<"User"> | string | null
    fullName?: StringFilter<"User"> | string
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    isVerified?: BoolFilter<"User"> | boolean
    isLocked?: BoolFilter<"User"> | boolean
    oauthProvider?: StringNullableFilter<"User"> | string | null
    avatarUrl?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    refreshTokens?: RefreshTokenListRelationFilter
    audits?: AuditListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrderInput | SortOrder
    fullName?: SortOrder
    role?: SortOrder
    isVerified?: SortOrder
    isLocked?: SortOrder
    oauthProvider?: SortOrderInput | SortOrder
    avatarUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    refreshTokens?: RefreshTokenOrderByRelationAggregateInput
    audits?: AuditOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    passwordHash?: StringNullableFilter<"User"> | string | null
    fullName?: StringFilter<"User"> | string
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    isVerified?: BoolFilter<"User"> | boolean
    isLocked?: BoolFilter<"User"> | boolean
    oauthProvider?: StringNullableFilter<"User"> | string | null
    avatarUrl?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    refreshTokens?: RefreshTokenListRelationFilter
    audits?: AuditListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrderInput | SortOrder
    fullName?: SortOrder
    role?: SortOrder
    isVerified?: SortOrder
    isLocked?: SortOrder
    oauthProvider?: SortOrderInput | SortOrder
    avatarUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    passwordHash?: StringNullableWithAggregatesFilter<"User"> | string | null
    fullName?: StringWithAggregatesFilter<"User"> | string
    role?: EnumUserRoleWithAggregatesFilter<"User"> | $Enums.UserRole
    isVerified?: BoolWithAggregatesFilter<"User"> | boolean
    isLocked?: BoolWithAggregatesFilter<"User"> | boolean
    oauthProvider?: StringNullableWithAggregatesFilter<"User"> | string | null
    avatarUrl?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type RefreshTokenWhereInput = {
    AND?: RefreshTokenWhereInput | RefreshTokenWhereInput[]
    OR?: RefreshTokenWhereInput[]
    NOT?: RefreshTokenWhereInput | RefreshTokenWhereInput[]
    id?: UuidFilter<"RefreshToken"> | string
    userId?: UuidFilter<"RefreshToken"> | string
    tokenHash?: StringFilter<"RefreshToken"> | string
    userAgent?: StringNullableFilter<"RefreshToken"> | string | null
    ipAddress?: StringNullableFilter<"RefreshToken"> | string | null
    expiresAt?: DateTimeFilter<"RefreshToken"> | Date | string
    isRevoked?: BoolFilter<"RefreshToken"> | boolean
    createdAt?: DateTimeFilter<"RefreshToken"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type RefreshTokenOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    userAgent?: SortOrderInput | SortOrder
    ipAddress?: SortOrderInput | SortOrder
    expiresAt?: SortOrder
    isRevoked?: SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type RefreshTokenWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RefreshTokenWhereInput | RefreshTokenWhereInput[]
    OR?: RefreshTokenWhereInput[]
    NOT?: RefreshTokenWhereInput | RefreshTokenWhereInput[]
    userId?: UuidFilter<"RefreshToken"> | string
    tokenHash?: StringFilter<"RefreshToken"> | string
    userAgent?: StringNullableFilter<"RefreshToken"> | string | null
    ipAddress?: StringNullableFilter<"RefreshToken"> | string | null
    expiresAt?: DateTimeFilter<"RefreshToken"> | Date | string
    isRevoked?: BoolFilter<"RefreshToken"> | boolean
    createdAt?: DateTimeFilter<"RefreshToken"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "id">

  export type RefreshTokenOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    userAgent?: SortOrderInput | SortOrder
    ipAddress?: SortOrderInput | SortOrder
    expiresAt?: SortOrder
    isRevoked?: SortOrder
    createdAt?: SortOrder
    _count?: RefreshTokenCountOrderByAggregateInput
    _max?: RefreshTokenMaxOrderByAggregateInput
    _min?: RefreshTokenMinOrderByAggregateInput
  }

  export type RefreshTokenScalarWhereWithAggregatesInput = {
    AND?: RefreshTokenScalarWhereWithAggregatesInput | RefreshTokenScalarWhereWithAggregatesInput[]
    OR?: RefreshTokenScalarWhereWithAggregatesInput[]
    NOT?: RefreshTokenScalarWhereWithAggregatesInput | RefreshTokenScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"RefreshToken"> | string
    userId?: UuidWithAggregatesFilter<"RefreshToken"> | string
    tokenHash?: StringWithAggregatesFilter<"RefreshToken"> | string
    userAgent?: StringNullableWithAggregatesFilter<"RefreshToken"> | string | null
    ipAddress?: StringNullableWithAggregatesFilter<"RefreshToken"> | string | null
    expiresAt?: DateTimeWithAggregatesFilter<"RefreshToken"> | Date | string
    isRevoked?: BoolWithAggregatesFilter<"RefreshToken"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"RefreshToken"> | Date | string
  }

  export type AuditWhereInput = {
    AND?: AuditWhereInput | AuditWhereInput[]
    OR?: AuditWhereInput[]
    NOT?: AuditWhereInput | AuditWhereInput[]
    id?: UuidFilter<"Audit"> | string
    userId?: UuidFilter<"Audit"> | string
    url?: StringFilter<"Audit"> | string
    domain?: StringFilter<"Audit"> | string
    status?: EnumAuditStatusFilter<"Audit"> | $Enums.AuditStatus
    mode?: EnumAuditModeFilter<"Audit"> | $Enums.AuditMode
    seoScore?: DecimalNullableFilter<"Audit"> | Decimal | DecimalJsLike | number | string | null
    targetKeyword?: StringNullableFilter<"Audit"> | string | null
    errorMessage?: StringNullableFilter<"Audit"> | string | null
    crawlerType?: StringNullableFilter<"Audit"> | string | null
    crawlDurationMs?: IntNullableFilter<"Audit"> | number | null
    discoveredUrlsCount?: IntNullableFilter<"Audit"> | number | null
    auditedUrlsCount?: IntNullableFilter<"Audit"> | number | null
    completedAt?: DateTimeNullableFilter<"Audit"> | Date | string | null
    createdAt?: DateTimeFilter<"Audit"> | Date | string
    updatedAt?: DateTimeFilter<"Audit"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
    pageAudits?: PageAuditListRelationFilter
  }

  export type AuditOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    url?: SortOrder
    domain?: SortOrder
    status?: SortOrder
    mode?: SortOrder
    seoScore?: SortOrderInput | SortOrder
    targetKeyword?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    crawlerType?: SortOrderInput | SortOrder
    crawlDurationMs?: SortOrderInput | SortOrder
    discoveredUrlsCount?: SortOrderInput | SortOrder
    auditedUrlsCount?: SortOrderInput | SortOrder
    completedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    pageAudits?: PageAuditOrderByRelationAggregateInput
  }

  export type AuditWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AuditWhereInput | AuditWhereInput[]
    OR?: AuditWhereInput[]
    NOT?: AuditWhereInput | AuditWhereInput[]
    userId?: UuidFilter<"Audit"> | string
    url?: StringFilter<"Audit"> | string
    domain?: StringFilter<"Audit"> | string
    status?: EnumAuditStatusFilter<"Audit"> | $Enums.AuditStatus
    mode?: EnumAuditModeFilter<"Audit"> | $Enums.AuditMode
    seoScore?: DecimalNullableFilter<"Audit"> | Decimal | DecimalJsLike | number | string | null
    targetKeyword?: StringNullableFilter<"Audit"> | string | null
    errorMessage?: StringNullableFilter<"Audit"> | string | null
    crawlerType?: StringNullableFilter<"Audit"> | string | null
    crawlDurationMs?: IntNullableFilter<"Audit"> | number | null
    discoveredUrlsCount?: IntNullableFilter<"Audit"> | number | null
    auditedUrlsCount?: IntNullableFilter<"Audit"> | number | null
    completedAt?: DateTimeNullableFilter<"Audit"> | Date | string | null
    createdAt?: DateTimeFilter<"Audit"> | Date | string
    updatedAt?: DateTimeFilter<"Audit"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
    pageAudits?: PageAuditListRelationFilter
  }, "id">

  export type AuditOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    url?: SortOrder
    domain?: SortOrder
    status?: SortOrder
    mode?: SortOrder
    seoScore?: SortOrderInput | SortOrder
    targetKeyword?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    crawlerType?: SortOrderInput | SortOrder
    crawlDurationMs?: SortOrderInput | SortOrder
    discoveredUrlsCount?: SortOrderInput | SortOrder
    auditedUrlsCount?: SortOrderInput | SortOrder
    completedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AuditCountOrderByAggregateInput
    _avg?: AuditAvgOrderByAggregateInput
    _max?: AuditMaxOrderByAggregateInput
    _min?: AuditMinOrderByAggregateInput
    _sum?: AuditSumOrderByAggregateInput
  }

  export type AuditScalarWhereWithAggregatesInput = {
    AND?: AuditScalarWhereWithAggregatesInput | AuditScalarWhereWithAggregatesInput[]
    OR?: AuditScalarWhereWithAggregatesInput[]
    NOT?: AuditScalarWhereWithAggregatesInput | AuditScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Audit"> | string
    userId?: UuidWithAggregatesFilter<"Audit"> | string
    url?: StringWithAggregatesFilter<"Audit"> | string
    domain?: StringWithAggregatesFilter<"Audit"> | string
    status?: EnumAuditStatusWithAggregatesFilter<"Audit"> | $Enums.AuditStatus
    mode?: EnumAuditModeWithAggregatesFilter<"Audit"> | $Enums.AuditMode
    seoScore?: DecimalNullableWithAggregatesFilter<"Audit"> | Decimal | DecimalJsLike | number | string | null
    targetKeyword?: StringNullableWithAggregatesFilter<"Audit"> | string | null
    errorMessage?: StringNullableWithAggregatesFilter<"Audit"> | string | null
    crawlerType?: StringNullableWithAggregatesFilter<"Audit"> | string | null
    crawlDurationMs?: IntNullableWithAggregatesFilter<"Audit"> | number | null
    discoveredUrlsCount?: IntNullableWithAggregatesFilter<"Audit"> | number | null
    auditedUrlsCount?: IntNullableWithAggregatesFilter<"Audit"> | number | null
    completedAt?: DateTimeNullableWithAggregatesFilter<"Audit"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Audit"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Audit"> | Date | string
  }

  export type PageAuditWhereInput = {
    AND?: PageAuditWhereInput | PageAuditWhereInput[]
    OR?: PageAuditWhereInput[]
    NOT?: PageAuditWhereInput | PageAuditWhereInput[]
    id?: UuidFilter<"PageAudit"> | string
    auditId?: UuidFilter<"PageAudit"> | string
    url?: StringFilter<"PageAudit"> | string
    score?: IntFilter<"PageAudit"> | number
    issues?: JsonFilter<"PageAudit">
    fetchedAt?: DateTimeFilter<"PageAudit"> | Date | string
    audit?: XOR<AuditRelationFilter, AuditWhereInput>
  }

  export type PageAuditOrderByWithRelationInput = {
    id?: SortOrder
    auditId?: SortOrder
    url?: SortOrder
    score?: SortOrder
    issues?: SortOrder
    fetchedAt?: SortOrder
    audit?: AuditOrderByWithRelationInput
  }

  export type PageAuditWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: PageAuditWhereInput | PageAuditWhereInput[]
    OR?: PageAuditWhereInput[]
    NOT?: PageAuditWhereInput | PageAuditWhereInput[]
    auditId?: UuidFilter<"PageAudit"> | string
    url?: StringFilter<"PageAudit"> | string
    score?: IntFilter<"PageAudit"> | number
    issues?: JsonFilter<"PageAudit">
    fetchedAt?: DateTimeFilter<"PageAudit"> | Date | string
    audit?: XOR<AuditRelationFilter, AuditWhereInput>
  }, "id">

  export type PageAuditOrderByWithAggregationInput = {
    id?: SortOrder
    auditId?: SortOrder
    url?: SortOrder
    score?: SortOrder
    issues?: SortOrder
    fetchedAt?: SortOrder
    _count?: PageAuditCountOrderByAggregateInput
    _avg?: PageAuditAvgOrderByAggregateInput
    _max?: PageAuditMaxOrderByAggregateInput
    _min?: PageAuditMinOrderByAggregateInput
    _sum?: PageAuditSumOrderByAggregateInput
  }

  export type PageAuditScalarWhereWithAggregatesInput = {
    AND?: PageAuditScalarWhereWithAggregatesInput | PageAuditScalarWhereWithAggregatesInput[]
    OR?: PageAuditScalarWhereWithAggregatesInput[]
    NOT?: PageAuditScalarWhereWithAggregatesInput | PageAuditScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"PageAudit"> | string
    auditId?: UuidWithAggregatesFilter<"PageAudit"> | string
    url?: StringWithAggregatesFilter<"PageAudit"> | string
    score?: IntWithAggregatesFilter<"PageAudit"> | number
    issues?: JsonWithAggregatesFilter<"PageAudit">
    fetchedAt?: DateTimeWithAggregatesFilter<"PageAudit"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    email: string
    passwordHash?: string | null
    fullName: string
    role?: $Enums.UserRole
    isVerified?: boolean
    isLocked?: boolean
    oauthProvider?: string | null
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    refreshTokens?: RefreshTokenCreateNestedManyWithoutUserInput
    audits?: AuditCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    email: string
    passwordHash?: string | null
    fullName: string
    role?: $Enums.UserRole
    isVerified?: boolean
    isLocked?: boolean
    oauthProvider?: string | null
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    refreshTokens?: RefreshTokenUncheckedCreateNestedManyWithoutUserInput
    audits?: AuditUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isVerified?: BoolFieldUpdateOperationsInput | boolean
    isLocked?: BoolFieldUpdateOperationsInput | boolean
    oauthProvider?: NullableStringFieldUpdateOperationsInput | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    refreshTokens?: RefreshTokenUpdateManyWithoutUserNestedInput
    audits?: AuditUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isVerified?: BoolFieldUpdateOperationsInput | boolean
    isLocked?: BoolFieldUpdateOperationsInput | boolean
    oauthProvider?: NullableStringFieldUpdateOperationsInput | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    refreshTokens?: RefreshTokenUncheckedUpdateManyWithoutUserNestedInput
    audits?: AuditUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    email: string
    passwordHash?: string | null
    fullName: string
    role?: $Enums.UserRole
    isVerified?: boolean
    isLocked?: boolean
    oauthProvider?: string | null
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isVerified?: BoolFieldUpdateOperationsInput | boolean
    isLocked?: BoolFieldUpdateOperationsInput | boolean
    oauthProvider?: NullableStringFieldUpdateOperationsInput | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isVerified?: BoolFieldUpdateOperationsInput | boolean
    isLocked?: BoolFieldUpdateOperationsInput | boolean
    oauthProvider?: NullableStringFieldUpdateOperationsInput | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RefreshTokenCreateInput = {
    id?: string
    tokenHash: string
    userAgent?: string | null
    ipAddress?: string | null
    expiresAt: Date | string
    isRevoked?: boolean
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutRefreshTokensInput
  }

  export type RefreshTokenUncheckedCreateInput = {
    id?: string
    userId: string
    tokenHash: string
    userAgent?: string | null
    ipAddress?: string | null
    expiresAt: Date | string
    isRevoked?: boolean
    createdAt?: Date | string
  }

  export type RefreshTokenUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isRevoked?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutRefreshTokensNestedInput
  }

  export type RefreshTokenUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isRevoked?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RefreshTokenCreateManyInput = {
    id?: string
    userId: string
    tokenHash: string
    userAgent?: string | null
    ipAddress?: string | null
    expiresAt: Date | string
    isRevoked?: boolean
    createdAt?: Date | string
  }

  export type RefreshTokenUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isRevoked?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RefreshTokenUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isRevoked?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditCreateInput = {
    id?: string
    url: string
    domain: string
    status?: $Enums.AuditStatus
    mode?: $Enums.AuditMode
    seoScore?: Decimal | DecimalJsLike | number | string | null
    targetKeyword?: string | null
    errorMessage?: string | null
    crawlerType?: string | null
    crawlDurationMs?: number | null
    discoveredUrlsCount?: number | null
    auditedUrlsCount?: number | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutAuditsInput
    pageAudits?: PageAuditCreateNestedManyWithoutAuditInput
  }

  export type AuditUncheckedCreateInput = {
    id?: string
    userId: string
    url: string
    domain: string
    status?: $Enums.AuditStatus
    mode?: $Enums.AuditMode
    seoScore?: Decimal | DecimalJsLike | number | string | null
    targetKeyword?: string | null
    errorMessage?: string | null
    crawlerType?: string | null
    crawlDurationMs?: number | null
    discoveredUrlsCount?: number | null
    auditedUrlsCount?: number | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    pageAudits?: PageAuditUncheckedCreateNestedManyWithoutAuditInput
  }

  export type AuditUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    mode?: EnumAuditModeFieldUpdateOperationsInput | $Enums.AuditMode
    seoScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    targetKeyword?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    crawlerType?: NullableStringFieldUpdateOperationsInput | string | null
    crawlDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    discoveredUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    auditedUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutAuditsNestedInput
    pageAudits?: PageAuditUpdateManyWithoutAuditNestedInput
  }

  export type AuditUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    mode?: EnumAuditModeFieldUpdateOperationsInput | $Enums.AuditMode
    seoScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    targetKeyword?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    crawlerType?: NullableStringFieldUpdateOperationsInput | string | null
    crawlDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    discoveredUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    auditedUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    pageAudits?: PageAuditUncheckedUpdateManyWithoutAuditNestedInput
  }

  export type AuditCreateManyInput = {
    id?: string
    userId: string
    url: string
    domain: string
    status?: $Enums.AuditStatus
    mode?: $Enums.AuditMode
    seoScore?: Decimal | DecimalJsLike | number | string | null
    targetKeyword?: string | null
    errorMessage?: string | null
    crawlerType?: string | null
    crawlDurationMs?: number | null
    discoveredUrlsCount?: number | null
    auditedUrlsCount?: number | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AuditUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    mode?: EnumAuditModeFieldUpdateOperationsInput | $Enums.AuditMode
    seoScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    targetKeyword?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    crawlerType?: NullableStringFieldUpdateOperationsInput | string | null
    crawlDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    discoveredUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    auditedUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    mode?: EnumAuditModeFieldUpdateOperationsInput | $Enums.AuditMode
    seoScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    targetKeyword?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    crawlerType?: NullableStringFieldUpdateOperationsInput | string | null
    crawlDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    discoveredUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    auditedUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PageAuditCreateInput = {
    id?: string
    url: string
    score: number
    issues?: JsonNullValueInput | InputJsonValue
    fetchedAt?: Date | string
    audit: AuditCreateNestedOneWithoutPageAuditsInput
  }

  export type PageAuditUncheckedCreateInput = {
    id?: string
    auditId: string
    url: string
    score: number
    issues?: JsonNullValueInput | InputJsonValue
    fetchedAt?: Date | string
  }

  export type PageAuditUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    issues?: JsonNullValueInput | InputJsonValue
    fetchedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    audit?: AuditUpdateOneRequiredWithoutPageAuditsNestedInput
  }

  export type PageAuditUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    issues?: JsonNullValueInput | InputJsonValue
    fetchedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PageAuditCreateManyInput = {
    id?: string
    auditId: string
    url: string
    score: number
    issues?: JsonNullValueInput | InputJsonValue
    fetchedAt?: Date | string
  }

  export type PageAuditUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    issues?: JsonNullValueInput | InputJsonValue
    fetchedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PageAuditUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    issues?: JsonNullValueInput | InputJsonValue
    fetchedAt?: DateTimeFieldUpdateOperationsInput | Date | string
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

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
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

  export type RefreshTokenListRelationFilter = {
    every?: RefreshTokenWhereInput
    some?: RefreshTokenWhereInput
    none?: RefreshTokenWhereInput
  }

  export type AuditListRelationFilter = {
    every?: AuditWhereInput
    some?: AuditWhereInput
    none?: AuditWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type RefreshTokenOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AuditOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    fullName?: SortOrder
    role?: SortOrder
    isVerified?: SortOrder
    isLocked?: SortOrder
    oauthProvider?: SortOrder
    avatarUrl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    fullName?: SortOrder
    role?: SortOrder
    isVerified?: SortOrder
    isLocked?: SortOrder
    oauthProvider?: SortOrder
    avatarUrl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    fullName?: SortOrder
    role?: SortOrder
    isVerified?: SortOrder
    isLocked?: SortOrder
    oauthProvider?: SortOrder
    avatarUrl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
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

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
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

  export type UserRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type RefreshTokenCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    userAgent?: SortOrder
    ipAddress?: SortOrder
    expiresAt?: SortOrder
    isRevoked?: SortOrder
    createdAt?: SortOrder
  }

  export type RefreshTokenMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    userAgent?: SortOrder
    ipAddress?: SortOrder
    expiresAt?: SortOrder
    isRevoked?: SortOrder
    createdAt?: SortOrder
  }

  export type RefreshTokenMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    userAgent?: SortOrder
    ipAddress?: SortOrder
    expiresAt?: SortOrder
    isRevoked?: SortOrder
    createdAt?: SortOrder
  }

  export type EnumAuditStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditStatus | EnumAuditStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditStatusFilter<$PrismaModel> | $Enums.AuditStatus
  }

  export type EnumAuditModeFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditMode | EnumAuditModeFieldRefInput<$PrismaModel>
    in?: $Enums.AuditMode[] | ListEnumAuditModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditMode[] | ListEnumAuditModeFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditModeFilter<$PrismaModel> | $Enums.AuditMode
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

  export type PageAuditListRelationFilter = {
    every?: PageAuditWhereInput
    some?: PageAuditWhereInput
    none?: PageAuditWhereInput
  }

  export type PageAuditOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AuditCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    url?: SortOrder
    domain?: SortOrder
    status?: SortOrder
    mode?: SortOrder
    seoScore?: SortOrder
    targetKeyword?: SortOrder
    errorMessage?: SortOrder
    crawlerType?: SortOrder
    crawlDurationMs?: SortOrder
    discoveredUrlsCount?: SortOrder
    auditedUrlsCount?: SortOrder
    completedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AuditAvgOrderByAggregateInput = {
    seoScore?: SortOrder
    crawlDurationMs?: SortOrder
    discoveredUrlsCount?: SortOrder
    auditedUrlsCount?: SortOrder
  }

  export type AuditMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    url?: SortOrder
    domain?: SortOrder
    status?: SortOrder
    mode?: SortOrder
    seoScore?: SortOrder
    targetKeyword?: SortOrder
    errorMessage?: SortOrder
    crawlerType?: SortOrder
    crawlDurationMs?: SortOrder
    discoveredUrlsCount?: SortOrder
    auditedUrlsCount?: SortOrder
    completedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AuditMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    url?: SortOrder
    domain?: SortOrder
    status?: SortOrder
    mode?: SortOrder
    seoScore?: SortOrder
    targetKeyword?: SortOrder
    errorMessage?: SortOrder
    crawlerType?: SortOrder
    crawlDurationMs?: SortOrder
    discoveredUrlsCount?: SortOrder
    auditedUrlsCount?: SortOrder
    completedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AuditSumOrderByAggregateInput = {
    seoScore?: SortOrder
    crawlDurationMs?: SortOrder
    discoveredUrlsCount?: SortOrder
    auditedUrlsCount?: SortOrder
  }

  export type EnumAuditStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditStatus | EnumAuditStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditStatusWithAggregatesFilter<$PrismaModel> | $Enums.AuditStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditStatusFilter<$PrismaModel>
    _max?: NestedEnumAuditStatusFilter<$PrismaModel>
  }

  export type EnumAuditModeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditMode | EnumAuditModeFieldRefInput<$PrismaModel>
    in?: $Enums.AuditMode[] | ListEnumAuditModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditMode[] | ListEnumAuditModeFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditModeWithAggregatesFilter<$PrismaModel> | $Enums.AuditMode
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditModeFilter<$PrismaModel>
    _max?: NestedEnumAuditModeFilter<$PrismaModel>
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

  export type AuditRelationFilter = {
    is?: AuditWhereInput
    isNot?: AuditWhereInput
  }

  export type PageAuditCountOrderByAggregateInput = {
    id?: SortOrder
    auditId?: SortOrder
    url?: SortOrder
    score?: SortOrder
    issues?: SortOrder
    fetchedAt?: SortOrder
  }

  export type PageAuditAvgOrderByAggregateInput = {
    score?: SortOrder
  }

  export type PageAuditMaxOrderByAggregateInput = {
    id?: SortOrder
    auditId?: SortOrder
    url?: SortOrder
    score?: SortOrder
    fetchedAt?: SortOrder
  }

  export type PageAuditMinOrderByAggregateInput = {
    id?: SortOrder
    auditId?: SortOrder
    url?: SortOrder
    score?: SortOrder
    fetchedAt?: SortOrder
  }

  export type PageAuditSumOrderByAggregateInput = {
    score?: SortOrder
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

  export type RefreshTokenCreateNestedManyWithoutUserInput = {
    create?: XOR<RefreshTokenCreateWithoutUserInput, RefreshTokenUncheckedCreateWithoutUserInput> | RefreshTokenCreateWithoutUserInput[] | RefreshTokenUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RefreshTokenCreateOrConnectWithoutUserInput | RefreshTokenCreateOrConnectWithoutUserInput[]
    createMany?: RefreshTokenCreateManyUserInputEnvelope
    connect?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
  }

  export type AuditCreateNestedManyWithoutUserInput = {
    create?: XOR<AuditCreateWithoutUserInput, AuditUncheckedCreateWithoutUserInput> | AuditCreateWithoutUserInput[] | AuditUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditCreateOrConnectWithoutUserInput | AuditCreateOrConnectWithoutUserInput[]
    createMany?: AuditCreateManyUserInputEnvelope
    connect?: AuditWhereUniqueInput | AuditWhereUniqueInput[]
  }

  export type RefreshTokenUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<RefreshTokenCreateWithoutUserInput, RefreshTokenUncheckedCreateWithoutUserInput> | RefreshTokenCreateWithoutUserInput[] | RefreshTokenUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RefreshTokenCreateOrConnectWithoutUserInput | RefreshTokenCreateOrConnectWithoutUserInput[]
    createMany?: RefreshTokenCreateManyUserInputEnvelope
    connect?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
  }

  export type AuditUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AuditCreateWithoutUserInput, AuditUncheckedCreateWithoutUserInput> | AuditCreateWithoutUserInput[] | AuditUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditCreateOrConnectWithoutUserInput | AuditCreateOrConnectWithoutUserInput[]
    createMany?: AuditCreateManyUserInputEnvelope
    connect?: AuditWhereUniqueInput | AuditWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumUserRoleFieldUpdateOperationsInput = {
    set?: $Enums.UserRole
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type RefreshTokenUpdateManyWithoutUserNestedInput = {
    create?: XOR<RefreshTokenCreateWithoutUserInput, RefreshTokenUncheckedCreateWithoutUserInput> | RefreshTokenCreateWithoutUserInput[] | RefreshTokenUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RefreshTokenCreateOrConnectWithoutUserInput | RefreshTokenCreateOrConnectWithoutUserInput[]
    upsert?: RefreshTokenUpsertWithWhereUniqueWithoutUserInput | RefreshTokenUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: RefreshTokenCreateManyUserInputEnvelope
    set?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    disconnect?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    delete?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    connect?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    update?: RefreshTokenUpdateWithWhereUniqueWithoutUserInput | RefreshTokenUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: RefreshTokenUpdateManyWithWhereWithoutUserInput | RefreshTokenUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: RefreshTokenScalarWhereInput | RefreshTokenScalarWhereInput[]
  }

  export type AuditUpdateManyWithoutUserNestedInput = {
    create?: XOR<AuditCreateWithoutUserInput, AuditUncheckedCreateWithoutUserInput> | AuditCreateWithoutUserInput[] | AuditUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditCreateOrConnectWithoutUserInput | AuditCreateOrConnectWithoutUserInput[]
    upsert?: AuditUpsertWithWhereUniqueWithoutUserInput | AuditUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AuditCreateManyUserInputEnvelope
    set?: AuditWhereUniqueInput | AuditWhereUniqueInput[]
    disconnect?: AuditWhereUniqueInput | AuditWhereUniqueInput[]
    delete?: AuditWhereUniqueInput | AuditWhereUniqueInput[]
    connect?: AuditWhereUniqueInput | AuditWhereUniqueInput[]
    update?: AuditUpdateWithWhereUniqueWithoutUserInput | AuditUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AuditUpdateManyWithWhereWithoutUserInput | AuditUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AuditScalarWhereInput | AuditScalarWhereInput[]
  }

  export type RefreshTokenUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<RefreshTokenCreateWithoutUserInput, RefreshTokenUncheckedCreateWithoutUserInput> | RefreshTokenCreateWithoutUserInput[] | RefreshTokenUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RefreshTokenCreateOrConnectWithoutUserInput | RefreshTokenCreateOrConnectWithoutUserInput[]
    upsert?: RefreshTokenUpsertWithWhereUniqueWithoutUserInput | RefreshTokenUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: RefreshTokenCreateManyUserInputEnvelope
    set?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    disconnect?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    delete?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    connect?: RefreshTokenWhereUniqueInput | RefreshTokenWhereUniqueInput[]
    update?: RefreshTokenUpdateWithWhereUniqueWithoutUserInput | RefreshTokenUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: RefreshTokenUpdateManyWithWhereWithoutUserInput | RefreshTokenUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: RefreshTokenScalarWhereInput | RefreshTokenScalarWhereInput[]
  }

  export type AuditUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AuditCreateWithoutUserInput, AuditUncheckedCreateWithoutUserInput> | AuditCreateWithoutUserInput[] | AuditUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditCreateOrConnectWithoutUserInput | AuditCreateOrConnectWithoutUserInput[]
    upsert?: AuditUpsertWithWhereUniqueWithoutUserInput | AuditUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AuditCreateManyUserInputEnvelope
    set?: AuditWhereUniqueInput | AuditWhereUniqueInput[]
    disconnect?: AuditWhereUniqueInput | AuditWhereUniqueInput[]
    delete?: AuditWhereUniqueInput | AuditWhereUniqueInput[]
    connect?: AuditWhereUniqueInput | AuditWhereUniqueInput[]
    update?: AuditUpdateWithWhereUniqueWithoutUserInput | AuditUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AuditUpdateManyWithWhereWithoutUserInput | AuditUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AuditScalarWhereInput | AuditScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutRefreshTokensInput = {
    create?: XOR<UserCreateWithoutRefreshTokensInput, UserUncheckedCreateWithoutRefreshTokensInput>
    connectOrCreate?: UserCreateOrConnectWithoutRefreshTokensInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutRefreshTokensNestedInput = {
    create?: XOR<UserCreateWithoutRefreshTokensInput, UserUncheckedCreateWithoutRefreshTokensInput>
    connectOrCreate?: UserCreateOrConnectWithoutRefreshTokensInput
    upsert?: UserUpsertWithoutRefreshTokensInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutRefreshTokensInput, UserUpdateWithoutRefreshTokensInput>, UserUncheckedUpdateWithoutRefreshTokensInput>
  }

  export type UserCreateNestedOneWithoutAuditsInput = {
    create?: XOR<UserCreateWithoutAuditsInput, UserUncheckedCreateWithoutAuditsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditsInput
    connect?: UserWhereUniqueInput
  }

  export type PageAuditCreateNestedManyWithoutAuditInput = {
    create?: XOR<PageAuditCreateWithoutAuditInput, PageAuditUncheckedCreateWithoutAuditInput> | PageAuditCreateWithoutAuditInput[] | PageAuditUncheckedCreateWithoutAuditInput[]
    connectOrCreate?: PageAuditCreateOrConnectWithoutAuditInput | PageAuditCreateOrConnectWithoutAuditInput[]
    createMany?: PageAuditCreateManyAuditInputEnvelope
    connect?: PageAuditWhereUniqueInput | PageAuditWhereUniqueInput[]
  }

  export type PageAuditUncheckedCreateNestedManyWithoutAuditInput = {
    create?: XOR<PageAuditCreateWithoutAuditInput, PageAuditUncheckedCreateWithoutAuditInput> | PageAuditCreateWithoutAuditInput[] | PageAuditUncheckedCreateWithoutAuditInput[]
    connectOrCreate?: PageAuditCreateOrConnectWithoutAuditInput | PageAuditCreateOrConnectWithoutAuditInput[]
    createMany?: PageAuditCreateManyAuditInputEnvelope
    connect?: PageAuditWhereUniqueInput | PageAuditWhereUniqueInput[]
  }

  export type EnumAuditStatusFieldUpdateOperationsInput = {
    set?: $Enums.AuditStatus
  }

  export type EnumAuditModeFieldUpdateOperationsInput = {
    set?: $Enums.AuditMode
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

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type UserUpdateOneRequiredWithoutAuditsNestedInput = {
    create?: XOR<UserCreateWithoutAuditsInput, UserUncheckedCreateWithoutAuditsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditsInput
    upsert?: UserUpsertWithoutAuditsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAuditsInput, UserUpdateWithoutAuditsInput>, UserUncheckedUpdateWithoutAuditsInput>
  }

  export type PageAuditUpdateManyWithoutAuditNestedInput = {
    create?: XOR<PageAuditCreateWithoutAuditInput, PageAuditUncheckedCreateWithoutAuditInput> | PageAuditCreateWithoutAuditInput[] | PageAuditUncheckedCreateWithoutAuditInput[]
    connectOrCreate?: PageAuditCreateOrConnectWithoutAuditInput | PageAuditCreateOrConnectWithoutAuditInput[]
    upsert?: PageAuditUpsertWithWhereUniqueWithoutAuditInput | PageAuditUpsertWithWhereUniqueWithoutAuditInput[]
    createMany?: PageAuditCreateManyAuditInputEnvelope
    set?: PageAuditWhereUniqueInput | PageAuditWhereUniqueInput[]
    disconnect?: PageAuditWhereUniqueInput | PageAuditWhereUniqueInput[]
    delete?: PageAuditWhereUniqueInput | PageAuditWhereUniqueInput[]
    connect?: PageAuditWhereUniqueInput | PageAuditWhereUniqueInput[]
    update?: PageAuditUpdateWithWhereUniqueWithoutAuditInput | PageAuditUpdateWithWhereUniqueWithoutAuditInput[]
    updateMany?: PageAuditUpdateManyWithWhereWithoutAuditInput | PageAuditUpdateManyWithWhereWithoutAuditInput[]
    deleteMany?: PageAuditScalarWhereInput | PageAuditScalarWhereInput[]
  }

  export type PageAuditUncheckedUpdateManyWithoutAuditNestedInput = {
    create?: XOR<PageAuditCreateWithoutAuditInput, PageAuditUncheckedCreateWithoutAuditInput> | PageAuditCreateWithoutAuditInput[] | PageAuditUncheckedCreateWithoutAuditInput[]
    connectOrCreate?: PageAuditCreateOrConnectWithoutAuditInput | PageAuditCreateOrConnectWithoutAuditInput[]
    upsert?: PageAuditUpsertWithWhereUniqueWithoutAuditInput | PageAuditUpsertWithWhereUniqueWithoutAuditInput[]
    createMany?: PageAuditCreateManyAuditInputEnvelope
    set?: PageAuditWhereUniqueInput | PageAuditWhereUniqueInput[]
    disconnect?: PageAuditWhereUniqueInput | PageAuditWhereUniqueInput[]
    delete?: PageAuditWhereUniqueInput | PageAuditWhereUniqueInput[]
    connect?: PageAuditWhereUniqueInput | PageAuditWhereUniqueInput[]
    update?: PageAuditUpdateWithWhereUniqueWithoutAuditInput | PageAuditUpdateWithWhereUniqueWithoutAuditInput[]
    updateMany?: PageAuditUpdateManyWithWhereWithoutAuditInput | PageAuditUpdateManyWithWhereWithoutAuditInput[]
    deleteMany?: PageAuditScalarWhereInput | PageAuditScalarWhereInput[]
  }

  export type AuditCreateNestedOneWithoutPageAuditsInput = {
    create?: XOR<AuditCreateWithoutPageAuditsInput, AuditUncheckedCreateWithoutPageAuditsInput>
    connectOrCreate?: AuditCreateOrConnectWithoutPageAuditsInput
    connect?: AuditWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type AuditUpdateOneRequiredWithoutPageAuditsNestedInput = {
    create?: XOR<AuditCreateWithoutPageAuditsInput, AuditUncheckedCreateWithoutPageAuditsInput>
    connectOrCreate?: AuditCreateOrConnectWithoutPageAuditsInput
    upsert?: AuditUpsertWithoutPageAuditsInput
    connect?: AuditWhereUniqueInput
    update?: XOR<XOR<AuditUpdateToOneWithWhereWithoutPageAuditsInput, AuditUpdateWithoutPageAuditsInput>, AuditUncheckedUpdateWithoutPageAuditsInput>
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

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
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

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
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

  export type NestedEnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
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

  export type NestedEnumAuditStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditStatus | EnumAuditStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditStatusFilter<$PrismaModel> | $Enums.AuditStatus
  }

  export type NestedEnumAuditModeFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditMode | EnumAuditModeFieldRefInput<$PrismaModel>
    in?: $Enums.AuditMode[] | ListEnumAuditModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditMode[] | ListEnumAuditModeFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditModeFilter<$PrismaModel> | $Enums.AuditMode
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

  export type NestedEnumAuditStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditStatus | EnumAuditStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditStatusWithAggregatesFilter<$PrismaModel> | $Enums.AuditStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditStatusFilter<$PrismaModel>
    _max?: NestedEnumAuditStatusFilter<$PrismaModel>
  }

  export type NestedEnumAuditModeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditMode | EnumAuditModeFieldRefInput<$PrismaModel>
    in?: $Enums.AuditMode[] | ListEnumAuditModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditMode[] | ListEnumAuditModeFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditModeWithAggregatesFilter<$PrismaModel> | $Enums.AuditMode
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditModeFilter<$PrismaModel>
    _max?: NestedEnumAuditModeFilter<$PrismaModel>
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

  export type RefreshTokenCreateWithoutUserInput = {
    id?: string
    tokenHash: string
    userAgent?: string | null
    ipAddress?: string | null
    expiresAt: Date | string
    isRevoked?: boolean
    createdAt?: Date | string
  }

  export type RefreshTokenUncheckedCreateWithoutUserInput = {
    id?: string
    tokenHash: string
    userAgent?: string | null
    ipAddress?: string | null
    expiresAt: Date | string
    isRevoked?: boolean
    createdAt?: Date | string
  }

  export type RefreshTokenCreateOrConnectWithoutUserInput = {
    where: RefreshTokenWhereUniqueInput
    create: XOR<RefreshTokenCreateWithoutUserInput, RefreshTokenUncheckedCreateWithoutUserInput>
  }

  export type RefreshTokenCreateManyUserInputEnvelope = {
    data: RefreshTokenCreateManyUserInput | RefreshTokenCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type AuditCreateWithoutUserInput = {
    id?: string
    url: string
    domain: string
    status?: $Enums.AuditStatus
    mode?: $Enums.AuditMode
    seoScore?: Decimal | DecimalJsLike | number | string | null
    targetKeyword?: string | null
    errorMessage?: string | null
    crawlerType?: string | null
    crawlDurationMs?: number | null
    discoveredUrlsCount?: number | null
    auditedUrlsCount?: number | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    pageAudits?: PageAuditCreateNestedManyWithoutAuditInput
  }

  export type AuditUncheckedCreateWithoutUserInput = {
    id?: string
    url: string
    domain: string
    status?: $Enums.AuditStatus
    mode?: $Enums.AuditMode
    seoScore?: Decimal | DecimalJsLike | number | string | null
    targetKeyword?: string | null
    errorMessage?: string | null
    crawlerType?: string | null
    crawlDurationMs?: number | null
    discoveredUrlsCount?: number | null
    auditedUrlsCount?: number | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    pageAudits?: PageAuditUncheckedCreateNestedManyWithoutAuditInput
  }

  export type AuditCreateOrConnectWithoutUserInput = {
    where: AuditWhereUniqueInput
    create: XOR<AuditCreateWithoutUserInput, AuditUncheckedCreateWithoutUserInput>
  }

  export type AuditCreateManyUserInputEnvelope = {
    data: AuditCreateManyUserInput | AuditCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type RefreshTokenUpsertWithWhereUniqueWithoutUserInput = {
    where: RefreshTokenWhereUniqueInput
    update: XOR<RefreshTokenUpdateWithoutUserInput, RefreshTokenUncheckedUpdateWithoutUserInput>
    create: XOR<RefreshTokenCreateWithoutUserInput, RefreshTokenUncheckedCreateWithoutUserInput>
  }

  export type RefreshTokenUpdateWithWhereUniqueWithoutUserInput = {
    where: RefreshTokenWhereUniqueInput
    data: XOR<RefreshTokenUpdateWithoutUserInput, RefreshTokenUncheckedUpdateWithoutUserInput>
  }

  export type RefreshTokenUpdateManyWithWhereWithoutUserInput = {
    where: RefreshTokenScalarWhereInput
    data: XOR<RefreshTokenUpdateManyMutationInput, RefreshTokenUncheckedUpdateManyWithoutUserInput>
  }

  export type RefreshTokenScalarWhereInput = {
    AND?: RefreshTokenScalarWhereInput | RefreshTokenScalarWhereInput[]
    OR?: RefreshTokenScalarWhereInput[]
    NOT?: RefreshTokenScalarWhereInput | RefreshTokenScalarWhereInput[]
    id?: UuidFilter<"RefreshToken"> | string
    userId?: UuidFilter<"RefreshToken"> | string
    tokenHash?: StringFilter<"RefreshToken"> | string
    userAgent?: StringNullableFilter<"RefreshToken"> | string | null
    ipAddress?: StringNullableFilter<"RefreshToken"> | string | null
    expiresAt?: DateTimeFilter<"RefreshToken"> | Date | string
    isRevoked?: BoolFilter<"RefreshToken"> | boolean
    createdAt?: DateTimeFilter<"RefreshToken"> | Date | string
  }

  export type AuditUpsertWithWhereUniqueWithoutUserInput = {
    where: AuditWhereUniqueInput
    update: XOR<AuditUpdateWithoutUserInput, AuditUncheckedUpdateWithoutUserInput>
    create: XOR<AuditCreateWithoutUserInput, AuditUncheckedCreateWithoutUserInput>
  }

  export type AuditUpdateWithWhereUniqueWithoutUserInput = {
    where: AuditWhereUniqueInput
    data: XOR<AuditUpdateWithoutUserInput, AuditUncheckedUpdateWithoutUserInput>
  }

  export type AuditUpdateManyWithWhereWithoutUserInput = {
    where: AuditScalarWhereInput
    data: XOR<AuditUpdateManyMutationInput, AuditUncheckedUpdateManyWithoutUserInput>
  }

  export type AuditScalarWhereInput = {
    AND?: AuditScalarWhereInput | AuditScalarWhereInput[]
    OR?: AuditScalarWhereInput[]
    NOT?: AuditScalarWhereInput | AuditScalarWhereInput[]
    id?: UuidFilter<"Audit"> | string
    userId?: UuidFilter<"Audit"> | string
    url?: StringFilter<"Audit"> | string
    domain?: StringFilter<"Audit"> | string
    status?: EnumAuditStatusFilter<"Audit"> | $Enums.AuditStatus
    mode?: EnumAuditModeFilter<"Audit"> | $Enums.AuditMode
    seoScore?: DecimalNullableFilter<"Audit"> | Decimal | DecimalJsLike | number | string | null
    targetKeyword?: StringNullableFilter<"Audit"> | string | null
    errorMessage?: StringNullableFilter<"Audit"> | string | null
    crawlerType?: StringNullableFilter<"Audit"> | string | null
    crawlDurationMs?: IntNullableFilter<"Audit"> | number | null
    discoveredUrlsCount?: IntNullableFilter<"Audit"> | number | null
    auditedUrlsCount?: IntNullableFilter<"Audit"> | number | null
    completedAt?: DateTimeNullableFilter<"Audit"> | Date | string | null
    createdAt?: DateTimeFilter<"Audit"> | Date | string
    updatedAt?: DateTimeFilter<"Audit"> | Date | string
  }

  export type UserCreateWithoutRefreshTokensInput = {
    id?: string
    email: string
    passwordHash?: string | null
    fullName: string
    role?: $Enums.UserRole
    isVerified?: boolean
    isLocked?: boolean
    oauthProvider?: string | null
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    audits?: AuditCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutRefreshTokensInput = {
    id?: string
    email: string
    passwordHash?: string | null
    fullName: string
    role?: $Enums.UserRole
    isVerified?: boolean
    isLocked?: boolean
    oauthProvider?: string | null
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    audits?: AuditUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutRefreshTokensInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutRefreshTokensInput, UserUncheckedCreateWithoutRefreshTokensInput>
  }

  export type UserUpsertWithoutRefreshTokensInput = {
    update: XOR<UserUpdateWithoutRefreshTokensInput, UserUncheckedUpdateWithoutRefreshTokensInput>
    create: XOR<UserCreateWithoutRefreshTokensInput, UserUncheckedCreateWithoutRefreshTokensInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutRefreshTokensInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutRefreshTokensInput, UserUncheckedUpdateWithoutRefreshTokensInput>
  }

  export type UserUpdateWithoutRefreshTokensInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isVerified?: BoolFieldUpdateOperationsInput | boolean
    isLocked?: BoolFieldUpdateOperationsInput | boolean
    oauthProvider?: NullableStringFieldUpdateOperationsInput | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    audits?: AuditUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutRefreshTokensInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isVerified?: BoolFieldUpdateOperationsInput | boolean
    isLocked?: BoolFieldUpdateOperationsInput | boolean
    oauthProvider?: NullableStringFieldUpdateOperationsInput | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    audits?: AuditUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutAuditsInput = {
    id?: string
    email: string
    passwordHash?: string | null
    fullName: string
    role?: $Enums.UserRole
    isVerified?: boolean
    isLocked?: boolean
    oauthProvider?: string | null
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    refreshTokens?: RefreshTokenCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAuditsInput = {
    id?: string
    email: string
    passwordHash?: string | null
    fullName: string
    role?: $Enums.UserRole
    isVerified?: boolean
    isLocked?: boolean
    oauthProvider?: string | null
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    refreshTokens?: RefreshTokenUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAuditsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAuditsInput, UserUncheckedCreateWithoutAuditsInput>
  }

  export type PageAuditCreateWithoutAuditInput = {
    id?: string
    url: string
    score: number
    issues?: JsonNullValueInput | InputJsonValue
    fetchedAt?: Date | string
  }

  export type PageAuditUncheckedCreateWithoutAuditInput = {
    id?: string
    url: string
    score: number
    issues?: JsonNullValueInput | InputJsonValue
    fetchedAt?: Date | string
  }

  export type PageAuditCreateOrConnectWithoutAuditInput = {
    where: PageAuditWhereUniqueInput
    create: XOR<PageAuditCreateWithoutAuditInput, PageAuditUncheckedCreateWithoutAuditInput>
  }

  export type PageAuditCreateManyAuditInputEnvelope = {
    data: PageAuditCreateManyAuditInput | PageAuditCreateManyAuditInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutAuditsInput = {
    update: XOR<UserUpdateWithoutAuditsInput, UserUncheckedUpdateWithoutAuditsInput>
    create: XOR<UserCreateWithoutAuditsInput, UserUncheckedCreateWithoutAuditsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAuditsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAuditsInput, UserUncheckedUpdateWithoutAuditsInput>
  }

  export type UserUpdateWithoutAuditsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isVerified?: BoolFieldUpdateOperationsInput | boolean
    isLocked?: BoolFieldUpdateOperationsInput | boolean
    oauthProvider?: NullableStringFieldUpdateOperationsInput | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    refreshTokens?: RefreshTokenUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAuditsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isVerified?: BoolFieldUpdateOperationsInput | boolean
    isLocked?: BoolFieldUpdateOperationsInput | boolean
    oauthProvider?: NullableStringFieldUpdateOperationsInput | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    refreshTokens?: RefreshTokenUncheckedUpdateManyWithoutUserNestedInput
  }

  export type PageAuditUpsertWithWhereUniqueWithoutAuditInput = {
    where: PageAuditWhereUniqueInput
    update: XOR<PageAuditUpdateWithoutAuditInput, PageAuditUncheckedUpdateWithoutAuditInput>
    create: XOR<PageAuditCreateWithoutAuditInput, PageAuditUncheckedCreateWithoutAuditInput>
  }

  export type PageAuditUpdateWithWhereUniqueWithoutAuditInput = {
    where: PageAuditWhereUniqueInput
    data: XOR<PageAuditUpdateWithoutAuditInput, PageAuditUncheckedUpdateWithoutAuditInput>
  }

  export type PageAuditUpdateManyWithWhereWithoutAuditInput = {
    where: PageAuditScalarWhereInput
    data: XOR<PageAuditUpdateManyMutationInput, PageAuditUncheckedUpdateManyWithoutAuditInput>
  }

  export type PageAuditScalarWhereInput = {
    AND?: PageAuditScalarWhereInput | PageAuditScalarWhereInput[]
    OR?: PageAuditScalarWhereInput[]
    NOT?: PageAuditScalarWhereInput | PageAuditScalarWhereInput[]
    id?: UuidFilter<"PageAudit"> | string
    auditId?: UuidFilter<"PageAudit"> | string
    url?: StringFilter<"PageAudit"> | string
    score?: IntFilter<"PageAudit"> | number
    issues?: JsonFilter<"PageAudit">
    fetchedAt?: DateTimeFilter<"PageAudit"> | Date | string
  }

  export type AuditCreateWithoutPageAuditsInput = {
    id?: string
    url: string
    domain: string
    status?: $Enums.AuditStatus
    mode?: $Enums.AuditMode
    seoScore?: Decimal | DecimalJsLike | number | string | null
    targetKeyword?: string | null
    errorMessage?: string | null
    crawlerType?: string | null
    crawlDurationMs?: number | null
    discoveredUrlsCount?: number | null
    auditedUrlsCount?: number | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutAuditsInput
  }

  export type AuditUncheckedCreateWithoutPageAuditsInput = {
    id?: string
    userId: string
    url: string
    domain: string
    status?: $Enums.AuditStatus
    mode?: $Enums.AuditMode
    seoScore?: Decimal | DecimalJsLike | number | string | null
    targetKeyword?: string | null
    errorMessage?: string | null
    crawlerType?: string | null
    crawlDurationMs?: number | null
    discoveredUrlsCount?: number | null
    auditedUrlsCount?: number | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AuditCreateOrConnectWithoutPageAuditsInput = {
    where: AuditWhereUniqueInput
    create: XOR<AuditCreateWithoutPageAuditsInput, AuditUncheckedCreateWithoutPageAuditsInput>
  }

  export type AuditUpsertWithoutPageAuditsInput = {
    update: XOR<AuditUpdateWithoutPageAuditsInput, AuditUncheckedUpdateWithoutPageAuditsInput>
    create: XOR<AuditCreateWithoutPageAuditsInput, AuditUncheckedCreateWithoutPageAuditsInput>
    where?: AuditWhereInput
  }

  export type AuditUpdateToOneWithWhereWithoutPageAuditsInput = {
    where?: AuditWhereInput
    data: XOR<AuditUpdateWithoutPageAuditsInput, AuditUncheckedUpdateWithoutPageAuditsInput>
  }

  export type AuditUpdateWithoutPageAuditsInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    mode?: EnumAuditModeFieldUpdateOperationsInput | $Enums.AuditMode
    seoScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    targetKeyword?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    crawlerType?: NullableStringFieldUpdateOperationsInput | string | null
    crawlDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    discoveredUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    auditedUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutAuditsNestedInput
  }

  export type AuditUncheckedUpdateWithoutPageAuditsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    mode?: EnumAuditModeFieldUpdateOperationsInput | $Enums.AuditMode
    seoScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    targetKeyword?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    crawlerType?: NullableStringFieldUpdateOperationsInput | string | null
    crawlDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    discoveredUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    auditedUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RefreshTokenCreateManyUserInput = {
    id?: string
    tokenHash: string
    userAgent?: string | null
    ipAddress?: string | null
    expiresAt: Date | string
    isRevoked?: boolean
    createdAt?: Date | string
  }

  export type AuditCreateManyUserInput = {
    id?: string
    url: string
    domain: string
    status?: $Enums.AuditStatus
    mode?: $Enums.AuditMode
    seoScore?: Decimal | DecimalJsLike | number | string | null
    targetKeyword?: string | null
    errorMessage?: string | null
    crawlerType?: string | null
    crawlDurationMs?: number | null
    discoveredUrlsCount?: number | null
    auditedUrlsCount?: number | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RefreshTokenUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isRevoked?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RefreshTokenUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isRevoked?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RefreshTokenUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isRevoked?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    mode?: EnumAuditModeFieldUpdateOperationsInput | $Enums.AuditMode
    seoScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    targetKeyword?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    crawlerType?: NullableStringFieldUpdateOperationsInput | string | null
    crawlDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    discoveredUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    auditedUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    pageAudits?: PageAuditUpdateManyWithoutAuditNestedInput
  }

  export type AuditUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    mode?: EnumAuditModeFieldUpdateOperationsInput | $Enums.AuditMode
    seoScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    targetKeyword?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    crawlerType?: NullableStringFieldUpdateOperationsInput | string | null
    crawlDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    discoveredUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    auditedUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    pageAudits?: PageAuditUncheckedUpdateManyWithoutAuditNestedInput
  }

  export type AuditUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    mode?: EnumAuditModeFieldUpdateOperationsInput | $Enums.AuditMode
    seoScore?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    targetKeyword?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    crawlerType?: NullableStringFieldUpdateOperationsInput | string | null
    crawlDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    discoveredUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    auditedUrlsCount?: NullableIntFieldUpdateOperationsInput | number | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PageAuditCreateManyAuditInput = {
    id?: string
    url: string
    score: number
    issues?: JsonNullValueInput | InputJsonValue
    fetchedAt?: Date | string
  }

  export type PageAuditUpdateWithoutAuditInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    issues?: JsonNullValueInput | InputJsonValue
    fetchedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PageAuditUncheckedUpdateWithoutAuditInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    issues?: JsonNullValueInput | InputJsonValue
    fetchedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PageAuditUncheckedUpdateManyWithoutAuditInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    score?: IntFieldUpdateOperationsInput | number
    issues?: JsonNullValueInput | InputJsonValue
    fetchedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use UserCountOutputTypeDefaultArgs instead
     */
    export type UserCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AuditCountOutputTypeDefaultArgs instead
     */
    export type AuditCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AuditCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserDefaultArgs instead
     */
    export type UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserDefaultArgs<ExtArgs>
    /**
     * @deprecated Use RefreshTokenDefaultArgs instead
     */
    export type RefreshTokenArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = RefreshTokenDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AuditDefaultArgs instead
     */
    export type AuditArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AuditDefaultArgs<ExtArgs>
    /**
     * @deprecated Use PageAuditDefaultArgs instead
     */
    export type PageAuditArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = PageAuditDefaultArgs<ExtArgs>

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