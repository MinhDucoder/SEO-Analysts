
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
 * Model SeoRule
 * 
 */
export type SeoRule = $Result.DefaultSelection<Prisma.$SeoRulePayload>
/**
 * Model RuleResult
 * 
 */
export type RuleResult = $Result.DefaultSelection<Prisma.$RuleResultPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const RuleCategory: {
  meta: 'meta',
  headings: 'headings',
  images: 'images',
  links: 'links',
  performance: 'performance',
  technical: 'technical'
};

export type RuleCategory = (typeof RuleCategory)[keyof typeof RuleCategory]


export const CheckStatus: {
  pass: 'pass',
  warn: 'warn',
  fail: 'fail'
};

export type CheckStatus = (typeof CheckStatus)[keyof typeof CheckStatus]

}

export type RuleCategory = $Enums.RuleCategory

export const RuleCategory: typeof $Enums.RuleCategory

export type CheckStatus = $Enums.CheckStatus

export const CheckStatus: typeof $Enums.CheckStatus

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more SeoRules
 * const seoRules = await prisma.seoRule.findMany()
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
   * // Fetch zero or more SeoRules
   * const seoRules = await prisma.seoRule.findMany()
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
   * `prisma.seoRule`: Exposes CRUD operations for the **SeoRule** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SeoRules
    * const seoRules = await prisma.seoRule.findMany()
    * ```
    */
  get seoRule(): Prisma.SeoRuleDelegate<ExtArgs>;

  /**
   * `prisma.ruleResult`: Exposes CRUD operations for the **RuleResult** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RuleResults
    * const ruleResults = await prisma.ruleResult.findMany()
    * ```
    */
  get ruleResult(): Prisma.RuleResultDelegate<ExtArgs>;
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
    SeoRule: 'SeoRule',
    RuleResult: 'RuleResult'
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
      modelProps: "seoRule" | "ruleResult"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      SeoRule: {
        payload: Prisma.$SeoRulePayload<ExtArgs>
        fields: Prisma.SeoRuleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SeoRuleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeoRulePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SeoRuleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeoRulePayload>
          }
          findFirst: {
            args: Prisma.SeoRuleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeoRulePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SeoRuleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeoRulePayload>
          }
          findMany: {
            args: Prisma.SeoRuleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeoRulePayload>[]
          }
          create: {
            args: Prisma.SeoRuleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeoRulePayload>
          }
          createMany: {
            args: Prisma.SeoRuleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SeoRuleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeoRulePayload>[]
          }
          delete: {
            args: Prisma.SeoRuleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeoRulePayload>
          }
          update: {
            args: Prisma.SeoRuleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeoRulePayload>
          }
          deleteMany: {
            args: Prisma.SeoRuleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SeoRuleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SeoRuleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SeoRulePayload>
          }
          aggregate: {
            args: Prisma.SeoRuleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSeoRule>
          }
          groupBy: {
            args: Prisma.SeoRuleGroupByArgs<ExtArgs>
            result: $Utils.Optional<SeoRuleGroupByOutputType>[]
          }
          count: {
            args: Prisma.SeoRuleCountArgs<ExtArgs>
            result: $Utils.Optional<SeoRuleCountAggregateOutputType> | number
          }
        }
      }
      RuleResult: {
        payload: Prisma.$RuleResultPayload<ExtArgs>
        fields: Prisma.RuleResultFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RuleResultFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleResultPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RuleResultFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleResultPayload>
          }
          findFirst: {
            args: Prisma.RuleResultFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleResultPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RuleResultFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleResultPayload>
          }
          findMany: {
            args: Prisma.RuleResultFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleResultPayload>[]
          }
          create: {
            args: Prisma.RuleResultCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleResultPayload>
          }
          createMany: {
            args: Prisma.RuleResultCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RuleResultCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleResultPayload>[]
          }
          delete: {
            args: Prisma.RuleResultDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleResultPayload>
          }
          update: {
            args: Prisma.RuleResultUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleResultPayload>
          }
          deleteMany: {
            args: Prisma.RuleResultDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RuleResultUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.RuleResultUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleResultPayload>
          }
          aggregate: {
            args: Prisma.RuleResultAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRuleResult>
          }
          groupBy: {
            args: Prisma.RuleResultGroupByArgs<ExtArgs>
            result: $Utils.Optional<RuleResultGroupByOutputType>[]
          }
          count: {
            args: Prisma.RuleResultCountArgs<ExtArgs>
            result: $Utils.Optional<RuleResultCountAggregateOutputType> | number
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
   * Models
   */

  /**
   * Model SeoRule
   */

  export type AggregateSeoRule = {
    _count: SeoRuleCountAggregateOutputType | null
    _avg: SeoRuleAvgAggregateOutputType | null
    _sum: SeoRuleSumAggregateOutputType | null
    _min: SeoRuleMinAggregateOutputType | null
    _max: SeoRuleMaxAggregateOutputType | null
  }

  export type SeoRuleAvgAggregateOutputType = {
    weight: number | null
  }

  export type SeoRuleSumAggregateOutputType = {
    weight: number | null
  }

  export type SeoRuleMinAggregateOutputType = {
    id: string | null
    name: string | null
    displayName: string | null
    description: string | null
    category: $Enums.RuleCategory | null
    weight: number | null
    isEnabled: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SeoRuleMaxAggregateOutputType = {
    id: string | null
    name: string | null
    displayName: string | null
    description: string | null
    category: $Enums.RuleCategory | null
    weight: number | null
    isEnabled: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SeoRuleCountAggregateOutputType = {
    id: number
    name: number
    displayName: number
    description: number
    category: number
    weight: number
    isEnabled: number
    checkConfig: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SeoRuleAvgAggregateInputType = {
    weight?: true
  }

  export type SeoRuleSumAggregateInputType = {
    weight?: true
  }

  export type SeoRuleMinAggregateInputType = {
    id?: true
    name?: true
    displayName?: true
    description?: true
    category?: true
    weight?: true
    isEnabled?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SeoRuleMaxAggregateInputType = {
    id?: true
    name?: true
    displayName?: true
    description?: true
    category?: true
    weight?: true
    isEnabled?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SeoRuleCountAggregateInputType = {
    id?: true
    name?: true
    displayName?: true
    description?: true
    category?: true
    weight?: true
    isEnabled?: true
    checkConfig?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SeoRuleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SeoRule to aggregate.
     */
    where?: SeoRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SeoRules to fetch.
     */
    orderBy?: SeoRuleOrderByWithRelationInput | SeoRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SeoRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SeoRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SeoRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SeoRules
    **/
    _count?: true | SeoRuleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SeoRuleAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SeoRuleSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SeoRuleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SeoRuleMaxAggregateInputType
  }

  export type GetSeoRuleAggregateType<T extends SeoRuleAggregateArgs> = {
        [P in keyof T & keyof AggregateSeoRule]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSeoRule[P]>
      : GetScalarType<T[P], AggregateSeoRule[P]>
  }




  export type SeoRuleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SeoRuleWhereInput
    orderBy?: SeoRuleOrderByWithAggregationInput | SeoRuleOrderByWithAggregationInput[]
    by: SeoRuleScalarFieldEnum[] | SeoRuleScalarFieldEnum
    having?: SeoRuleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SeoRuleCountAggregateInputType | true
    _avg?: SeoRuleAvgAggregateInputType
    _sum?: SeoRuleSumAggregateInputType
    _min?: SeoRuleMinAggregateInputType
    _max?: SeoRuleMaxAggregateInputType
  }

  export type SeoRuleGroupByOutputType = {
    id: string
    name: string
    displayName: string
    description: string
    category: $Enums.RuleCategory
    weight: number
    isEnabled: boolean
    checkConfig: JsonValue | null
    createdAt: Date
    updatedAt: Date
    _count: SeoRuleCountAggregateOutputType | null
    _avg: SeoRuleAvgAggregateOutputType | null
    _sum: SeoRuleSumAggregateOutputType | null
    _min: SeoRuleMinAggregateOutputType | null
    _max: SeoRuleMaxAggregateOutputType | null
  }

  type GetSeoRuleGroupByPayload<T extends SeoRuleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SeoRuleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SeoRuleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SeoRuleGroupByOutputType[P]>
            : GetScalarType<T[P], SeoRuleGroupByOutputType[P]>
        }
      >
    >


  export type SeoRuleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    displayName?: boolean
    description?: boolean
    category?: boolean
    weight?: boolean
    isEnabled?: boolean
    checkConfig?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["seoRule"]>

  export type SeoRuleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    displayName?: boolean
    description?: boolean
    category?: boolean
    weight?: boolean
    isEnabled?: boolean
    checkConfig?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["seoRule"]>

  export type SeoRuleSelectScalar = {
    id?: boolean
    name?: boolean
    displayName?: boolean
    description?: boolean
    category?: boolean
    weight?: boolean
    isEnabled?: boolean
    checkConfig?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $SeoRulePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SeoRule"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      displayName: string
      description: string
      category: $Enums.RuleCategory
      weight: number
      isEnabled: boolean
      checkConfig: Prisma.JsonValue | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["seoRule"]>
    composites: {}
  }

  type SeoRuleGetPayload<S extends boolean | null | undefined | SeoRuleDefaultArgs> = $Result.GetResult<Prisma.$SeoRulePayload, S>

  type SeoRuleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SeoRuleFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SeoRuleCountAggregateInputType | true
    }

  export interface SeoRuleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SeoRule'], meta: { name: 'SeoRule' } }
    /**
     * Find zero or one SeoRule that matches the filter.
     * @param {SeoRuleFindUniqueArgs} args - Arguments to find a SeoRule
     * @example
     * // Get one SeoRule
     * const seoRule = await prisma.seoRule.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SeoRuleFindUniqueArgs>(args: SelectSubset<T, SeoRuleFindUniqueArgs<ExtArgs>>): Prisma__SeoRuleClient<$Result.GetResult<Prisma.$SeoRulePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one SeoRule that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SeoRuleFindUniqueOrThrowArgs} args - Arguments to find a SeoRule
     * @example
     * // Get one SeoRule
     * const seoRule = await prisma.seoRule.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SeoRuleFindUniqueOrThrowArgs>(args: SelectSubset<T, SeoRuleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SeoRuleClient<$Result.GetResult<Prisma.$SeoRulePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first SeoRule that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeoRuleFindFirstArgs} args - Arguments to find a SeoRule
     * @example
     * // Get one SeoRule
     * const seoRule = await prisma.seoRule.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SeoRuleFindFirstArgs>(args?: SelectSubset<T, SeoRuleFindFirstArgs<ExtArgs>>): Prisma__SeoRuleClient<$Result.GetResult<Prisma.$SeoRulePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first SeoRule that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeoRuleFindFirstOrThrowArgs} args - Arguments to find a SeoRule
     * @example
     * // Get one SeoRule
     * const seoRule = await prisma.seoRule.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SeoRuleFindFirstOrThrowArgs>(args?: SelectSubset<T, SeoRuleFindFirstOrThrowArgs<ExtArgs>>): Prisma__SeoRuleClient<$Result.GetResult<Prisma.$SeoRulePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more SeoRules that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeoRuleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SeoRules
     * const seoRules = await prisma.seoRule.findMany()
     * 
     * // Get first 10 SeoRules
     * const seoRules = await prisma.seoRule.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const seoRuleWithIdOnly = await prisma.seoRule.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SeoRuleFindManyArgs>(args?: SelectSubset<T, SeoRuleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SeoRulePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a SeoRule.
     * @param {SeoRuleCreateArgs} args - Arguments to create a SeoRule.
     * @example
     * // Create one SeoRule
     * const SeoRule = await prisma.seoRule.create({
     *   data: {
     *     // ... data to create a SeoRule
     *   }
     * })
     * 
     */
    create<T extends SeoRuleCreateArgs>(args: SelectSubset<T, SeoRuleCreateArgs<ExtArgs>>): Prisma__SeoRuleClient<$Result.GetResult<Prisma.$SeoRulePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many SeoRules.
     * @param {SeoRuleCreateManyArgs} args - Arguments to create many SeoRules.
     * @example
     * // Create many SeoRules
     * const seoRule = await prisma.seoRule.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SeoRuleCreateManyArgs>(args?: SelectSubset<T, SeoRuleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SeoRules and returns the data saved in the database.
     * @param {SeoRuleCreateManyAndReturnArgs} args - Arguments to create many SeoRules.
     * @example
     * // Create many SeoRules
     * const seoRule = await prisma.seoRule.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SeoRules and only return the `id`
     * const seoRuleWithIdOnly = await prisma.seoRule.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SeoRuleCreateManyAndReturnArgs>(args?: SelectSubset<T, SeoRuleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SeoRulePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a SeoRule.
     * @param {SeoRuleDeleteArgs} args - Arguments to delete one SeoRule.
     * @example
     * // Delete one SeoRule
     * const SeoRule = await prisma.seoRule.delete({
     *   where: {
     *     // ... filter to delete one SeoRule
     *   }
     * })
     * 
     */
    delete<T extends SeoRuleDeleteArgs>(args: SelectSubset<T, SeoRuleDeleteArgs<ExtArgs>>): Prisma__SeoRuleClient<$Result.GetResult<Prisma.$SeoRulePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one SeoRule.
     * @param {SeoRuleUpdateArgs} args - Arguments to update one SeoRule.
     * @example
     * // Update one SeoRule
     * const seoRule = await prisma.seoRule.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SeoRuleUpdateArgs>(args: SelectSubset<T, SeoRuleUpdateArgs<ExtArgs>>): Prisma__SeoRuleClient<$Result.GetResult<Prisma.$SeoRulePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more SeoRules.
     * @param {SeoRuleDeleteManyArgs} args - Arguments to filter SeoRules to delete.
     * @example
     * // Delete a few SeoRules
     * const { count } = await prisma.seoRule.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SeoRuleDeleteManyArgs>(args?: SelectSubset<T, SeoRuleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SeoRules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeoRuleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SeoRules
     * const seoRule = await prisma.seoRule.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SeoRuleUpdateManyArgs>(args: SelectSubset<T, SeoRuleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one SeoRule.
     * @param {SeoRuleUpsertArgs} args - Arguments to update or create a SeoRule.
     * @example
     * // Update or create a SeoRule
     * const seoRule = await prisma.seoRule.upsert({
     *   create: {
     *     // ... data to create a SeoRule
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SeoRule we want to update
     *   }
     * })
     */
    upsert<T extends SeoRuleUpsertArgs>(args: SelectSubset<T, SeoRuleUpsertArgs<ExtArgs>>): Prisma__SeoRuleClient<$Result.GetResult<Prisma.$SeoRulePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of SeoRules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeoRuleCountArgs} args - Arguments to filter SeoRules to count.
     * @example
     * // Count the number of SeoRules
     * const count = await prisma.seoRule.count({
     *   where: {
     *     // ... the filter for the SeoRules we want to count
     *   }
     * })
    **/
    count<T extends SeoRuleCountArgs>(
      args?: Subset<T, SeoRuleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SeoRuleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SeoRule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeoRuleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends SeoRuleAggregateArgs>(args: Subset<T, SeoRuleAggregateArgs>): Prisma.PrismaPromise<GetSeoRuleAggregateType<T>>

    /**
     * Group by SeoRule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SeoRuleGroupByArgs} args - Group by arguments.
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
      T extends SeoRuleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SeoRuleGroupByArgs['orderBy'] }
        : { orderBy?: SeoRuleGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, SeoRuleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSeoRuleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SeoRule model
   */
  readonly fields: SeoRuleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SeoRule.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SeoRuleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
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
   * Fields of the SeoRule model
   */ 
  interface SeoRuleFieldRefs {
    readonly id: FieldRef<"SeoRule", 'String'>
    readonly name: FieldRef<"SeoRule", 'String'>
    readonly displayName: FieldRef<"SeoRule", 'String'>
    readonly description: FieldRef<"SeoRule", 'String'>
    readonly category: FieldRef<"SeoRule", 'RuleCategory'>
    readonly weight: FieldRef<"SeoRule", 'Int'>
    readonly isEnabled: FieldRef<"SeoRule", 'Boolean'>
    readonly checkConfig: FieldRef<"SeoRule", 'Json'>
    readonly createdAt: FieldRef<"SeoRule", 'DateTime'>
    readonly updatedAt: FieldRef<"SeoRule", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SeoRule findUnique
   */
  export type SeoRuleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeoRule
     */
    select?: SeoRuleSelect<ExtArgs> | null
    /**
     * Filter, which SeoRule to fetch.
     */
    where: SeoRuleWhereUniqueInput
  }

  /**
   * SeoRule findUniqueOrThrow
   */
  export type SeoRuleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeoRule
     */
    select?: SeoRuleSelect<ExtArgs> | null
    /**
     * Filter, which SeoRule to fetch.
     */
    where: SeoRuleWhereUniqueInput
  }

  /**
   * SeoRule findFirst
   */
  export type SeoRuleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeoRule
     */
    select?: SeoRuleSelect<ExtArgs> | null
    /**
     * Filter, which SeoRule to fetch.
     */
    where?: SeoRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SeoRules to fetch.
     */
    orderBy?: SeoRuleOrderByWithRelationInput | SeoRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SeoRules.
     */
    cursor?: SeoRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SeoRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SeoRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SeoRules.
     */
    distinct?: SeoRuleScalarFieldEnum | SeoRuleScalarFieldEnum[]
  }

  /**
   * SeoRule findFirstOrThrow
   */
  export type SeoRuleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeoRule
     */
    select?: SeoRuleSelect<ExtArgs> | null
    /**
     * Filter, which SeoRule to fetch.
     */
    where?: SeoRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SeoRules to fetch.
     */
    orderBy?: SeoRuleOrderByWithRelationInput | SeoRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SeoRules.
     */
    cursor?: SeoRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SeoRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SeoRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SeoRules.
     */
    distinct?: SeoRuleScalarFieldEnum | SeoRuleScalarFieldEnum[]
  }

  /**
   * SeoRule findMany
   */
  export type SeoRuleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeoRule
     */
    select?: SeoRuleSelect<ExtArgs> | null
    /**
     * Filter, which SeoRules to fetch.
     */
    where?: SeoRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SeoRules to fetch.
     */
    orderBy?: SeoRuleOrderByWithRelationInput | SeoRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SeoRules.
     */
    cursor?: SeoRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SeoRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SeoRules.
     */
    skip?: number
    distinct?: SeoRuleScalarFieldEnum | SeoRuleScalarFieldEnum[]
  }

  /**
   * SeoRule create
   */
  export type SeoRuleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeoRule
     */
    select?: SeoRuleSelect<ExtArgs> | null
    /**
     * The data needed to create a SeoRule.
     */
    data: XOR<SeoRuleCreateInput, SeoRuleUncheckedCreateInput>
  }

  /**
   * SeoRule createMany
   */
  export type SeoRuleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SeoRules.
     */
    data: SeoRuleCreateManyInput | SeoRuleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SeoRule createManyAndReturn
   */
  export type SeoRuleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeoRule
     */
    select?: SeoRuleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many SeoRules.
     */
    data: SeoRuleCreateManyInput | SeoRuleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SeoRule update
   */
  export type SeoRuleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeoRule
     */
    select?: SeoRuleSelect<ExtArgs> | null
    /**
     * The data needed to update a SeoRule.
     */
    data: XOR<SeoRuleUpdateInput, SeoRuleUncheckedUpdateInput>
    /**
     * Choose, which SeoRule to update.
     */
    where: SeoRuleWhereUniqueInput
  }

  /**
   * SeoRule updateMany
   */
  export type SeoRuleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SeoRules.
     */
    data: XOR<SeoRuleUpdateManyMutationInput, SeoRuleUncheckedUpdateManyInput>
    /**
     * Filter which SeoRules to update
     */
    where?: SeoRuleWhereInput
  }

  /**
   * SeoRule upsert
   */
  export type SeoRuleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeoRule
     */
    select?: SeoRuleSelect<ExtArgs> | null
    /**
     * The filter to search for the SeoRule to update in case it exists.
     */
    where: SeoRuleWhereUniqueInput
    /**
     * In case the SeoRule found by the `where` argument doesn't exist, create a new SeoRule with this data.
     */
    create: XOR<SeoRuleCreateInput, SeoRuleUncheckedCreateInput>
    /**
     * In case the SeoRule was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SeoRuleUpdateInput, SeoRuleUncheckedUpdateInput>
  }

  /**
   * SeoRule delete
   */
  export type SeoRuleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeoRule
     */
    select?: SeoRuleSelect<ExtArgs> | null
    /**
     * Filter which SeoRule to delete.
     */
    where: SeoRuleWhereUniqueInput
  }

  /**
   * SeoRule deleteMany
   */
  export type SeoRuleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SeoRules to delete
     */
    where?: SeoRuleWhereInput
  }

  /**
   * SeoRule without action
   */
  export type SeoRuleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SeoRule
     */
    select?: SeoRuleSelect<ExtArgs> | null
  }


  /**
   * Model RuleResult
   */

  export type AggregateRuleResult = {
    _count: RuleResultCountAggregateOutputType | null
    _avg: RuleResultAvgAggregateOutputType | null
    _sum: RuleResultSumAggregateOutputType | null
    _min: RuleResultMinAggregateOutputType | null
    _max: RuleResultMaxAggregateOutputType | null
  }

  export type RuleResultAvgAggregateOutputType = {
    score: Decimal | null
    weight: number | null
  }

  export type RuleResultSumAggregateOutputType = {
    score: Decimal | null
    weight: number | null
  }

  export type RuleResultMinAggregateOutputType = {
    id: string | null
    auditId: string | null
    ruleId: string | null
    ruleName: string | null
    category: $Enums.RuleCategory | null
    status: $Enums.CheckStatus | null
    score: Decimal | null
    weight: number | null
    message: string | null
    suggestion: string | null
    createdAt: Date | null
  }

  export type RuleResultMaxAggregateOutputType = {
    id: string | null
    auditId: string | null
    ruleId: string | null
    ruleName: string | null
    category: $Enums.RuleCategory | null
    status: $Enums.CheckStatus | null
    score: Decimal | null
    weight: number | null
    message: string | null
    suggestion: string | null
    createdAt: Date | null
  }

  export type RuleResultCountAggregateOutputType = {
    id: number
    auditId: number
    ruleId: number
    ruleName: number
    category: number
    status: number
    score: number
    weight: number
    message: number
    suggestion: number
    metadata: number
    createdAt: number
    _all: number
  }


  export type RuleResultAvgAggregateInputType = {
    score?: true
    weight?: true
  }

  export type RuleResultSumAggregateInputType = {
    score?: true
    weight?: true
  }

  export type RuleResultMinAggregateInputType = {
    id?: true
    auditId?: true
    ruleId?: true
    ruleName?: true
    category?: true
    status?: true
    score?: true
    weight?: true
    message?: true
    suggestion?: true
    createdAt?: true
  }

  export type RuleResultMaxAggregateInputType = {
    id?: true
    auditId?: true
    ruleId?: true
    ruleName?: true
    category?: true
    status?: true
    score?: true
    weight?: true
    message?: true
    suggestion?: true
    createdAt?: true
  }

  export type RuleResultCountAggregateInputType = {
    id?: true
    auditId?: true
    ruleId?: true
    ruleName?: true
    category?: true
    status?: true
    score?: true
    weight?: true
    message?: true
    suggestion?: true
    metadata?: true
    createdAt?: true
    _all?: true
  }

  export type RuleResultAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RuleResult to aggregate.
     */
    where?: RuleResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuleResults to fetch.
     */
    orderBy?: RuleResultOrderByWithRelationInput | RuleResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RuleResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuleResults from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuleResults.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RuleResults
    **/
    _count?: true | RuleResultCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RuleResultAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RuleResultSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RuleResultMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RuleResultMaxAggregateInputType
  }

  export type GetRuleResultAggregateType<T extends RuleResultAggregateArgs> = {
        [P in keyof T & keyof AggregateRuleResult]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRuleResult[P]>
      : GetScalarType<T[P], AggregateRuleResult[P]>
  }




  export type RuleResultGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RuleResultWhereInput
    orderBy?: RuleResultOrderByWithAggregationInput | RuleResultOrderByWithAggregationInput[]
    by: RuleResultScalarFieldEnum[] | RuleResultScalarFieldEnum
    having?: RuleResultScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RuleResultCountAggregateInputType | true
    _avg?: RuleResultAvgAggregateInputType
    _sum?: RuleResultSumAggregateInputType
    _min?: RuleResultMinAggregateInputType
    _max?: RuleResultMaxAggregateInputType
  }

  export type RuleResultGroupByOutputType = {
    id: string
    auditId: string
    ruleId: string
    ruleName: string
    category: $Enums.RuleCategory
    status: $Enums.CheckStatus
    score: Decimal
    weight: number
    message: string
    suggestion: string | null
    metadata: JsonValue | null
    createdAt: Date
    _count: RuleResultCountAggregateOutputType | null
    _avg: RuleResultAvgAggregateOutputType | null
    _sum: RuleResultSumAggregateOutputType | null
    _min: RuleResultMinAggregateOutputType | null
    _max: RuleResultMaxAggregateOutputType | null
  }

  type GetRuleResultGroupByPayload<T extends RuleResultGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RuleResultGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RuleResultGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RuleResultGroupByOutputType[P]>
            : GetScalarType<T[P], RuleResultGroupByOutputType[P]>
        }
      >
    >


  export type RuleResultSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auditId?: boolean
    ruleId?: boolean
    ruleName?: boolean
    category?: boolean
    status?: boolean
    score?: boolean
    weight?: boolean
    message?: boolean
    suggestion?: boolean
    metadata?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["ruleResult"]>

  export type RuleResultSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auditId?: boolean
    ruleId?: boolean
    ruleName?: boolean
    category?: boolean
    status?: boolean
    score?: boolean
    weight?: boolean
    message?: boolean
    suggestion?: boolean
    metadata?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["ruleResult"]>

  export type RuleResultSelectScalar = {
    id?: boolean
    auditId?: boolean
    ruleId?: boolean
    ruleName?: boolean
    category?: boolean
    status?: boolean
    score?: boolean
    weight?: boolean
    message?: boolean
    suggestion?: boolean
    metadata?: boolean
    createdAt?: boolean
  }


  export type $RuleResultPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RuleResult"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      auditId: string
      ruleId: string
      ruleName: string
      category: $Enums.RuleCategory
      status: $Enums.CheckStatus
      score: Prisma.Decimal
      weight: number
      message: string
      suggestion: string | null
      metadata: Prisma.JsonValue | null
      createdAt: Date
    }, ExtArgs["result"]["ruleResult"]>
    composites: {}
  }

  type RuleResultGetPayload<S extends boolean | null | undefined | RuleResultDefaultArgs> = $Result.GetResult<Prisma.$RuleResultPayload, S>

  type RuleResultCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<RuleResultFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: RuleResultCountAggregateInputType | true
    }

  export interface RuleResultDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RuleResult'], meta: { name: 'RuleResult' } }
    /**
     * Find zero or one RuleResult that matches the filter.
     * @param {RuleResultFindUniqueArgs} args - Arguments to find a RuleResult
     * @example
     * // Get one RuleResult
     * const ruleResult = await prisma.ruleResult.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RuleResultFindUniqueArgs>(args: SelectSubset<T, RuleResultFindUniqueArgs<ExtArgs>>): Prisma__RuleResultClient<$Result.GetResult<Prisma.$RuleResultPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one RuleResult that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {RuleResultFindUniqueOrThrowArgs} args - Arguments to find a RuleResult
     * @example
     * // Get one RuleResult
     * const ruleResult = await prisma.ruleResult.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RuleResultFindUniqueOrThrowArgs>(args: SelectSubset<T, RuleResultFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RuleResultClient<$Result.GetResult<Prisma.$RuleResultPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first RuleResult that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleResultFindFirstArgs} args - Arguments to find a RuleResult
     * @example
     * // Get one RuleResult
     * const ruleResult = await prisma.ruleResult.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RuleResultFindFirstArgs>(args?: SelectSubset<T, RuleResultFindFirstArgs<ExtArgs>>): Prisma__RuleResultClient<$Result.GetResult<Prisma.$RuleResultPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first RuleResult that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleResultFindFirstOrThrowArgs} args - Arguments to find a RuleResult
     * @example
     * // Get one RuleResult
     * const ruleResult = await prisma.ruleResult.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RuleResultFindFirstOrThrowArgs>(args?: SelectSubset<T, RuleResultFindFirstOrThrowArgs<ExtArgs>>): Prisma__RuleResultClient<$Result.GetResult<Prisma.$RuleResultPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more RuleResults that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleResultFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RuleResults
     * const ruleResults = await prisma.ruleResult.findMany()
     * 
     * // Get first 10 RuleResults
     * const ruleResults = await prisma.ruleResult.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ruleResultWithIdOnly = await prisma.ruleResult.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RuleResultFindManyArgs>(args?: SelectSubset<T, RuleResultFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuleResultPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a RuleResult.
     * @param {RuleResultCreateArgs} args - Arguments to create a RuleResult.
     * @example
     * // Create one RuleResult
     * const RuleResult = await prisma.ruleResult.create({
     *   data: {
     *     // ... data to create a RuleResult
     *   }
     * })
     * 
     */
    create<T extends RuleResultCreateArgs>(args: SelectSubset<T, RuleResultCreateArgs<ExtArgs>>): Prisma__RuleResultClient<$Result.GetResult<Prisma.$RuleResultPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many RuleResults.
     * @param {RuleResultCreateManyArgs} args - Arguments to create many RuleResults.
     * @example
     * // Create many RuleResults
     * const ruleResult = await prisma.ruleResult.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RuleResultCreateManyArgs>(args?: SelectSubset<T, RuleResultCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RuleResults and returns the data saved in the database.
     * @param {RuleResultCreateManyAndReturnArgs} args - Arguments to create many RuleResults.
     * @example
     * // Create many RuleResults
     * const ruleResult = await prisma.ruleResult.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RuleResults and only return the `id`
     * const ruleResultWithIdOnly = await prisma.ruleResult.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RuleResultCreateManyAndReturnArgs>(args?: SelectSubset<T, RuleResultCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuleResultPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a RuleResult.
     * @param {RuleResultDeleteArgs} args - Arguments to delete one RuleResult.
     * @example
     * // Delete one RuleResult
     * const RuleResult = await prisma.ruleResult.delete({
     *   where: {
     *     // ... filter to delete one RuleResult
     *   }
     * })
     * 
     */
    delete<T extends RuleResultDeleteArgs>(args: SelectSubset<T, RuleResultDeleteArgs<ExtArgs>>): Prisma__RuleResultClient<$Result.GetResult<Prisma.$RuleResultPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one RuleResult.
     * @param {RuleResultUpdateArgs} args - Arguments to update one RuleResult.
     * @example
     * // Update one RuleResult
     * const ruleResult = await prisma.ruleResult.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RuleResultUpdateArgs>(args: SelectSubset<T, RuleResultUpdateArgs<ExtArgs>>): Prisma__RuleResultClient<$Result.GetResult<Prisma.$RuleResultPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more RuleResults.
     * @param {RuleResultDeleteManyArgs} args - Arguments to filter RuleResults to delete.
     * @example
     * // Delete a few RuleResults
     * const { count } = await prisma.ruleResult.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RuleResultDeleteManyArgs>(args?: SelectSubset<T, RuleResultDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RuleResults.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleResultUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RuleResults
     * const ruleResult = await prisma.ruleResult.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RuleResultUpdateManyArgs>(args: SelectSubset<T, RuleResultUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one RuleResult.
     * @param {RuleResultUpsertArgs} args - Arguments to update or create a RuleResult.
     * @example
     * // Update or create a RuleResult
     * const ruleResult = await prisma.ruleResult.upsert({
     *   create: {
     *     // ... data to create a RuleResult
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RuleResult we want to update
     *   }
     * })
     */
    upsert<T extends RuleResultUpsertArgs>(args: SelectSubset<T, RuleResultUpsertArgs<ExtArgs>>): Prisma__RuleResultClient<$Result.GetResult<Prisma.$RuleResultPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of RuleResults.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleResultCountArgs} args - Arguments to filter RuleResults to count.
     * @example
     * // Count the number of RuleResults
     * const count = await prisma.ruleResult.count({
     *   where: {
     *     // ... the filter for the RuleResults we want to count
     *   }
     * })
    **/
    count<T extends RuleResultCountArgs>(
      args?: Subset<T, RuleResultCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RuleResultCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RuleResult.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleResultAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends RuleResultAggregateArgs>(args: Subset<T, RuleResultAggregateArgs>): Prisma.PrismaPromise<GetRuleResultAggregateType<T>>

    /**
     * Group by RuleResult.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleResultGroupByArgs} args - Group by arguments.
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
      T extends RuleResultGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RuleResultGroupByArgs['orderBy'] }
        : { orderBy?: RuleResultGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, RuleResultGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRuleResultGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RuleResult model
   */
  readonly fields: RuleResultFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RuleResult.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RuleResultClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
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
   * Fields of the RuleResult model
   */ 
  interface RuleResultFieldRefs {
    readonly id: FieldRef<"RuleResult", 'String'>
    readonly auditId: FieldRef<"RuleResult", 'String'>
    readonly ruleId: FieldRef<"RuleResult", 'String'>
    readonly ruleName: FieldRef<"RuleResult", 'String'>
    readonly category: FieldRef<"RuleResult", 'RuleCategory'>
    readonly status: FieldRef<"RuleResult", 'CheckStatus'>
    readonly score: FieldRef<"RuleResult", 'Decimal'>
    readonly weight: FieldRef<"RuleResult", 'Int'>
    readonly message: FieldRef<"RuleResult", 'String'>
    readonly suggestion: FieldRef<"RuleResult", 'String'>
    readonly metadata: FieldRef<"RuleResult", 'Json'>
    readonly createdAt: FieldRef<"RuleResult", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RuleResult findUnique
   */
  export type RuleResultFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleResult
     */
    select?: RuleResultSelect<ExtArgs> | null
    /**
     * Filter, which RuleResult to fetch.
     */
    where: RuleResultWhereUniqueInput
  }

  /**
   * RuleResult findUniqueOrThrow
   */
  export type RuleResultFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleResult
     */
    select?: RuleResultSelect<ExtArgs> | null
    /**
     * Filter, which RuleResult to fetch.
     */
    where: RuleResultWhereUniqueInput
  }

  /**
   * RuleResult findFirst
   */
  export type RuleResultFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleResult
     */
    select?: RuleResultSelect<ExtArgs> | null
    /**
     * Filter, which RuleResult to fetch.
     */
    where?: RuleResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuleResults to fetch.
     */
    orderBy?: RuleResultOrderByWithRelationInput | RuleResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RuleResults.
     */
    cursor?: RuleResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuleResults from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuleResults.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RuleResults.
     */
    distinct?: RuleResultScalarFieldEnum | RuleResultScalarFieldEnum[]
  }

  /**
   * RuleResult findFirstOrThrow
   */
  export type RuleResultFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleResult
     */
    select?: RuleResultSelect<ExtArgs> | null
    /**
     * Filter, which RuleResult to fetch.
     */
    where?: RuleResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuleResults to fetch.
     */
    orderBy?: RuleResultOrderByWithRelationInput | RuleResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RuleResults.
     */
    cursor?: RuleResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuleResults from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuleResults.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RuleResults.
     */
    distinct?: RuleResultScalarFieldEnum | RuleResultScalarFieldEnum[]
  }

  /**
   * RuleResult findMany
   */
  export type RuleResultFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleResult
     */
    select?: RuleResultSelect<ExtArgs> | null
    /**
     * Filter, which RuleResults to fetch.
     */
    where?: RuleResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuleResults to fetch.
     */
    orderBy?: RuleResultOrderByWithRelationInput | RuleResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RuleResults.
     */
    cursor?: RuleResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuleResults from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuleResults.
     */
    skip?: number
    distinct?: RuleResultScalarFieldEnum | RuleResultScalarFieldEnum[]
  }

  /**
   * RuleResult create
   */
  export type RuleResultCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleResult
     */
    select?: RuleResultSelect<ExtArgs> | null
    /**
     * The data needed to create a RuleResult.
     */
    data: XOR<RuleResultCreateInput, RuleResultUncheckedCreateInput>
  }

  /**
   * RuleResult createMany
   */
  export type RuleResultCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RuleResults.
     */
    data: RuleResultCreateManyInput | RuleResultCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RuleResult createManyAndReturn
   */
  export type RuleResultCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleResult
     */
    select?: RuleResultSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many RuleResults.
     */
    data: RuleResultCreateManyInput | RuleResultCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RuleResult update
   */
  export type RuleResultUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleResult
     */
    select?: RuleResultSelect<ExtArgs> | null
    /**
     * The data needed to update a RuleResult.
     */
    data: XOR<RuleResultUpdateInput, RuleResultUncheckedUpdateInput>
    /**
     * Choose, which RuleResult to update.
     */
    where: RuleResultWhereUniqueInput
  }

  /**
   * RuleResult updateMany
   */
  export type RuleResultUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RuleResults.
     */
    data: XOR<RuleResultUpdateManyMutationInput, RuleResultUncheckedUpdateManyInput>
    /**
     * Filter which RuleResults to update
     */
    where?: RuleResultWhereInput
  }

  /**
   * RuleResult upsert
   */
  export type RuleResultUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleResult
     */
    select?: RuleResultSelect<ExtArgs> | null
    /**
     * The filter to search for the RuleResult to update in case it exists.
     */
    where: RuleResultWhereUniqueInput
    /**
     * In case the RuleResult found by the `where` argument doesn't exist, create a new RuleResult with this data.
     */
    create: XOR<RuleResultCreateInput, RuleResultUncheckedCreateInput>
    /**
     * In case the RuleResult was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RuleResultUpdateInput, RuleResultUncheckedUpdateInput>
  }

  /**
   * RuleResult delete
   */
  export type RuleResultDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleResult
     */
    select?: RuleResultSelect<ExtArgs> | null
    /**
     * Filter which RuleResult to delete.
     */
    where: RuleResultWhereUniqueInput
  }

  /**
   * RuleResult deleteMany
   */
  export type RuleResultDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RuleResults to delete
     */
    where?: RuleResultWhereInput
  }

  /**
   * RuleResult without action
   */
  export type RuleResultDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleResult
     */
    select?: RuleResultSelect<ExtArgs> | null
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


  export const SeoRuleScalarFieldEnum: {
    id: 'id',
    name: 'name',
    displayName: 'displayName',
    description: 'description',
    category: 'category',
    weight: 'weight',
    isEnabled: 'isEnabled',
    checkConfig: 'checkConfig',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SeoRuleScalarFieldEnum = (typeof SeoRuleScalarFieldEnum)[keyof typeof SeoRuleScalarFieldEnum]


  export const RuleResultScalarFieldEnum: {
    id: 'id',
    auditId: 'auditId',
    ruleId: 'ruleId',
    ruleName: 'ruleName',
    category: 'category',
    status: 'status',
    score: 'score',
    weight: 'weight',
    message: 'message',
    suggestion: 'suggestion',
    metadata: 'metadata',
    createdAt: 'createdAt'
  };

  export type RuleResultScalarFieldEnum = (typeof RuleResultScalarFieldEnum)[keyof typeof RuleResultScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


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
   * Reference to a field of type 'RuleCategory'
   */
  export type EnumRuleCategoryFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RuleCategory'>
    


  /**
   * Reference to a field of type 'RuleCategory[]'
   */
  export type ListEnumRuleCategoryFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RuleCategory[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


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
   * Reference to a field of type 'CheckStatus'
   */
  export type EnumCheckStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CheckStatus'>
    


  /**
   * Reference to a field of type 'CheckStatus[]'
   */
  export type ListEnumCheckStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CheckStatus[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


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


  export type SeoRuleWhereInput = {
    AND?: SeoRuleWhereInput | SeoRuleWhereInput[]
    OR?: SeoRuleWhereInput[]
    NOT?: SeoRuleWhereInput | SeoRuleWhereInput[]
    id?: UuidFilter<"SeoRule"> | string
    name?: StringFilter<"SeoRule"> | string
    displayName?: StringFilter<"SeoRule"> | string
    description?: StringFilter<"SeoRule"> | string
    category?: EnumRuleCategoryFilter<"SeoRule"> | $Enums.RuleCategory
    weight?: IntFilter<"SeoRule"> | number
    isEnabled?: BoolFilter<"SeoRule"> | boolean
    checkConfig?: JsonNullableFilter<"SeoRule">
    createdAt?: DateTimeFilter<"SeoRule"> | Date | string
    updatedAt?: DateTimeFilter<"SeoRule"> | Date | string
  }

  export type SeoRuleOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    displayName?: SortOrder
    description?: SortOrder
    category?: SortOrder
    weight?: SortOrder
    isEnabled?: SortOrder
    checkConfig?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SeoRuleWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    name?: string
    AND?: SeoRuleWhereInput | SeoRuleWhereInput[]
    OR?: SeoRuleWhereInput[]
    NOT?: SeoRuleWhereInput | SeoRuleWhereInput[]
    displayName?: StringFilter<"SeoRule"> | string
    description?: StringFilter<"SeoRule"> | string
    category?: EnumRuleCategoryFilter<"SeoRule"> | $Enums.RuleCategory
    weight?: IntFilter<"SeoRule"> | number
    isEnabled?: BoolFilter<"SeoRule"> | boolean
    checkConfig?: JsonNullableFilter<"SeoRule">
    createdAt?: DateTimeFilter<"SeoRule"> | Date | string
    updatedAt?: DateTimeFilter<"SeoRule"> | Date | string
  }, "id" | "name">

  export type SeoRuleOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    displayName?: SortOrder
    description?: SortOrder
    category?: SortOrder
    weight?: SortOrder
    isEnabled?: SortOrder
    checkConfig?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SeoRuleCountOrderByAggregateInput
    _avg?: SeoRuleAvgOrderByAggregateInput
    _max?: SeoRuleMaxOrderByAggregateInput
    _min?: SeoRuleMinOrderByAggregateInput
    _sum?: SeoRuleSumOrderByAggregateInput
  }

  export type SeoRuleScalarWhereWithAggregatesInput = {
    AND?: SeoRuleScalarWhereWithAggregatesInput | SeoRuleScalarWhereWithAggregatesInput[]
    OR?: SeoRuleScalarWhereWithAggregatesInput[]
    NOT?: SeoRuleScalarWhereWithAggregatesInput | SeoRuleScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"SeoRule"> | string
    name?: StringWithAggregatesFilter<"SeoRule"> | string
    displayName?: StringWithAggregatesFilter<"SeoRule"> | string
    description?: StringWithAggregatesFilter<"SeoRule"> | string
    category?: EnumRuleCategoryWithAggregatesFilter<"SeoRule"> | $Enums.RuleCategory
    weight?: IntWithAggregatesFilter<"SeoRule"> | number
    isEnabled?: BoolWithAggregatesFilter<"SeoRule"> | boolean
    checkConfig?: JsonNullableWithAggregatesFilter<"SeoRule">
    createdAt?: DateTimeWithAggregatesFilter<"SeoRule"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"SeoRule"> | Date | string
  }

  export type RuleResultWhereInput = {
    AND?: RuleResultWhereInput | RuleResultWhereInput[]
    OR?: RuleResultWhereInput[]
    NOT?: RuleResultWhereInput | RuleResultWhereInput[]
    id?: UuidFilter<"RuleResult"> | string
    auditId?: UuidFilter<"RuleResult"> | string
    ruleId?: StringFilter<"RuleResult"> | string
    ruleName?: StringFilter<"RuleResult"> | string
    category?: EnumRuleCategoryFilter<"RuleResult"> | $Enums.RuleCategory
    status?: EnumCheckStatusFilter<"RuleResult"> | $Enums.CheckStatus
    score?: DecimalFilter<"RuleResult"> | Decimal | DecimalJsLike | number | string
    weight?: IntFilter<"RuleResult"> | number
    message?: StringFilter<"RuleResult"> | string
    suggestion?: StringNullableFilter<"RuleResult"> | string | null
    metadata?: JsonNullableFilter<"RuleResult">
    createdAt?: DateTimeFilter<"RuleResult"> | Date | string
  }

  export type RuleResultOrderByWithRelationInput = {
    id?: SortOrder
    auditId?: SortOrder
    ruleId?: SortOrder
    ruleName?: SortOrder
    category?: SortOrder
    status?: SortOrder
    score?: SortOrder
    weight?: SortOrder
    message?: SortOrder
    suggestion?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type RuleResultWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RuleResultWhereInput | RuleResultWhereInput[]
    OR?: RuleResultWhereInput[]
    NOT?: RuleResultWhereInput | RuleResultWhereInput[]
    auditId?: UuidFilter<"RuleResult"> | string
    ruleId?: StringFilter<"RuleResult"> | string
    ruleName?: StringFilter<"RuleResult"> | string
    category?: EnumRuleCategoryFilter<"RuleResult"> | $Enums.RuleCategory
    status?: EnumCheckStatusFilter<"RuleResult"> | $Enums.CheckStatus
    score?: DecimalFilter<"RuleResult"> | Decimal | DecimalJsLike | number | string
    weight?: IntFilter<"RuleResult"> | number
    message?: StringFilter<"RuleResult"> | string
    suggestion?: StringNullableFilter<"RuleResult"> | string | null
    metadata?: JsonNullableFilter<"RuleResult">
    createdAt?: DateTimeFilter<"RuleResult"> | Date | string
  }, "id">

  export type RuleResultOrderByWithAggregationInput = {
    id?: SortOrder
    auditId?: SortOrder
    ruleId?: SortOrder
    ruleName?: SortOrder
    category?: SortOrder
    status?: SortOrder
    score?: SortOrder
    weight?: SortOrder
    message?: SortOrder
    suggestion?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: RuleResultCountOrderByAggregateInput
    _avg?: RuleResultAvgOrderByAggregateInput
    _max?: RuleResultMaxOrderByAggregateInput
    _min?: RuleResultMinOrderByAggregateInput
    _sum?: RuleResultSumOrderByAggregateInput
  }

  export type RuleResultScalarWhereWithAggregatesInput = {
    AND?: RuleResultScalarWhereWithAggregatesInput | RuleResultScalarWhereWithAggregatesInput[]
    OR?: RuleResultScalarWhereWithAggregatesInput[]
    NOT?: RuleResultScalarWhereWithAggregatesInput | RuleResultScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"RuleResult"> | string
    auditId?: UuidWithAggregatesFilter<"RuleResult"> | string
    ruleId?: StringWithAggregatesFilter<"RuleResult"> | string
    ruleName?: StringWithAggregatesFilter<"RuleResult"> | string
    category?: EnumRuleCategoryWithAggregatesFilter<"RuleResult"> | $Enums.RuleCategory
    status?: EnumCheckStatusWithAggregatesFilter<"RuleResult"> | $Enums.CheckStatus
    score?: DecimalWithAggregatesFilter<"RuleResult"> | Decimal | DecimalJsLike | number | string
    weight?: IntWithAggregatesFilter<"RuleResult"> | number
    message?: StringWithAggregatesFilter<"RuleResult"> | string
    suggestion?: StringNullableWithAggregatesFilter<"RuleResult"> | string | null
    metadata?: JsonNullableWithAggregatesFilter<"RuleResult">
    createdAt?: DateTimeWithAggregatesFilter<"RuleResult"> | Date | string
  }

  export type SeoRuleCreateInput = {
    id?: string
    name: string
    displayName: string
    description: string
    category: $Enums.RuleCategory
    weight: number
    isEnabled?: boolean
    checkConfig?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SeoRuleUncheckedCreateInput = {
    id?: string
    name: string
    displayName: string
    description: string
    category: $Enums.RuleCategory
    weight: number
    isEnabled?: boolean
    checkConfig?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SeoRuleUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumRuleCategoryFieldUpdateOperationsInput | $Enums.RuleCategory
    weight?: IntFieldUpdateOperationsInput | number
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    checkConfig?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SeoRuleUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumRuleCategoryFieldUpdateOperationsInput | $Enums.RuleCategory
    weight?: IntFieldUpdateOperationsInput | number
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    checkConfig?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SeoRuleCreateManyInput = {
    id?: string
    name: string
    displayName: string
    description: string
    category: $Enums.RuleCategory
    weight: number
    isEnabled?: boolean
    checkConfig?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SeoRuleUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumRuleCategoryFieldUpdateOperationsInput | $Enums.RuleCategory
    weight?: IntFieldUpdateOperationsInput | number
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    checkConfig?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SeoRuleUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumRuleCategoryFieldUpdateOperationsInput | $Enums.RuleCategory
    weight?: IntFieldUpdateOperationsInput | number
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    checkConfig?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuleResultCreateInput = {
    id?: string
    auditId: string
    ruleId: string
    ruleName: string
    category: $Enums.RuleCategory
    status: $Enums.CheckStatus
    score: Decimal | DecimalJsLike | number | string
    weight: number
    message: string
    suggestion?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type RuleResultUncheckedCreateInput = {
    id?: string
    auditId: string
    ruleId: string
    ruleName: string
    category: $Enums.RuleCategory
    status: $Enums.CheckStatus
    score: Decimal | DecimalJsLike | number | string
    weight: number
    message: string
    suggestion?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type RuleResultUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    ruleId?: StringFieldUpdateOperationsInput | string
    ruleName?: StringFieldUpdateOperationsInput | string
    category?: EnumRuleCategoryFieldUpdateOperationsInput | $Enums.RuleCategory
    status?: EnumCheckStatusFieldUpdateOperationsInput | $Enums.CheckStatus
    score?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    weight?: IntFieldUpdateOperationsInput | number
    message?: StringFieldUpdateOperationsInput | string
    suggestion?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuleResultUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    ruleId?: StringFieldUpdateOperationsInput | string
    ruleName?: StringFieldUpdateOperationsInput | string
    category?: EnumRuleCategoryFieldUpdateOperationsInput | $Enums.RuleCategory
    status?: EnumCheckStatusFieldUpdateOperationsInput | $Enums.CheckStatus
    score?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    weight?: IntFieldUpdateOperationsInput | number
    message?: StringFieldUpdateOperationsInput | string
    suggestion?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuleResultCreateManyInput = {
    id?: string
    auditId: string
    ruleId: string
    ruleName: string
    category: $Enums.RuleCategory
    status: $Enums.CheckStatus
    score: Decimal | DecimalJsLike | number | string
    weight: number
    message: string
    suggestion?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type RuleResultUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    ruleId?: StringFieldUpdateOperationsInput | string
    ruleName?: StringFieldUpdateOperationsInput | string
    category?: EnumRuleCategoryFieldUpdateOperationsInput | $Enums.RuleCategory
    status?: EnumCheckStatusFieldUpdateOperationsInput | $Enums.CheckStatus
    score?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    weight?: IntFieldUpdateOperationsInput | number
    message?: StringFieldUpdateOperationsInput | string
    suggestion?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RuleResultUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditId?: StringFieldUpdateOperationsInput | string
    ruleId?: StringFieldUpdateOperationsInput | string
    ruleName?: StringFieldUpdateOperationsInput | string
    category?: EnumRuleCategoryFieldUpdateOperationsInput | $Enums.RuleCategory
    status?: EnumCheckStatusFieldUpdateOperationsInput | $Enums.CheckStatus
    score?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    weight?: IntFieldUpdateOperationsInput | number
    message?: StringFieldUpdateOperationsInput | string
    suggestion?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
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

  export type EnumRuleCategoryFilter<$PrismaModel = never> = {
    equals?: $Enums.RuleCategory | EnumRuleCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.RuleCategory[] | ListEnumRuleCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuleCategory[] | ListEnumRuleCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumRuleCategoryFilter<$PrismaModel> | $Enums.RuleCategory
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

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }
  export type JsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
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

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type SeoRuleCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    displayName?: SortOrder
    description?: SortOrder
    category?: SortOrder
    weight?: SortOrder
    isEnabled?: SortOrder
    checkConfig?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SeoRuleAvgOrderByAggregateInput = {
    weight?: SortOrder
  }

  export type SeoRuleMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    displayName?: SortOrder
    description?: SortOrder
    category?: SortOrder
    weight?: SortOrder
    isEnabled?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SeoRuleMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    displayName?: SortOrder
    description?: SortOrder
    category?: SortOrder
    weight?: SortOrder
    isEnabled?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SeoRuleSumOrderByAggregateInput = {
    weight?: SortOrder
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

  export type EnumRuleCategoryWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RuleCategory | EnumRuleCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.RuleCategory[] | ListEnumRuleCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuleCategory[] | ListEnumRuleCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumRuleCategoryWithAggregatesFilter<$PrismaModel> | $Enums.RuleCategory
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRuleCategoryFilter<$PrismaModel>
    _max?: NestedEnumRuleCategoryFilter<$PrismaModel>
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

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
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
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
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

  export type EnumCheckStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.CheckStatus | EnumCheckStatusFieldRefInput<$PrismaModel>
    in?: $Enums.CheckStatus[] | ListEnumCheckStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.CheckStatus[] | ListEnumCheckStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumCheckStatusFilter<$PrismaModel> | $Enums.CheckStatus
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

  export type RuleResultCountOrderByAggregateInput = {
    id?: SortOrder
    auditId?: SortOrder
    ruleId?: SortOrder
    ruleName?: SortOrder
    category?: SortOrder
    status?: SortOrder
    score?: SortOrder
    weight?: SortOrder
    message?: SortOrder
    suggestion?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
  }

  export type RuleResultAvgOrderByAggregateInput = {
    score?: SortOrder
    weight?: SortOrder
  }

  export type RuleResultMaxOrderByAggregateInput = {
    id?: SortOrder
    auditId?: SortOrder
    ruleId?: SortOrder
    ruleName?: SortOrder
    category?: SortOrder
    status?: SortOrder
    score?: SortOrder
    weight?: SortOrder
    message?: SortOrder
    suggestion?: SortOrder
    createdAt?: SortOrder
  }

  export type RuleResultMinOrderByAggregateInput = {
    id?: SortOrder
    auditId?: SortOrder
    ruleId?: SortOrder
    ruleName?: SortOrder
    category?: SortOrder
    status?: SortOrder
    score?: SortOrder
    weight?: SortOrder
    message?: SortOrder
    suggestion?: SortOrder
    createdAt?: SortOrder
  }

  export type RuleResultSumOrderByAggregateInput = {
    score?: SortOrder
    weight?: SortOrder
  }

  export type EnumCheckStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CheckStatus | EnumCheckStatusFieldRefInput<$PrismaModel>
    in?: $Enums.CheckStatus[] | ListEnumCheckStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.CheckStatus[] | ListEnumCheckStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumCheckStatusWithAggregatesFilter<$PrismaModel> | $Enums.CheckStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCheckStatusFilter<$PrismaModel>
    _max?: NestedEnumCheckStatusFilter<$PrismaModel>
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

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type EnumRuleCategoryFieldUpdateOperationsInput = {
    set?: $Enums.RuleCategory
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type EnumCheckStatusFieldUpdateOperationsInput = {
    set?: $Enums.CheckStatus
  }

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
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

  export type NestedEnumRuleCategoryFilter<$PrismaModel = never> = {
    equals?: $Enums.RuleCategory | EnumRuleCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.RuleCategory[] | ListEnumRuleCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuleCategory[] | ListEnumRuleCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumRuleCategoryFilter<$PrismaModel> | $Enums.RuleCategory
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

  export type NestedEnumRuleCategoryWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RuleCategory | EnumRuleCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.RuleCategory[] | ListEnumRuleCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.RuleCategory[] | ListEnumRuleCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumRuleCategoryWithAggregatesFilter<$PrismaModel> | $Enums.RuleCategory
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRuleCategoryFilter<$PrismaModel>
    _max?: NestedEnumRuleCategoryFilter<$PrismaModel>
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

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
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
  export type NestedJsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
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

  export type NestedEnumCheckStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.CheckStatus | EnumCheckStatusFieldRefInput<$PrismaModel>
    in?: $Enums.CheckStatus[] | ListEnumCheckStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.CheckStatus[] | ListEnumCheckStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumCheckStatusFilter<$PrismaModel> | $Enums.CheckStatus
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

  export type NestedEnumCheckStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CheckStatus | EnumCheckStatusFieldRefInput<$PrismaModel>
    in?: $Enums.CheckStatus[] | ListEnumCheckStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.CheckStatus[] | ListEnumCheckStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumCheckStatusWithAggregatesFilter<$PrismaModel> | $Enums.CheckStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCheckStatusFilter<$PrismaModel>
    _max?: NestedEnumCheckStatusFilter<$PrismaModel>
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



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use SeoRuleDefaultArgs instead
     */
    export type SeoRuleArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SeoRuleDefaultArgs<ExtArgs>
    /**
     * @deprecated Use RuleResultDefaultArgs instead
     */
    export type RuleResultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = RuleResultDefaultArgs<ExtArgs>

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