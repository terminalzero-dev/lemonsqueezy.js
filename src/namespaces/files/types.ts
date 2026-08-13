import type {
  Id,
  JSONAPIListResponse,
  JSONAPIRelationship,
  JSONAPIResource,
  JSONAPIResourceIdentifier,
  JSONAPISingleResponse,
  OpenString,
} from "../../types/jsonapi";

export interface FileAttributes {
  readonly variant_id: number;
  readonly identifier: string;
  readonly name: string;
  readonly extension: string;
  readonly download_url: string;
  readonly size: number;
  readonly size_formatted: string;
  readonly version: string;
  readonly sort: number;
  readonly status: OpenString<"draft" | "published">;
  readonly created_at: string;
  readonly updated_at: string;
  readonly test_mode: boolean;
}

export interface FileRelationships {
  readonly variant: JSONAPIRelationship<JSONAPIResourceIdentifier<"variants">>;
}

export type FileResource = Omit<
  JSONAPIResource<"files", FileAttributes, FileRelationships>,
  "relationships"
> & { readonly relationships: FileRelationships };
export type FileResponse = JSONAPISingleResponse<FileResource>;
export type FileListResponse = JSONAPIListResponse<FileResource>;

export interface GetFileParams {
  readonly include?: readonly "variant"[];
}

export interface ListFilesParams extends GetFileParams {
  readonly filter?: { readonly variantId?: Id | null };
  readonly page?: {
    readonly number?: number | null;
    readonly size?: number | null;
  };
}
