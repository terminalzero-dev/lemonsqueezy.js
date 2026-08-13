export const userResponse = {
  meta: { test_mode: true },
  jsonapi: { version: "1.0" },
  links: { self: "https://api.lemonsqueezy.com/v1/users/1" },
  data: {
    type: "users",
    id: "1",
    attributes: {
      name: "Ada Lovelace",
      email: "ada@example.com",
      color: "#898FA9",
      avatar_url: "https://example.com/avatar.png",
      has_custom_avatar: true,
      created_at: "2024-05-24T14:08:31.000000Z",
      updated_at: "2024-08-26T13:24:54.000000Z",
      future_field: "preserved",
    },
    links: { self: "https://api.lemonsqueezy.com/v1/users/1" },
  },
} as const;
