# Block API Reference

## POST https://api.are.na/v3//v3/blocks

- Label: Create a block
- Docs: https://www.are.na/developers/explore/block/post-block
- Markdown: https://www.are.na/developers/explore/block/post-block.md
- Requires resource id: no
- Response content type: application/json

Creates a new block and connects it to one or more channels.

The `value` field accepts either a URL or text content:
- If `value` is a valid URL, the block type is inferred (Image, Link, Embed, etc.)
- If `value` is plain text, a Text block is created

You can connect the block to multiple channels at once (up to 20).

Specify target channels using either `channels` (preferred) or `channel_ids` (legacy), but not both.
The `channels` form allows per-channel position and connection metadata.

**Authentication required.**

Request body schema:
```json
{
  "type": "object",
  "properties": {
    "value": {
      "type": "string",
      "nullable": false,
      "description": "The content to create a block from. Can be either:\n- A URL (creates Image, Link, or Embed block based on content type)\n- Text/markdown content (creates a Text block)\n",
      "example": "https://example.com/image.jpg"
    },
    "title": {
      "type": "string",
      "nullable": false,
      "description": "Optional title for the block",
      "example": "My Block Title"
    },
    "description": {
      "type": "string",
      "nullable": false,
      "description": "Optional description (supports markdown)",
      "example": "A description of this block"
    },
    "original_source_url": {
      "type": "string",
      "nullable": false,
      "description": "Original source URL for attribution",
      "format": "uri",
      "example": "https://example.com/123"
    },
    "original_source_title": {
      "type": "string",
      "nullable": false,
      "description": "Title of the original source",
      "example": "Example Source"
    },
    "alt_text": {
      "type": "string",
      "nullable": false,
      "description": "Alt text for images (accessibility)",
      "example": "Beige flags"
    },
    "cover_url": {
      "type": "string",
      "nullable": false,
      "description": "Optional cover image URL to use as the visual preview for Link, Attachment, and Embed blocks (overrides the auto-generated screenshot/thumbnail). Ignored for Image and Text blocks.",
      "format": "uri",
      "example": "https://example.com/cover.jpg"
    },
    "metadata": {
      "type": "object",
      "description": "Arbitrary key-value pairs stored on an entity.\nKeys are alphanumeric/underscore, max 40 characters.\nValues are scalars (string, number, boolean). Max 50 keys, 32KB total.\n",
      "required": [],
      "properties": {},
      "additionalProperties": {
        "type": "oneOf",
        "variants": [
          {
            "type": "string",
            "nullable": false
          },
          {
            "type": "number",
            "nullable": false
          },
          {
            "type": "boolean",
            "nullable": false
          }
        ]
      },
      "refName": "Metadata"
    },
    "channel_ids": {
      "type": "array",
      "description": "Array of channel IDs or slugs. Accepts numeric IDs, string IDs, or\nchannel slugs (e.g., `[123, \"456\", \"my-channel-slug\"]`).\n",
      "items": {
        "type": "oneOf",
        "variants": [
          {
            "type": "integer",
            "nullable": false
          },
          {
            "type": "string",
            "nullable": false
          }
        ]
      },
      "refName": "ChannelIds"
    },
    "insert_at": {
      "type": "integer",
      "nullable": false,
      "description": "Position to insert the block in the channel (1-indexed).\nOnly valid when connecting to a single channel.\n",
      "example": 1
    },
    "channels": {
      "type": "array",
      "description": "Target channels with optional per-channel position and connection metadata.",
      "items": {
        "type": "object",
        "description": "A channel to connect to, with optional position and connection metadata.\n",
        "required": [
          "id"
        ],
        "properties": {
          "id": {
            "type": "oneOf",
            "description": "Channel ID or slug.",
            "variants": [
              {
                "type": "integer",
                "nullable": false
              },
              {
                "type": "string",
                "nullable": false
              }
            ]
          },
          "position": {
            "type": "integer",
            "nullable": false,
            "description": "Position to insert at within this channel (1-indexed)."
          },
          "metadata": {
            "type": "object",
            "description": "Arbitrary key-value pairs stored on an entity.\nKeys are alphanumeric/underscore, max 40 characters.\nValues are scalars (string, number, boolean). Max 50 keys, 32KB total.\n",
            "required": [],
            "properties": {},
            "additionalProperties": {
              "type": "oneOf",
              "variants": [
                {
                  "type": "string",
                  "nullable": false
                },
                {
                  "type": "number",
                  "nullable": false
                },
                {
                  "type": "boolean",
                  "nullable": false
                }
              ]
            },
            "refName": "Metadata"
          }
        },
        "refName": "ConnectTo"
      }
    }
  },
  "required": [
    "value"
  ],
  "description": "Input fields for creating a block"
}
```

