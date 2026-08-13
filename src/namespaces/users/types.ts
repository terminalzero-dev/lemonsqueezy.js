import type {
  JSONAPIResource,
  JSONAPISingleResponse,
} from "../../types/jsonapi";

export interface UserAttributes {
  readonly name: string;
  readonly email: string;
  readonly color: string;
  readonly avatar_url: string;
  readonly has_custom_avatar: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export type UserResource = JSONAPIResource<"users", UserAttributes>;

export type UserResponse = JSONAPISingleResponse<UserResource> & {
  readonly meta: { readonly test_mode: boolean };
};
