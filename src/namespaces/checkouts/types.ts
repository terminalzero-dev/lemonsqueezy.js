import type {
  ISO3166Alpha2CountryCode,
  ISO4217CurrencyCode,
} from "../../types/iso";
import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  JSONValue,
  OpenString,
} from "../../types/jsonapi";

export const checkoutLocales = [
  "bg",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "et",
  "fil",
  "fi",
  "fr",
  "de",
  "el",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "lv",
  "lt",
  "ms",
  "mt",
  "pl",
  "pt",
  "ro",
  "ru",
  "zh-CN",
  "sk",
  "sl",
  "es",
  "sv",
  "th",
  "tr",
  "vi",
] as const;
export type CheckoutLocale = (typeof checkoutLocales)[number];

export interface CheckoutProductOptionsInput {
  readonly name?: string;
  readonly description?: string;
  readonly media?: readonly string[];
  readonly redirectUrl?: string;
  readonly receiptButtonText?: string;
  readonly receiptLinkUrl?: string;
  readonly receiptThankYouNote?: string;
  readonly enabledVariants?: readonly number[];
  readonly confirmationTitle?: string;
  readonly confirmationMessage?: string;
  readonly confirmationButtonText?: string;
}

export interface CheckoutOptionsInput {
  readonly embed?: boolean;
  readonly media?: boolean;
  readonly logo?: boolean;
  readonly desc?: boolean;
  readonly discount?: boolean;
  readonly skipTrial?: boolean;
  readonly subscriptionPreview?: boolean;
  readonly backgroundColor?: string;
  readonly headingsColor?: string;
  readonly primaryTextColor?: string;
  readonly secondaryTextColor?: string;
  readonly linksColor?: string;
  readonly bordersColor?: string;
  readonly checkboxColor?: string;
  readonly activeStateColor?: string;
  readonly buttonColor?: string;
  readonly buttonTextColor?: string;
  readonly termsPrivacyColor?: string;
  readonly locale?: CheckoutLocale | null;
  /** @deprecated Use color options instead. */
  readonly dark?: boolean;
}

export interface CheckoutDataInput {
  readonly email?: string;
  readonly name?: string;
  readonly billingAddress?: {
    readonly country?: ISO3166Alpha2CountryCode;
    readonly zip?: string;
  };
  readonly taxNumber?: string;
  readonly discountCode?: string;
  readonly custom?: Readonly<Record<string, unknown>>;
  readonly variantQuantities?: readonly {
    readonly variantId: number;
    readonly quantity: number;
  }[];
}

export interface CreateCheckoutInput {
  readonly storeId: Id;
  readonly variantId: Id;
  readonly customPrice?: number;
  readonly productOptions?: CheckoutProductOptionsInput;
  readonly checkoutOptions?: CheckoutOptionsInput;
  readonly checkoutData?: CheckoutDataInput;
  readonly preview?: boolean;
  readonly testMode?: boolean;
  readonly expiresAt?: string | null;
}

export interface CheckoutPreview {
  readonly currency: ISO4217CurrencyCode;
  readonly currency_rate: number;
  readonly subtotal: number;
  readonly discount_total: number;
  readonly tax: number;
  readonly setup_fee_usd?: number;
  readonly setup_fee?: number;
  readonly total: number;
  readonly subtotal_usd: number;
  readonly discount_total_usd: number;
  readonly tax_usd: number;
  readonly total_usd: number;
  readonly subtotal_formatted: string;
  readonly discount_total_formatted: string;
  readonly setup_fee_formatted?: string;
  readonly tax_formatted: string;
  readonly total_formatted: string;
}

export interface CheckoutProductOptions {
  readonly name: string;
  readonly description: string;
  readonly media: readonly string[];
  readonly redirect_url: string;
  readonly receipt_button_text: string;
  readonly receipt_link_url: string;
  readonly receipt_thank_you_note: string;
  readonly enabled_variants: readonly number[];
  readonly confirmation_title?: string;
  readonly confirmation_message?: string;
  readonly confirmation_button_text?: string;
}

export interface CheckoutOptions {
  readonly embed: boolean;
  readonly media: boolean;
  readonly logo: boolean;
  readonly desc: boolean;
  readonly discount: boolean;
  readonly skip_trial: boolean;
  readonly subscription_preview: boolean;
  readonly background_color?: string;
  readonly headings_color?: string;
  readonly primary_text_color?: string;
  readonly secondary_text_color?: string;
  readonly links_color?: string;
  readonly borders_color?: string;
  readonly checkbox_color?: string;
  readonly active_state_color?: string;
  readonly button_color?: string;
  readonly button_text_color?: string;
  readonly terms_privacy_color?: string;
  readonly locale?: OpenString<CheckoutLocale> | null;
  readonly dark?: boolean;
}

export interface CheckoutData {
  readonly email: string;
  readonly name: string;
  readonly billing_address:
    | readonly JSONValue[]
    | {
        readonly country?: ISO3166Alpha2CountryCode;
        readonly zip?: string;
      };
  readonly tax_number: string;
  readonly discount_code: string;
  readonly custom: JSONValue;
  readonly variant_quantities: readonly {
    readonly variant_id: number;
    readonly quantity: number;
  }[];
}

export interface CheckoutAttributes {
  readonly store_id: number;
  readonly variant_id: number;
  readonly custom_price: number | null;
  readonly product_options: CheckoutProductOptions;
  readonly checkout_options: CheckoutOptions;
  readonly checkout_data: CheckoutData;
  readonly preview?: CheckoutPreview;
  readonly expires_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly test_mode: boolean;
  readonly url: string;
}

export interface CheckoutRelationships {
  readonly store: JSONAPIRelationship<JSONAPIResourceIdentifier<"stores">>;
  readonly variant: JSONAPIRelationship<JSONAPIResourceIdentifier<"variants">>;
}

export type CheckoutResource = Omit<
  JSONAPIResource<"checkouts", CheckoutAttributes, CheckoutRelationships>,
  "relationships"
> & { readonly relationships: CheckoutRelationships };
export type CheckoutResponse = JSONAPISingleResponse<CheckoutResource>;
export type CheckoutListResponse = JSONAPIListResponse<CheckoutResource>;

export interface GetCheckoutParams {
  readonly include?: readonly (keyof CheckoutRelationships)[];
}

export interface ListCheckoutsParams extends GetCheckoutParams {
  readonly filter?: {
    readonly storeId?: Id | null;
    readonly variantId?: Id | null;
  };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}
