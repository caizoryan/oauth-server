# Channel API Reference

OpenAPI source: https://api.are.na/v3/openapi.json

## GET /v3/channels/{id}

- Label: Get a channel
- Docs: https://www.are.na/developers/explore/channel
- Markdown: https://www.are.na/developers/explore/channel.md
- Requires resource id: yes
- Response content type: application/json

Returns detailed information about a specific channel by its ID or slug. Respects visibility rules and user permissions.

Path parameters:
- id: string (required) — Resource ID or slug

