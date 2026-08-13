import {
  compilePathId,
  compileReadQuery,
  compileResourceId,
} from "../../internal/v5/request";
import { LemonSqueezyError } from "../../client/error";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import { checkoutLocales } from "./types";
import type {
  CheckoutDataInput,
  CheckoutOptionsInput,
  CheckoutProductOptionsInput,
  CheckoutResponse,
  CreateCheckoutInput,
  GetCheckoutParams,
  CheckoutListResponse,
  ListCheckoutsParams,
} from "./types";

const evidence = {
  object: "https://docs.lemonsqueezy.com/api/checkouts/the-checkout-object",
  create: "https://docs.lemonsqueezy.com/api/checkouts/create-checkout",
  get: "https://docs.lemonsqueezy.com/api/checkouts/retrieve-checkout",
  list: "https://docs.lemonsqueezy.com/api/checkouts/list-all-checkouts",
} as const;
const knownLocales = new Set<string>(checkoutLocales);

function compileProductOptions(input?: CheckoutProductOptionsInput) {
  if (input === undefined) return undefined;
  return {
    name: input.name,
    description: input.description,
    media: input.media,
    redirect_url: input.redirectUrl,
    receipt_button_text: input.receiptButtonText,
    receipt_link_url: input.receiptLinkUrl,
    receipt_thank_you_note: input.receiptThankYouNote,
    enabled_variants: input.enabledVariants,
    confirmation_title: input.confirmationTitle,
    confirmation_message: input.confirmationMessage,
    confirmation_button_text: input.confirmationButtonText,
  };
}

function compileCheckoutOptions(input?: CheckoutOptionsInput) {
  if (input === undefined) return undefined;
  return {
    embed: input.embed,
    media: input.media,
    logo: input.logo,
    desc: input.desc,
    discount: input.discount,
    skip_trial: input.skipTrial,
    subscription_preview: input.subscriptionPreview,
    background_color: input.backgroundColor,
    headings_color: input.headingsColor,
    primary_text_color: input.primaryTextColor,
    secondary_text_color: input.secondaryTextColor,
    links_color: input.linksColor,
    borders_color: input.bordersColor,
    checkbox_color: input.checkboxColor,
    active_state_color: input.activeStateColor,
    button_color: input.buttonColor,
    button_text_color: input.buttonTextColor,
    terms_privacy_color: input.termsPrivacyColor,
    locale: input.locale,
    dark: input.dark,
  };
}

function compileCheckoutData(input?: CheckoutDataInput) {
  if (input === undefined) return undefined;
  return {
    email: input.email,
    name: input.name,
    billing_address:
      input.billingAddress === undefined
        ? undefined
        : {
            country: input.billingAddress.country,
            zip: input.billingAddress.zip,
          },
    tax_number: input.taxNumber,
    discount_code: input.discountCode,
    custom: input.custom,
    variant_quantities: input.variantQuantities?.map((quantity) => ({
      variant_id: quantity.variantId,
      quantity: quantity.quantity,
    })),
  };
}

export const createCheckoutOperation = {
  key: "checkouts.create",
  compile: ([input]) => {
    if (
      input.customPrice !== undefined &&
      (!Number.isInteger(input.customPrice) || input.customPrice <= 0)
    ) {
      throw new LemonSqueezyError(
        "customPrice must be a positive integer.",
        "validation",
      );
    }
    const locale = input.checkoutOptions?.locale;
    if (locale !== undefined && locale !== null && !knownLocales.has(locale)) {
      throw new LemonSqueezyError(
        "checkoutOptions.locale is not supported.",
        "validation",
      );
    }
    for (const item of input.checkoutData?.variantQuantities ?? []) {
      if (
        !Number.isInteger(item.variantId) ||
        item.variantId <= 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new LemonSqueezyError(
          "variant quantities require positive integer IDs and quantities.",
          "validation",
        );
      }
    }
    return {
      protocol: "jsonapi",
      method: "POST",
      path: "/v1/checkouts",
      body: {
        data: {
          type: "checkouts",
          attributes: {
            custom_price: input.customPrice,
            product_options: compileProductOptions(input.productOptions),
            checkout_options: compileCheckoutOptions(input.checkoutOptions),
            checkout_data: compileCheckoutData(input.checkoutData),
            expires_at: input.expiresAt,
            preview: input.preview,
            test_mode: input.testMode,
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: compileResourceId("storeId", input.storeId),
              },
            },
            variant: {
              data: {
                type: "variants",
                id: compileResourceId("variantId", input.variantId),
              },
            },
          },
        },
      },
    };
  },
  success: { kind: "jsonapi-single", resourceType: "checkouts" },
  evidence: [evidence.create, evidence.object],
} as const satisfies OperationContract<
  readonly [CreateCheckoutInput],
  CheckoutResponse
>;

export const listCheckoutsOperation = {
  key: "checkouts.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/checkouts",
    query: compileReadQuery(params, {
      storeId: "filter[store_id]",
      variantId: "filter[variant_id]",
    }),
  }),
  success: { kind: "jsonapi-list", resourceType: "checkouts" },
  evidence: [evidence.list, evidence.object],
} as const satisfies OperationContract<
  readonly [ListCheckoutsParams],
  CheckoutListResponse
>;

export const getCheckoutOperation = {
  key: "checkouts.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/checkouts/${compilePathId("checkoutId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "checkouts" },
  evidence: [evidence.get, evidence.object],
} as const satisfies OperationContract<
  readonly [Id, GetCheckoutParams],
  CheckoutResponse
>;
