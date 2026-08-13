import type { RequestOptions, ResourceRuntime } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import { getFileOperation, listFilesOperation } from "./contract";
import type {
  FileListResponse,
  FileResponse,
  GetFileParams,
  ListFilesParams,
} from "./types";

export interface FilesNamespace {
  get(
    id: Id,
    params?: GetFileParams,
    options?: RequestOptions,
  ): Promise<FileResponse>;
  list(
    params?: ListFilesParams,
    options?: RequestOptions,
  ): Promise<FileListResponse>;
}

export function createFilesNamespace(runtime: ResourceRuntime): FilesNamespace {
  return Object.freeze({
    async get(id: Id, params: GetFileParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [Id, GetFileParams], FileResponse>(
          getFileOperation,
          [id, params],
          options,
        )
      ).body;
    },
    async list(params: ListFilesParams = {}, options?: RequestOptions) {
      return (
        await runtime.invoke<readonly [ListFilesParams], FileListResponse>(
          listFilesOperation,
          [params],
          options,
        )
      ).body;
    },
  });
}
