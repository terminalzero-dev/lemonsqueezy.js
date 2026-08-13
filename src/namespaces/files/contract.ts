import { compilePathId, compileReadQuery } from "../../internal/v5/request";
import type { OperationContract } from "../../internal/v5/types";
import type { Id } from "../../types/jsonapi";
import type {
  FileListResponse,
  FileResponse,
  GetFileParams,
  ListFilesParams,
} from "./types";

const objectEvidence =
  "https://docs.lemonsqueezy.com/api/files/the-file-object";

export const getFileOperation = {
  key: "files.get",
  compile: ([id, params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: `/v1/files/${compilePathId("fileId", id)}`,
    query: compileReadQuery(params),
  }),
  success: { kind: "jsonapi-single", resourceType: "files" },
  evidence: [
    "https://docs.lemonsqueezy.com/api/files/retrieve-file",
    objectEvidence,
  ],
} as const satisfies OperationContract<
  readonly [Id, GetFileParams],
  FileResponse
>;

export const listFilesOperation = {
  key: "files.list",
  compile: ([params]) => ({
    protocol: "jsonapi",
    method: "GET",
    path: "/v1/files",
    query: compileReadQuery(params, { variantId: "filter[variant_id]" }),
  }),
  success: { kind: "jsonapi-list", resourceType: "files" },
  evidence: [
    "https://docs.lemonsqueezy.com/api/files/list-all-files",
    objectEvidence,
  ],
} as const satisfies OperationContract<
  readonly [ListFilesParams],
  FileListResponse
>;
