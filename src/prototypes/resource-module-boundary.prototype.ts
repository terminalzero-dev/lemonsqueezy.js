/**
 * PROTOTYPE — not production code.
 *
 * Tests the recommended internal seam: each Namespace Module owns executable
 * operation contracts and explicit namespace adapters; one Resource Runtime
 * invokes those contracts for both the Explicit Client and Compatibility
 * facade. Nothing in this file is a public generic-request interface.
 */

export type Id = string | number;

export interface RequestOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

type JsonApiCoreRequest = {
  readonly protocol: "jsonapi";
  readonly method: "GET" | "POST" | "PATCH" | "DELETE";
  readonly path: string;
  readonly query?: readonly (readonly [wireName: string, value: string])[];
  readonly body?: unknown;
};

type LicenseCoreRequest = {
  readonly protocol: "license";
  readonly operation: "activate" | "validate" | "deactivate";
  readonly form: readonly (readonly [wireName: string, value: string])[];
};

type CoreRequest = JsonApiCoreRequest | LicenseCoreRequest;

type SuccessContract =
  | { readonly kind: "jsonapi-single"; readonly resourceType: string }
  | { readonly kind: "jsonapi-list"; readonly resourceType: string }
  | { readonly kind: "meta-only" }
  | { readonly kind: "invoice" }
  | { readonly kind: "license-json" }
  | { readonly kind: "empty"; readonly statuses: readonly number[] };

declare const operationResult: unique symbol;

interface OperationContract<Args extends readonly unknown[], Result> {
  readonly key: `${string}.${string}`;
  readonly compile: (args: Args) => CoreRequest;
  readonly success: SuccessContract;
  readonly evidence: readonly string[];
  /** Carries Result for inference without adding a runtime property. */
  readonly [operationResult]?: Result;
}

function defineOperation<Args extends readonly unknown[], Result>(
  operation: Omit<OperationContract<Args, Result>, typeof operationResult>
): OperationContract<Args, Result> {
  return operation;
}

interface CoreSuccess<Result> {
  readonly statusCode: number;
  readonly body: Result;
}

interface ResourceRuntime {
  invoke<Args extends readonly unknown[], Result>(
    operation: OperationContract<Args, Result>,
    args: Args,
    options?: RequestOptions
  ): Promise<CoreSuccess<Result>>;
}

interface ResourceIdentifier<Type extends string> {
  readonly type: Type;
  readonly id: string;
}

interface SingleResponse<Resource> {
  readonly data: Resource;
}

interface ListResponse<Resource> {
  readonly data: readonly Resource[];
}

interface OrderResource extends ResourceIdentifier<"orders"> {
  readonly attributes: {
    readonly status: string;
  };
}

export type OrderResponse = SingleResponse<OrderResource>;
export type OrderListResponse = ListResponse<OrderResource>;

export interface ListOrdersParams {
  readonly filter?: {
    readonly storeId?: Id;
    readonly userEmail?: string;
    readonly orderNumber?: number;
  };
}

export interface GenerateOrderInvoiceInput {
  readonly name?: string;
  readonly locale?: string;
}

export interface GenerateOrderInvoiceResponse {
  readonly meta: {
    readonly urls: readonly string[];
  };
}

export interface RefundOrderInput {
  readonly amount?: number;
}

const orderOperations = {
  get: defineOperation<readonly [Id], OrderResponse>({
    key: "orders.get",
    compile: ([id]: readonly [Id]) => ({
      protocol: "jsonapi",
      method: "GET",
      path: `/v1/orders/${encodeURIComponent(String(id))}`,
    }),
    success: { kind: "jsonapi-single", resourceType: "orders" },
    evidence: ["https://docs.lemonsqueezy.com/api/orders/retrieve-order"],
  }),

  list: defineOperation<readonly [ListOrdersParams?], OrderListResponse>({
    key: "orders.list",
    compile: ([_params]: readonly [ListOrdersParams?]) => ({
      protocol: "jsonapi",
      method: "GET",
      path: "/v1/orders",
    }),
    success: { kind: "jsonapi-list", resourceType: "orders" },
    evidence: ["https://docs.lemonsqueezy.com/api/orders/list-all-orders"],
  }),

  generateInvoice: defineOperation<
    readonly [Id, GenerateOrderInvoiceInput?],
    GenerateOrderInvoiceResponse
  >({
    key: "orders.generateInvoice",
    compile: ([id]: readonly [Id, GenerateOrderInvoiceInput?]) => ({
      protocol: "jsonapi",
      method: "POST",
      path: `/v1/orders/${encodeURIComponent(String(id))}/generate-invoice`,
    }),
    success: { kind: "invoice" },
    evidence: [
      "https://docs.lemonsqueezy.com/api/orders/generate-order-invoice",
    ],
  }),

  refund: defineOperation<readonly [Id, RefundOrderInput?], OrderResponse>({
    key: "orders.refund",
    compile: ([id, input]: readonly [Id, RefundOrderInput?]) => ({
      protocol: "jsonapi",
      method: "POST",
      path: `/v1/orders/${encodeURIComponent(String(id))}/refund`,
      body: {
        data: {
          type: "orders",
          id: String(id),
          attributes:
            input?.amount === undefined ? {} : { amount: input.amount },
        },
      },
    }),
    success: { kind: "jsonapi-single", resourceType: "orders" },
    evidence: ["https://docs.lemonsqueezy.com/api/orders/issue-refund"],
  }),
};

export interface OrdersNamespace {
  get(id: Id, options?: RequestOptions): Promise<OrderResponse>;
  list(
    params?: ListOrdersParams,
    options?: RequestOptions
  ): Promise<OrderListResponse>;
  generateInvoice(
    id: Id,
    input?: GenerateOrderInvoiceInput,
    options?: RequestOptions
  ): Promise<GenerateOrderInvoiceResponse>;
  refund(
    id: Id,
    input?: RefundOrderInput,
    options?: RequestOptions
  ): Promise<OrderResponse>;
}

async function explicitResult<Args extends readonly unknown[], Result>(
  runtime: ResourceRuntime,
  operation: OperationContract<Args, Result>,
  args: Args,
  options?: RequestOptions
): Promise<Result> {
  return (await runtime.invoke(operation, args, options)).body;
}

export function createOrdersNamespace(
  runtime: ResourceRuntime
): OrdersNamespace {
  const namespace: OrdersNamespace = {
    get: (id, options) =>
      explicitResult(runtime, orderOperations.get, [id], options),
    list: (params, options) =>
      explicitResult(runtime, orderOperations.list, [params], options),
    generateInvoice: (id, input, options) =>
      explicitResult(
        runtime,
        orderOperations.generateInvoice,
        [id, input],
        options
      ),
    refund: (id, input, options) =>
      explicitResult(runtime, orderOperations.refund, [id, input], options),
  };

  return Object.freeze(namespace);
}

export interface ValidateLicenseInput {
  readonly licenseKey: string;
  readonly instanceId?: string;
}

export interface ValidateLicenseResponse {
  readonly valid: boolean;
  readonly error: string | null;
}

const validateLicenseOperation = defineOperation<
  readonly [ValidateLicenseInput],
  ValidateLicenseResponse
>({
  key: "license.validate",
  compile: ([input]: readonly [ValidateLicenseInput]) => ({
    protocol: "license",
    operation: "validate",
    form: [
      ["license_key", input.licenseKey],
      ...(input.instanceId === undefined
        ? []
        : [["instance_id", input.instanceId] as const]),
    ],
  }),
  success: { kind: "license-json" },
  evidence: [
    "https://docs.lemonsqueezy.com/api/license-api/validate-license-key",
  ],
});

export interface LicenseNamespace {
  validate(
    input: ValidateLicenseInput,
    options?: RequestOptions
  ): Promise<ValidateLicenseResponse>;
}

export function createLicenseNamespace(
  runtime: ResourceRuntime
): LicenseNamespace {
  const namespace: LicenseNamespace = {
    validate: (input, options) =>
      explicitResult(runtime, validateLicenseOperation, [input], options),
  };

  return Object.freeze(namespace);
}

const deleteWebhookOperation = defineOperation<readonly [Id], void>({
  key: "webhooks.delete",
  compile: ([id]: readonly [Id]) => ({
    protocol: "jsonapi",
    method: "DELETE",
    path: `/v1/webhooks/${encodeURIComponent(String(id))}`,
  }),
  success: { kind: "empty", statuses: [204] },
  evidence: ["https://docs.lemonsqueezy.com/api/webhooks/delete-webhook"],
});

export interface WebhooksNamespace {
  delete(id: Id, options?: RequestOptions): Promise<void>;
}

export function createWebhooksNamespace(
  runtime: ResourceRuntime
): WebhooksNamespace {
  const namespace: WebhooksNamespace = {
    delete: (id, options) =>
      explicitResult(runtime, deleteWebhookOperation, [id], options),
  };

  return Object.freeze(namespace);
}

type CompatibilityEnvelope<Result> =
  | { readonly statusCode: number; readonly data: Result; readonly error: null }
  | {
      readonly statusCode: number | null;
      readonly data: null;
      readonly error: Error;
    };

declare function invokeCompatibility<Args extends readonly unknown[], Result>(
  runtime: () => ResourceRuntime,
  operation: OperationContract<Args, Result>,
  args: Args
): Promise<CompatibilityEnvelope<Result>>;

declare function getDefaultRuntime(): ResourceRuntime;

/** Facade changes only call shape and result projection, never endpoint logic. */
export function issueOrderRefund(orderId: Id, amount?: number) {
  return invokeCompatibility(getDefaultRuntime, orderOperations.refund, [
    orderId,
    amount === undefined ? undefined : { amount },
  ]);
}
