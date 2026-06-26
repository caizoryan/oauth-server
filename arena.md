openapi: 3.1.0
info:
  title: Are.na API
  version: 3.0.0
  contact:
    name: Are.na Support
    url: https://www.are.na/about#contact
    email: help@are.na
  description: |
    The Are.na REST API provides programmatic access to the Are.na platform - a tool for connecting ideas and building knowledge together.

    ## Getting Started

    All API requests use `https://api.are.na` as the base URL. Responses are JSON with consistent structure including hypermedia links for resource discovery.

    ## Authentication

    Most endpoints work without authentication but provide additional access when authenticated. Use the standard `Authorization` header:

    ```
    Authorization: Bearer YOUR_TOKEN
    ```

    **Supported Token Types:**
    - **OAuth2 Access Token**: Obtained via [OAuth2 flow](https://www.are.na/developers/explore/authentication) (supports PKCE)
    - **Personal Access Token**: From [are.na/settings/oauth](https://www.are.na/settings/personal-access-tokens)

    For OAuth2, note that the authorization endpoint is hosted on the main site (`www.are.na/oauth/authorize`),
    while the token endpoint is on the API (`api.are.na/v3/oauth/token`). The authorization endpoint supports
    `read` and `write` scopes (defaulting to `read` if omitted). A typical authorization URL looks like:

    ```
    https://www.are.na/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=read
    ```

    **Authentication Levels:**
    - **Public**: No authentication needed (e.g., `/v3/ping`)
    - **Optional**: Works unauthenticated but respects permissions when authenticated
    - **Required**: Returns `401 Unauthorized` without valid token (e.g., `/v3/me`)

    ## Scopes

    OAuth2 tokens and personal access tokens support the following scopes:

    | Scope | Description |
    |-------|-------------|
    | `read` | Read-only access (default) — write operations will return `403 Forbidden` |
    | `write` | Full read and write access |

    Tokens default to `read` scope. Request `write` scope when creating a token or authorizing an OAuth2 application to enable write access. Read-only tokens can view all resources the user has access to but cannot create, update, or delete anything.

    ## Rate Limiting

    **Acceptable Use**: This API is intended for building applications that integrate with Are.na, not for scraping or bulk data collection. Automated crawling, systematic downloading of content, or any form of structured data harvesting is prohibited. If you need bulk access to data for research or other purposes, please [contact us](mailto:help@are.na) to discuss your use case.

    Rate limits are enforced per-minute based on your tier:

    | Tier | Requests/Minute |
    |------|-----------------|
    | Guest (unauthenticated) | 30 |
    | Free | 120 |
    | Premium | 300 |
    | Supporter/Lifetime | 600 |

    **Rate Limit Headers** (included in every response):
    - `X-RateLimit-Limit`: Your tier's per-minute limit
    - `X-RateLimit-Tier`: Current tier (guest/free/premium/supporter)
    - `X-RateLimit-Window`: Time window in seconds (always 60)
    - `X-RateLimit-Reset`: Unix timestamp when the limit resets

    When you exceed limits, you'll receive a `429 Too Many Requests` response with upgrade recommendations and retry timing.

    ## Request Validation

    All parameters are validated against this OpenAPI specification. Invalid requests return `400 Bad Request` with detailed error messages.

    ## Error Responses

    Errors use standard HTTP status codes with JSON bodies:

    ```json
    {
      "error": "Not Found",
      "code": 404,
      "details": {
        "message": "The resource you requested does not exist"
      }
    }
    ```

    Common status codes:
    - `400`: Invalid request parameters
    - `401`: Authentication required or invalid
    - `403`: Insufficient permissions
    - `404`: Resource not found
    - `408`: Request took too long to process
    - `422`: Well-formed request that could not be processed
    - `429`: Rate limit exceeded

    ## Pagination

    List endpoints return paginated results. Use these query parameters:
    - `page`: Page number (default: 1)
    - `per`: Items per page (default: 24, max: 100)

    Responses include a `meta` object with pagination info:

    ```json
    {
      "data": [...],
      "meta": {
        "current_page": 1,
        "per_page": 25,
        "total_pages": 5,
        "total_count": 120,
        "next_page": 2,
        "prev_page": null,
        "has_more_pages": true
      }
    }
    ```

    ## Best Practices

    Are.na channels and users can contain thousands of items. The following guidelines will help you build responsive, well-behaved integrations.

    ### Paginate, Don't Enumerate

    Never try to load an entire channel or user's content in one pass. Use `page` and `per` parameters to fetch only the data you need right now. Check `meta.has_more_pages` and load subsequent pages on demand rather than in a loop.

    **Do:**
    - Fetch the first page and display it immediately
    - Load more pages as the user scrolls or explicitly requests them

    **Don't:**
    - Loop through all pages at startup to "build a complete picture"
    - Set `per=100` and iterate until `has_more_pages` is `false`

    ### Use HTTP Caching

    All responses include `Cache-Control` and `ETag` headers. Unauthenticated responses are `max-age=300, public` — your client can reuse them for 5 minutes without any network request. Authenticated responses are `private, no-cache` — your client may store them but must revalidate before each reuse.

    To revalidate, send the `ETag` value from a previous response as `If-None-Match`:

    ```
    GET /v3/channels/123
    If-None-Match: "abc123"
    ```

    If the resource hasn't changed, the API returns `304 Not Modified` with no body, saving bandwidth. Single-resource endpoints (e.g., `/v3/channels/:id`, `/v3/blocks/:id`) also skip server-side work entirely on a match. Note that 304 responses still count against your rate limit.

    ### Fetch Summaries Before Details

    Start with lightweight list endpoints (e.g., a channel's first page of contents) before drilling into individual blocks or nested resources. Avoid eagerly resolving every connection or nested object — fetch details only when a user explicitly needs them.

    ### Respect Rate Limits Gracefully

    Monitor the `X-RateLimit-Limit` and `X-RateLimit-Reset` headers. If you receive a `429` response, wait until the reset window before retrying — don't retry in a tight loop. Consider adding exponential backoff and a short delay between sequential requests (e.g., 200–500ms) when making multiple calls.

    ### Design for Partial Data

    Channels can have tens of thousands of connections. Your application should function well with just the first page of results, not require the full dataset upfront. Display what you have and offer the user a way to load more.

    ### Build Statically When Possible

    If you're building a website that displays Are.na content, prefer static site generation (fetching data at build time) over live API requests on every page view. This eliminates rate limit concerns for your visitors and makes your site faster and more resilient. If you need fresher data, cache responses server-side with a reasonable TTL rather than proxying every request through to the API.

    ### Avoid Write-Heavy Loops

    If you're creating or connecting multiple blocks, batch your logic and add delays between write operations. Rapid-fire mutations can hit rate limits quickly and may trigger abuse detection.
servers:
- url: https://api.are.na
  description: Production API
security:
- BearerAuth: []
- {}
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      description: |
        Bearer token authentication.

        Accepts two token types:
        - OAuth2 access tokens (obtained via OAuth2 flow with Doorkeeper)
        - Personal access tokens (from your account settings at are.na/settings)

        Example: `Authorization: Bearer YOUR_TOKEN`
      bearerFormat: token
    OAuth2:
      type: oauth2
      description: |
        OAuth 2.0 authentication. See [RFC 6749](https://tools.ietf.org/html/rfc6749) for details.

        **Supported Flows:**
        - **Authorization Code**: For web and mobile apps with a backend
        - **Authorization Code + PKCE**: For public clients (mobile apps, SPAs) without a client secret
        - **Client Credentials**: For server-to-server integrations

        PKCE ([RFC 7636](https://tools.ietf.org/html/rfc7636)) is supported for enhanced security with
        public clients. Use `code_challenge_method=S256` for best security.

        Access tokens do not expire. Register your application at [are.na/oauth/applications](https://www.are.na/oauth/applications).
      flows:
        authorizationCode:
          authorizationUrl: https://www.are.na/oauth/authorize
          tokenUrl: "/v3/oauth/token"
          scopes:
            write: Full read and write access to your account
            read: Read-only access to your account
        clientCredentials:
          tokenUrl: "/v3/oauth/token"
          scopes:
            write: Full read and write access to your account
            read: Read-only access to your account
  parameters:
    PageParam:
      name: page
      in: query
      required: false
      description: Page number for pagination
      schema:
        type: integer
        minimum: 1
        default: 1
      example: 1
    PerParam:
      name: per
      in: query
      required: false
      description: Number of items per page (max 100)
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 24
      example: 24
    IdParam:
      name: id
      in: path
      required: true
      description: Resource ID
      schema:
        type: integer
    SlugOrIdParam:
      name: id
      in: path
      required: true
      description: Resource ID or slug
      schema:
        type: string
    ConnectionSortParam:
      name: sort
      in: query
      required: false
      description: Sort by the date the relationship was created.
      schema:
        "$ref": "#/components/schemas/ConnectionSort"
      example: created_at_desc
    ContentSortParam:
      name: sort
      in: query
      required: false
      description: Sort by creation or last update time.
      schema:
        "$ref": "#/components/schemas/ContentSort"
      example: created_at_desc
    GroupSortParam:
      name: sort
      in: query
      required: false
      description: Sort groups by name or date.
      schema:
        "$ref": "#/components/schemas/GroupSort"
      example: name_asc
    ChannelContentSortParam:
      name: sort
      in: query
      required: false
      description: |
        Sort channel contents. Use `position` for the owner's manual
        arrangement, or sort by date. Defaults to `position_desc`.
      schema:
        "$ref": "#/components/schemas/ChannelContentSort"
      example: position_desc
    ContentTypeFilterParam:
      name: type
      in: query
      required: false
      description: Filter to a specific content type.
      schema:
        "$ref": "#/components/schemas/ContentTypeFilter"
      example: Image
    LimitParam:
      name: limit
      in: query
      required: false
      description: Number of feed items to return (max 100)
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 24
      example: 24
    CursorNextParam:
      name: next
      in: query
      required: false
      description: |
        Load the **next** page (toward older items — the "load more"
        direction, since feeds are ordered newest-first). Pass back the
        `meta.next_cursor` from a previous response.
      schema:
        type: string
      example: eyJzIjoxNzE3NjEyMzQ1LCJtIjo0MjB9
    CursorPrevParam:
      name: prev
      in: query
      required: false
      description: |
        Load the **previous** page (toward newer items). Pass back the
        `meta.prev_cursor` from a previous response.
      schema:
        type: string
      example: eyJzIjoxNzE3NjEyMzQ1LCJtIjo0MjB9
  responses:
    UnauthorizedResponse:
      description: Unauthorized
      content:
        application/json:
          schema:
            "$ref": "#/components/schemas/Error"
    NotFoundResponse:
      description: Resource not found
      content:
        application/json:
          schema:
            "$ref": "#/components/schemas/Error"
    ValidationErrorResponse:
      description: Validation error
      content:
        application/json:
          schema:
            "$ref": "#/components/schemas/Error"
    ForbiddenResponse:
      description: Forbidden - insufficient permissions to access this resource
      content:
        application/json:
          schema:
            "$ref": "#/components/schemas/Error"
          example:
            error: Forbidden
            code: 403
            details:
              message: You do not have permission to access this resource.
    BadRequestResponse:
      description: Bad request - missing or invalid parameters
      content:
        application/json:
          schema:
            "$ref": "#/components/schemas/Error"
          example:
            error: Bad Request
            code: 400
            details:
              message: body is required
    UnprocessableEntityResponse:
      description: Validation failed - the request was well-formed but contained semantic
        errors
      content:
        application/json:
          schema:
            "$ref": "#/components/schemas/Error"
          example:
            error: Unprocessable Entity
            code: 422
            details:
              message: You've reached your limit of blocks
    RequestTimeoutResponse:
      description: Request timeout - the request took too long to process and was
        canceled
      content:
        application/json:
          schema:
            "$ref": "#/components/schemas/Error"
          example:
            error: Request Timeout
            code: 408
            details:
              message: The request took too long to process and was canceled. Please
                try again or narrow the request.
    RateLimitResponse:
      description: Rate limit exceeded
      headers:
        Retry-After:
          description: Seconds to wait before retrying
          schema:
            type: string
          example: '65'
        X-RateLimit-Limit:
          description: Request limit per minute
          schema:
            type: string
          example: '30'
        X-RateLimit-Tier:
          description: User's current tier
          schema:
            type: string
          example: guest
        X-RateLimit-Window:
          description: Time window in seconds
          schema:
            type: string
          example: '60'
      content:
        application/json:
          schema:
            "$ref": "#/components/schemas/RateLimitError"
  schemas:
    Error:
      type: object
      properties:
        error:
          type: string
          description: Error message
          example: Not Found
        code:
          type: integer
          description: HTTP status code
          example: 404
        details:
          type: object
          description: Additional error details
          properties:
            message:
              type: string
              description: Detailed error message
              example: The resource you are looking for does not exist.
            errors:
              description: Validation errors, when applicable
              oneOf:
              - type: array
                items:
                  type: string
              - type: object
                additionalProperties: true
      required:
      - error
      - code
    RateLimitError:
      type: object
      description: Rate limit exceeded error response with upgrade information and
        suggestions
      properties:
        error:
          type: object
          properties:
            type:
              type: string
              example: rate_limit_exceeded
              description: Error type identifier
            message:
              type: string
              example: Rate limit of 30 requests per minute exceeded for guest tier.
                Try again later.
              description: Human-readable error message
            tier:
              "$ref": "#/components/schemas/UserTier"
              example: guest
              description: User's current tier
            limit:
              type: integer
              example: 30
              description: Request limit per minute for this tier
            limit_window:
              type: string
              example: 1 minute
              description: Time window for rate limits
            retry_after:
              type: integer
              example: 65
              description: Suggested seconds to wait before retrying
            current_status:
              type: object
              properties:
                tier:
                  type: string
                  example: guest
                limits:
                  type: object
                  example:
                    guest: 30
                    free: 120
                    premium: 300
                    supporter: 600
                upgrade_path:
                  type: object
                  properties:
                    current:
                      type: string
                      example: Guest (30 req/min)
                    recommended:
                      type: string
                      example: Free Account (120 req/min)
                    benefits:
                      type: array
                      items:
                        type: string
                      example:
                      - 4x higher rate limit
                      - Persistent authentication
                      - API access
                    action:
                      type: string
                      example: Sign up at https://are.na/signup
            suggestions:
              type: array
              items:
                type: string
              example:
              - Sign up for a free account to get 120 requests per minute
              - Implement exponential backoff with jitter
              - Cache responses when possible to reduce API calls
              - Consider batch requests if available
              description: Tier-specific optimization suggestions
            headers_note:
              type: string
              example: Check 'X-RateLimit-*' headers on successful requests for current
                usage
              description: Information about header usage
          required:
          - type
          - message
          - tier
          - limit
          - retry_after
          - suggestions
      required:
      - error
    Links:
      type: object
      description: "HATEOAS links for navigation and discovery.\nFollows HAL (Hypertext
        Application Language) format where link relationships \nare expressed as object
        keys (e.g., \"self\", \"user\", \"channels\").\n"
      properties:
        self:
          "$ref": "#/components/schemas/Link"
          description: Link to the current resource (always present)
      required:
      - self
      additionalProperties:
        "$ref": "#/components/schemas/Link"
    Link:
      type: object
      description: |
        A hypermedia link containing the URL of a linked resource.
        The relationship type is expressed by the key in the parent _links object.
      properties:
        href:
          type: string
          format: uri
          description: The URL of the linked resource
          example: https://api.are.na/v3/blocks/12345
      required:
      - href
    MarkdownContent:
      type: object
      description: Markdown content with multiple renderings
      properties:
        markdown:
          type: string
          description: Original markdown value
          example: This is **only** a [test](https://example.com).
        html:
          type: string
          description: HTML rendering of the markdown
          example: <p>This is <strong>only</strong> a <a href="https://example.com"
            target="_blank" rel="nofollow noopener">test</a>.</p>
        plain:
          type: string
          description: Plain text rendering of the markdown
          example: This is only a test (https://example.com).
      required:
      - markdown
      - html
      - plain
    EmbeddedUser:
      type: object
      description: Embedded user representation (used when user is nested in other
        resources)
      properties:
        id:
          type: integer
          description: Unique identifier for the user
          example: 12345
        type:
          type: string
          description: User type
          enum:
          - User
          example: User
        name:
          type: string
          description: User's display name
          example: John Doe
        slug:
          type: string
          description: URL-safe identifier (use this in API paths)
          example: john-doe
        avatar:
          type:
          - string
          - 'null'
          format: uri
          description: URL to user's avatar image
          example: https://d2w9rnfcy7mm78.cloudfront.net/12345/avatar.jpg
        initials:
          type: string
          description: User's initials
          example: JD
      required:
      - id
      - type
      - name
      - slug
      - avatar
      - initials
    Metadata:
      type: object
      description: |
        Arbitrary key-value pairs stored on an entity.
        Keys are alphanumeric/underscore, max 40 characters.
        Values are scalars (string, number, boolean). Max 50 keys, 32KB total.
      additionalProperties:
        oneOf:
        - type: string
          maxLength: 2000
        - type: number
        - type: boolean
      maxProperties: 50
      example:
        status: reviewed
        score: 0.95
        featured: true
    MetadataInput:
      type: object
      description: |
        Arbitrary key-value pairs to set on an entity. Uses merge semantics:
        new keys are added, existing keys are updated, keys set to null are removed.
        Keys must be alphanumeric/underscore, max 40 characters.
        Values must be scalars (string, number, boolean) or null (to delete). Max 50 keys, 32KB total.
      additionalProperties:
        oneOf:
        - type: string
          maxLength: 2000
        - type: number
        - type: boolean
        - type: 'null'
      maxProperties: 50
    EmbeddedConnection:
      type: object
      description: Embedded connection representation used when connection is nested
        in other resources
      properties:
        id:
          type: integer
          description: Unique identifier for the connection
          example: 98765
        position:
          type: integer
          description: Position of the item within the channel (1-indexed)
          example: 1
        pinned:
          type: boolean
          description: Whether the item is pinned
          example: false
        metadata:
          oneOf:
          - "$ref": "#/components/schemas/Metadata"
          - type: 'null'
          description: Custom key-value metadata
        connected_at:
          type: string
          format: date-time
          description: When the item was connected
          example: '2023-01-15T10:30:00Z'
        connected_by:
          oneOf:
          - "$ref": "#/components/schemas/EmbeddedUser"
          - type: 'null'
          description: User who created this connection
      required:
      - id
      - position
      - pinned
      - connected_at
      - connected_by
    Connection:
      description: |
        Full connection resource with abilities and links.
        Used for GET /v3/connections/:id
      allOf:
      - "$ref": "#/components/schemas/EmbeddedConnection"
      - type: object
        properties:
          can:
            "$ref": "#/components/schemas/ConnectionAbilities"
          _links:
            "$ref": "#/components/schemas/Links"
        required:
        - can
        - _links
    ConnectionAbilities:
      type: object
      description: Actions the current user can perform on this connection
      properties:
        remove:
          type: boolean
          description: Whether the user can remove this connection
          example: true
      required:
      - remove
    EmbeddedGroup:
      type: object
      description: Embedded group representation (used when group is nested in other
        resources)
      properties:
        id:
          type: integer
          description: Unique identifier for the group
          example: 67890
        type:
          type: string
          description: Group type
          enum:
          - Group
          example: Group
        name:
          type: string
          description: Group's name
          example: Design Team
        slug:
          type: string
          description: Group's URL slug
          example: design-team-abc123
        avatar:
          type:
          - string
          - 'null'
          format: uri
          description: URL to group's avatar image
          example: https://d2w9rnfcy7mm78.cloudfront.net/groups/67890/avatar.jpg
        initials:
          type: string
          description: Group's initials
          example: DT
      required:
      - id
      - type
      - name
      - slug
      - avatar
      - initials
    User:
      description: Full user representation
      allOf:
      - "$ref": "#/components/schemas/EmbeddedUser"
      - type: object
        properties:
          created_at:
            type: string
            format: date-time
            description: When the user was created
            example: '2023-01-15T10:30:00Z'
          updated_at:
            type: string
            format: date-time
            description: When the user was last updated
            example: '2023-06-20T14:45:00Z'
          bio:
            oneOf:
            - "$ref": "#/components/schemas/MarkdownContent"
            - type: 'null'
            description: User biography with markdown, HTML, and plain text renderings
          badge:
            oneOf:
            - "$ref": "#/components/schemas/UserBadge"
            - type: 'null'
            description: Denotes plan or other distinction
          tier:
            "$ref": "#/components/schemas/UserTier"
            description: User's subscription tier
          counts:
            "$ref": "#/components/schemas/UserCounts"
          _links:
            "$ref": "#/components/schemas/Links"
            description: HATEOAS links for navigation
        required:
        - created_at
        - updated_at
        - badge
        - tier
        - counts
        - _links
    Me:
      description: |
        The authenticated user's own profile, returned by `GET /v3/me`.
        Extends `User` with the token holder's email address. This field is
        intentionally not present on `/v3/users/{id}` or on embedded `User`
        references nested in other resources.
      allOf:
      - "$ref": "#/components/schemas/User"
      - type: object
        properties:
          counts:
            "$ref": "#/components/schemas/MeCounts"
          email:
            type: string
            format: email
            description: The authenticated user's email address.
            example: jane@example.com
        required:
        - email
    UserCounts:
      type: object
      description: Counts of various items for the user
      properties:
        channels:
          type: integer
          description: Number of channels owned by the user
          example: 24
        followers:
          type: integer
          description: Number of followers
          example: 156
        following:
          type: integer
          description: Number of users being followed
          example: 89
      required:
      - channels
      - followers
      - following
    MeCounts:
      description: Counts for the authenticated user, including private notification
        state.
      allOf:
      - "$ref": "#/components/schemas/UserCounts"
      - type: object
        properties:
          notifications:
            type: integer
            description: Number of unread notifications for the authenticated user
            example: 3
        required:
        - notifications
    Group:
      description: Full group representation
      allOf:
      - "$ref": "#/components/schemas/EmbeddedGroup"
      - type: object
        properties:
          description:
            oneOf:
            - "$ref": "#/components/schemas/MarkdownContent"
            - type: 'null'
            description: Group description with markdown, HTML, and plain text renderings
          created_at:
            type: string
            format: date-time
            description: When the group was created
            example: '2023-01-15T10:30:00Z'
          updated_at:
            type: string
            format: date-time
            description: When the group was last updated
            example: '2023-06-20T14:45:00Z'
          user:
            "$ref": "#/components/schemas/EmbeddedUser"
            description: User who owns/created the group
          counts:
            "$ref": "#/components/schemas/GroupCounts"
          can:
            "$ref": "#/components/schemas/GroupAbilities"
            description: Actions the current user can perform on the group
          _links:
            "$ref": "#/components/schemas/Links"
            description: HATEOAS links for navigation
        required:
        - created_at
        - updated_at
        - user
        - counts
        - can
        - _links
    GroupCounts:
      type: object
      description: Counts of various items for the group
      properties:
        channels:
          type: integer
          description: Number of channels owned by the group
          example: 12
        users:
          type: integer
          description: Number of users in the group
          example: 5
      required:
      - channels
      - users
    MembershipInvitation:
      type: object
      description: |
        Pending invitation for a user to join a group.

        Invitee acceptance and decline currently happen through the Are.na web
        UI using tokenized invitation links sent by email. The web UI uses the
        GraphQL `acceptMembershipInvitation` and `declineMembershipInvitation`
        mutations; this REST surface only exposes group-manager list and revoke
        operations.
      properties:
        id:
          type: integer
          description: Unique identifier for the invitation
          example: 12345
        type:
          type: string
          enum:
          - MembershipInvitation
          example: MembershipInvitation
        target:
          "$ref": "#/components/schemas/EmbeddedGroup"
          description: Group the invitee is invited to join
        invitee:
          oneOf:
          - "$ref": "#/components/schemas/EmbeddedUser"
          - type: 'null'
          description: User being invited, when available
        invitee_email:
          type:
          - string
          - 'null'
          format: email
          description: Email address being invited, visible to users who can manage
            invitations
          example: invitee@example.com
        invited_by:
          "$ref": "#/components/schemas/EmbeddedUser"
          description: User who created the invitation
        state:
          type: string
          enum:
          - pending
          - accepted
          - declined
          - revoked
          example: pending
        accepted_at:
          type:
          - string
          - 'null'
          format: date-time
          description: When the invitation was accepted
          example: 
        created_at:
          type: string
          format: date-time
          description: When the invitation was created
          example: '2023-01-15T10:30:00Z'
        updated_at:
          type: string
          format: date-time
          description: When the invitation was last updated
          example: '2023-01-15T10:30:00Z'
        _links:
          type: object
          description: |
            Links for navigation. Empty today because no public endpoint
            addresses an invitation directly; reserved for future use.
          additionalProperties: true
      required:
      - id
      - type
      - target
      - invitee
      - invitee_email
      - invited_by
      - state
      - accepted_at
      - created_at
      - updated_at
      - _links
    GroupInvite:
      type: object
      description: Shareable invite code for joining a group
      properties:
        id:
          type: integer
          description: Unique identifier for the invite code
          example: 12345
        type:
          type: string
          enum:
          - GroupInvite
          example: GroupInvite
        code:
          type: string
          description: Invite code required to join the group
          example: abc123xyz
        url:
          type: string
          format: uri
          description: Public Are.na URL for accepting the group invite
          example: https://www.are.na/group/research-studio/invite/abc123xyz
        created_at:
          type: string
          format: date-time
          description: When the invite code was created
          example: '2023-01-15T10:30:00Z'
        updated_at:
          type: string
          format: date-time
          description: When the invite code was last updated
          example: '2023-01-15T10:30:00Z'
        _links:
          "$ref": "#/components/schemas/Links"
          description: HATEOAS links for navigation
      required:
      - id
      - type
      - code
      - url
      - created_at
      - updated_at
      - _links
    GroupMember:
      description: Group member entry, including the group owner and any collaborators
      allOf:
      - "$ref": "#/components/schemas/EmbeddedUser"
      - type: object
        properties:
          role:
            type: string
            enum:
            - owner
            - member
            description: |
              The user's role on the group. `owner` is the group's creator;
              `member` is anyone else with a group membership.
            example: member
        required:
        - role
    GroupMemberList:
      type: object
      description: Data payload containing an array of group members
      properties:
        data:
          type: array
          description: Array of group members (owner first on page 1)
          items:
            "$ref": "#/components/schemas/GroupMember"
      required:
      - data
    GroupMemberListResponse:
      description: Paginated list of group members with total count
      allOf:
      - "$ref": "#/components/schemas/GroupMemberList"
      - "$ref": "#/components/schemas/PaginatedResponse"
    MembershipInvitationList:
      type: object
      description: Data payload containing an array of membership invitations
      properties:
        data:
          type: array
          description: Array of pending membership invitations
          items:
            "$ref": "#/components/schemas/MembershipInvitation"
      required:
      - data
    MembershipInvitationListResponse:
      description: Paginated list of pending membership invitations
      allOf:
      - "$ref": "#/components/schemas/MembershipInvitationList"
      - "$ref": "#/components/schemas/PaginatedResponse"
    GroupMemberInviteOutcome:
      type: string
      description: |
        Discriminator for the result of `POST /v3/groups/{id}/invitations`.

        - `added`: A new group membership was created (the invitee already
          follows the caller, so the invite/accept round trip was skipped).
        - `invited`: A new pending invitation was created and an email was sent.
        - `invitation_pending`: An open invitation for this user/email already
          existed; that invitation is returned unchanged.
        - `already_member`: The user is already a group member; no action was
          taken.
      enum:
      - added
      - invited
      - invitation_pending
      - already_member
    GroupMemberInviteResponse:
      type: object
      description: |
        Result of `POST /v3/groups/{id}/invitations`. Inspect `outcome` to
        determine what happened; HTTP status mirrors it (`201` for created outcomes,
        `200` for no-op outcomes).
      properties:
        outcome:
          "$ref": "#/components/schemas/GroupMemberInviteOutcome"
        user:
          oneOf:
          - "$ref": "#/components/schemas/EmbeddedUser"
          - type: 'null'
          description: |
            The user that this request resolved to, when known. Null only when
            an invitation was issued by email and no matching user exists yet.
        invitation:
          oneOf:
          - "$ref": "#/components/schemas/MembershipInvitation"
          - type: 'null'
          description: |
            The invitation associated with this request, for `invited` and
            `invitation_pending` outcomes.
      required:
      - outcome
      - user
      - invitation
    UserBadge:
      type: string
      description: |
        Denotes plan or other distinction:
        - `staff`: Are.na staff member
        - `investor`: Investor
        - `supporter`: Supporter subscriber
        - `premium`: Premium subscriber
      enum:
      - staff
      - investor
      - supporter
      - premium
    UserTier:
      type: string
      description: |
        User subscription tier:
        - `guest`: Unauthenticated user
        - `free`: Free account
        - `premium`: Premium subscriber
        - `supporter`: Supporter tier
      enum:
      - guest
      - free
      - premium
      - supporter
    BlockState:
      type: string
      description: |
        Processing state of a block.
        - `processing`: Being processed (e.g., image resizing)
        - `available`: Ready for display
        - `failed`: Processing failed
      enum:
      - processing
      - available
      - failed
    BlockVisibility:
      type: string
      description: |
        Visibility of a block.
        - `public`: Visible to everyone
        - `private`: Only visible to owner
        - `orphan`: Not connected to any channel
      enum:
      - public
      - private
      - orphan
    ChannelState:
      type: string
      description: |
        Lifecycle state of a channel.
        - `available`: Active and accessible
        - `deleted`: Soft deleted
      enum:
      - available
      - deleted
    ConnectionFilter:
      type: string
      description: |
        Filter connections by who created them.
        - `ALL`: All connections (default)
        - `OWN`: Only connections by the current user
        - `EXCLUDE_OWN`: Exclude connections by the current user
      enum:
      - ALL
      - OWN
      - EXCLUDE_OWN
    FollowableType:
      type: string
      description: |
        Type of entity that can be followed.
        - `User`: A user
        - `Channel`: A channel
        - `Group`: A group
      enum:
      - User
      - Channel
      - Group
    ConnectableType:
      type: string
      description: |
        Type of entity that can be connected to a channel.
        - `Block`: A block
        - `Channel`: A channel
      enum:
      - Block
      - Channel
    ContentTypeFilter:
      type: string
      description: |
        Filter by content type.
        - `Text`: Text blocks
        - `Image`: Image blocks
        - `Link`: Link blocks
        - `Attachment`: File attachments
        - `Embed`: Embedded media (video, audio, etc.)
        - `Channel`: Channels only
        - `Block`: All block types (excludes channels)
      enum:
      - Text
      - Image
      - Link
      - Attachment
      - Embed
      - Channel
      - Block
    SearchTypeFilter:
      type: string
      description: |
        Filter by content type. Includes users and groups.
        - `All`: Everything (default)
        - `Text`, `Image`, `Link`, `Attachment`, `Embed`: Block types
        - `Block`: All block types
        - `Channel`: Channels only
        - `User`: Users only
        - `Group`: Groups only
      enum:
      - All
      - Text
      - Image
      - Link
      - Attachment
      - Embed
      - Channel
      - Block
      - User
      - Group
    FileExtension:
      type: string
      description: |
        File extension for filtering attachment and image blocks.
        Common values: pdf, jpg, png, gif, mp4, mp3, doc, xls.
      enum:
      - aac
      - ai
      - aiff
      - avi
      - avif
      - bmp
      - csv
      - doc
      - docx
      - eps
      - epub
      - fla
      - gif
      - h264
      - heic
      - heif
      - ind
      - indd
      - jpeg
      - jpg
      - key
      - kml
      - kmz
      - latex
      - m4a
      - ma
      - mb
      - mid
      - midi
      - mov
      - mp3
      - mp4
      - mp4v
      - mpeg
      - mpg
      - mpg4
      - numbers
      - oga
      - ogg
      - ogv
      - otf
      - pages
      - pdf
      - pgp
      - png
      - ppt
      - pptx
      - psd
      - svg
      - swa
      - swf
      - tex
      - texi
      - texinfo
      - tfm
      - tif
      - tiff
      - torrent
      - ttc
      - ttf
      - txt
      - wav
      - webm
      - webp
      - wma
      - xls
      - xlsx
      - xlt
    ConnectionSort:
      type: string
      description: |
        Sort order for relationship lists.
        - `created_at_desc`: Newest first (default)
        - `created_at_asc`: Oldest first
      enum:
      - created_at_desc
      - created_at_asc
    ChannelContentSort:
      type: string
      description: |
        Sort order for channel contents.
        - `position_asc`: Manual order (default)
        - `position_desc`: Manual order, reversed
        - `created_at_desc`: Newest first
        - `created_at_asc`: Oldest first
        - `updated_at_desc`: Recently updated first
        - `updated_at_asc`: Least recently updated first
      enum:
      - position_asc
      - position_desc
      - created_at_asc
      - created_at_desc
      - updated_at_asc
      - updated_at_desc
    ContentSort:
      type: string
      description: |
        Sort order for user or group content.
        - `created_at_desc`: Newest first (default)
        - `created_at_asc`: Oldest first
        - `updated_at_desc`: Recently updated first
        - `updated_at_asc`: Least recently updated first
      enum:
      - created_at_asc
      - created_at_desc
      - updated_at_asc
      - updated_at_desc
    GroupSort:
      type: string
      description: |
        Sort order for groups.
        - `name_asc`: Alphabetical (default)
        - `name_desc`: Reverse alphabetical
        - `created_at_desc`: Newest first
        - `created_at_asc`: Oldest first
        - `updated_at_desc`: Recently updated first
        - `updated_at_asc`: Least recently updated first
      enum:
      - name_asc
      - name_desc
      - created_at_asc
      - created_at_desc
      - updated_at_asc
      - updated_at_desc
    SearchScope:
      type: string
      description: |
        Limit search to a specific context.
        - `all`: Everything accessible to the user (default)
        - `my`: Only the current user's own content
        - `following`: Content from followed users and channels
      enum:
      - all
      - my
      - following
    SearchSort:
      type: string
      description: |
        Sort order for search results.
        - `score_desc`: Most relevant first (default)
        - `created_at_desc`: Newest first
        - `created_at_asc`: Oldest first
        - `updated_at_desc`: Recently updated first
        - `updated_at_asc`: Least recently updated first
        - `name_asc`: Alphabetical A-Z
        - `name_desc`: Alphabetical Z-A
        - `connections_count_desc`: Most connected first
        - `random`: Random (use `seed` for reproducibility)
      enum:
      - score_desc
      - created_at_desc
      - created_at_asc
      - updated_at_desc
      - updated_at_asc
      - name_asc
      - name_desc
      - connections_count_desc
      - random
    ChannelVisibility:
      type: string
      description: |
        Visibility level of a channel:
        - `public`: Anyone can view and connect to the channel
        - `private`: Only the owner and collaborators can view
        - `closed`: Anyone can view, but only collaborators can add content
      enum:
      - public
      - private
      - closed
    Movement:
      type: string
      description: |
        Movement action for repositioning a connection within a channel.
        "Top" refers to the visually first position (newest items appear at the top).
        - `insert_at`: Move to a specific position (requires `position` parameter)
        - `move_to_top`: Move to the visually first position
        - `move_to_bottom`: Move to the visually last position
        - `move_up`: Move one position up (towards the top)
        - `move_down`: Move one position down (towards the bottom)
      enum:
      - insert_at
      - move_to_top
      - move_to_bottom
      - move_up
      - move_down
    ChannelIds:
      type: array
      description: |
        Array of channel IDs or slugs. Accepts numeric IDs, string IDs, or
        channel slugs (e.g., `[123, "456", "my-channel-slug"]`).
      items:
        oneOf:
        - type: integer
        - type: string
      minItems: 1
      maxItems: 20
      example:
      - 123
      - my-channel
    ConnectTo:
      type: object
      description: 'A channel to connect to, with optional position and connection
        metadata.

        '
      required:
      - id
      properties:
        id:
          oneOf:
          - type: integer
          - type: string
          description: Channel ID or slug.
        position:
          type: integer
          description: Position to insert at within this channel (1-indexed).
        metadata:
          "$ref": "#/components/schemas/Metadata"
          description: Connection metadata for this specific connection.
    PresignedFile:
      type: object
      description: A presigned S3 upload URL for a single file
      properties:
        upload_url:
          type: string
          format: uri
          description: |
            Presigned S3 PUT URL. Upload your file by sending a PUT request
            to this URL with the file bytes as the body and the `Content-Type`
            header matching the content_type you specified.
          example: https://s3.amazonaws.com/arena_images-temp/uploads/550e8400-e29b-41d4-a716-446655440000/photo.jpg?X-Amz-...
        key:
          type: string
          description: The S3 object key where the file will be stored
          example: uploads/550e8400-e29b-41d4-a716-446655440000/photo.jpg
        content_type:
          type: string
          description: The content type that was validated and should be used in the
            PUT request
          example: image/jpeg
      required:
      - upload_url
      - key
      - content_type
    PresignResponse:
      type: object
      description: Response containing presigned S3 upload URLs
      properties:
        files:
          type: array
          description: Presigned URLs for each requested file
          items:
            "$ref": "#/components/schemas/PresignedFile"
        expires_in:
          type: integer
          description: Seconds until the presigned URLs expire
          example: 3600
      required:
      - files
      - expires_in
    BlockInput:
      type: object
      description: Input fields for creating a block
      properties:
        value:
          type: string
          description: |
            The content to create a block from. Can be either:
            - A URL (creates Image, Link, or Embed block based on content type)
            - Text/markdown content (creates a Text block)
          example: https://example.com/image.jpg
        title:
          type: string
          description: Optional title for the block
          example: My Block Title
        description:
          type: string
          description: Optional description (supports markdown)
          example: A description of this block
        original_source_url:
          type: string
          format: uri
          description: Original source URL for attribution
          example: https://example.com/123
        original_source_title:
          type: string
          description: Title of the original source
          example: Example Source
        alt_text:
          type: string
          description: Alt text for images (accessibility)
          example: Beige flags
        metadata:
          "$ref": "#/components/schemas/Metadata"
          description: Custom key-value metadata to set on the new block.
      required:
      - value
    BatchResponse:
      type: object
      description: Response returned when a batch is accepted for processing
      properties:
        batch_id:
          type: string
          format: uuid
          description: Unique identifier for this batch
          example: 550e8400-e29b-41d4-a716-446655440000
        status:
          type: string
          enum:
          - pending
          description: Initial status of the batch
        total:
          type: integer
          description: Total number of blocks queued for creation
          example: 10
      required:
      - batch_id
      - status
      - total
    BatchStatus:
      type: object
      description: Current status of a batch processing job
      properties:
        batch_id:
          type: string
          format: uuid
          description: Unique identifier for this batch
        status:
          type: string
          enum:
          - pending
          - processing
          - completed
          - failed
          description: Current processing status
        total:
          type: integer
          description: Total number of blocks in the batch
        successful_count:
          type: integer
          description: Number of blocks created so far
        failed_count:
          type: integer
          description: Number of blocks that failed
        successful:
          type: array
          description: Successfully created blocks
          items:
            type: object
            properties:
              index:
                type: integer
                description: Original index in the request array
              block_id:
                type: integer
                description: ID of the created block
            required:
            - index
            - block_id
        failed:
          type: array
          description: Blocks that failed to create
          items:
            type: object
            properties:
              index:
                type: integer
                description: Original index in the request array
              error:
                type: string
                description: Error message
            required:
            - index
            - error
        created_at:
          type: string
          format: date-time
          description: When the batch was submitted
        completed_at:
          type: string
          format: date-time
          description: When the batch finished processing (present when completed
            or failed)
        error:
          type: string
          description: Top-level error message if the entire batch failed
      required:
      - batch_id
      - status
      - total
      - successful_count
      - failed_count
    Block:
      description: |
        A block is a piece of content on Are.na. Blocks come in different types,
        each with its own set of fields. Use the `type` field to determine which
        fields are available.
      oneOf:
      - "$ref": "#/components/schemas/TextBlock"
      - "$ref": "#/components/schemas/ImageBlock"
      - "$ref": "#/components/schemas/LinkBlock"
      - "$ref": "#/components/schemas/AttachmentBlock"
      - "$ref": "#/components/schemas/EmbedBlock"
      - "$ref": "#/components/schemas/PendingBlock"
      discriminator:
        propertyName: type
        mapping:
          Text: "#/components/schemas/TextBlock"
          Image: "#/components/schemas/ImageBlock"
          Link: "#/components/schemas/LinkBlock"
          Attachment: "#/components/schemas/AttachmentBlock"
          Embed: "#/components/schemas/EmbedBlock"
          PendingBlock: "#/components/schemas/PendingBlock"
    BaseBlockProperties:
      type: object
      description: Common properties shared by all block types
      properties:
        id:
          type: integer
          description: Unique identifier for the block
          example: 12345
        base_type:
          type: string
          description: Base type of the block (always "Block")
          enum:
          - Block
          example: Block
        title:
          type:
          - string
          - 'null'
          description: Block title
          example: Interesting Article
        description:
          oneOf:
          - "$ref": "#/components/schemas/MarkdownContent"
          - type: 'null'
          description: Block description with multiple renderings
        state:
          "$ref": "#/components/schemas/BlockState"
          example: available
        visibility:
          "$ref": "#/components/schemas/BlockVisibility"
          example: public
        comment_count:
          type: integer
          description: Number of comments on the block
          example: 5
        created_at:
          type: string
          format: date-time
          description: When the block was created
          example: '2023-01-15T10:30:00Z'
        updated_at:
          type: string
          format: date-time
          description: When the block was last updated
          example: '2023-01-15T14:45:00Z'
        user:
          "$ref": "#/components/schemas/EmbeddedUser"
        metadata:
          oneOf:
          - "$ref": "#/components/schemas/Metadata"
          - type: 'null'
          description: Custom key-value metadata
        source:
          oneOf:
          - "$ref": "#/components/schemas/BlockSource"
          - type: 'null'
          description: Source URL and metadata (if block was created from a URL)
        _links:
          "$ref": "#/components/schemas/Links"
          description: HATEOAS links for navigation
        connection:
          oneOf:
          - "$ref": "#/components/schemas/EmbeddedConnection"
          - type: 'null'
          description: |
            Connection context (only present when block is returned as part of channel contents).
            Contains position, pinned status, and information about who connected the block.
        can:
          oneOf:
          - "$ref": "#/components/schemas/BlockAbilities"
          - type: 'null'
          description: |
            Abilities object (only present for full block responses, not in channel contents).
            Indicates what actions the current user can perform on this block.
      required:
      - id
      - base_type
      - state
      - visibility
      - comment_count
      - created_at
      - updated_at
      - user
      - _links
    BlockAbilities:
      type: object
      description: Actions the current user can perform on the block
      properties:
        manage:
          type: boolean
          description: Whether the user can manage (update/delete) this block
          example: true
        comment:
          type: boolean
          description: Whether the user can comment on this block
          example: true
        connect:
          type: boolean
          description: Whether the user can connect this block to channels
          example: true
      required:
      - manage
      - comment
      - connect
    TextBlock:
      description: A text block containing markdown content
      allOf:
      - "$ref": "#/components/schemas/BaseBlockProperties"
      - type: object
        properties:
          type:
            type: string
            enum:
            - Text
            description: Block type (always "Text" for TextBlock)
          content:
            "$ref": "#/components/schemas/MarkdownContent"
            description: Text content with markdown, HTML, and plain text renderings
        required:
        - type
        - content
    ImageBlock:
      description: An image block containing an uploaded or scraped image
      allOf:
      - "$ref": "#/components/schemas/BaseBlockProperties"
      - type: object
        properties:
          type:
            type: string
            enum:
            - Image
            description: Block type (always "Image" for ImageBlock)
          image:
            "$ref": "#/components/schemas/BlockImage"
            description: Image data with multiple resolutions
        required:
        - type
        - image
    LinkBlock:
      description: A link block representing a URL with optional preview
      allOf:
      - "$ref": "#/components/schemas/BaseBlockProperties"
      - type: object
        properties:
          type:
            type: string
            enum:
            - Link
            description: Block type (always "Link" for LinkBlock)
          image:
            oneOf:
            - "$ref": "#/components/schemas/BlockImage"
            - type: 'null'
            description: Preview image (if available)
          content:
            oneOf:
            - "$ref": "#/components/schemas/MarkdownContent"
            - type: 'null'
            description: Extracted text content from the link
        required:
        - type
    AttachmentBlock:
      description: An attachment block containing an uploaded file
      allOf:
      - "$ref": "#/components/schemas/BaseBlockProperties"
      - type: object
        properties:
          type:
            type: string
            enum:
            - Attachment
            description: Block type (always "Attachment" for AttachmentBlock)
          attachment:
            "$ref": "#/components/schemas/BlockAttachment"
            description: Attachment file data
          image:
            oneOf:
            - "$ref": "#/components/schemas/BlockImage"
            - type: 'null'
            description: Preview image (for PDFs and other previewable files)
        required:
        - type
        - attachment
    EmbedBlock:
      description: An embed block containing embedded media (video, audio, etc.)
      allOf:
      - "$ref": "#/components/schemas/BaseBlockProperties"
      - type: object
        properties:
          type:
            type: string
            enum:
            - Embed
            description: Block type (always "Embed" for EmbedBlock)
          embed:
            "$ref": "#/components/schemas/BlockEmbed"
            description: Embed data including HTML and dimensions
          image:
            oneOf:
            - "$ref": "#/components/schemas/BlockImage"
            - type: 'null'
            description: Thumbnail image (if available)
        required:
        - type
        - embed
    PendingBlock:
      description: |
        A block that is currently being processed. The final type (Text, Image, Link, etc.)
        will be determined once processing completes. Check the `state` field for processing status.
      allOf:
      - "$ref": "#/components/schemas/BaseBlockProperties"
      - type: object
        properties:
          type:
            type: string
            enum:
            - PendingBlock
            description: Block type (always "PendingBlock" for blocks being processed)
        required:
        - type
    BlockSource:
      type: object
      properties:
        url:
          type: string
          format: uri
          description: Source URL
          example: https://example.com/article
        title:
          type:
          - string
          - 'null'
          description: Source title
          example: Original Article Title
        provider:
          oneOf:
          - "$ref": "#/components/schemas/BlockProvider"
          - type: 'null'
      required:
      - url
    BlockProvider:
      type: object
      properties:
        name:
          type: string
          description: Provider name (from parsed URI host)
          example: Example.com
        url:
          type: string
          format: uri
          description: Provider URL (from parsed URI scheme and host)
          example: https://example.com
      required:
      - name
      - url
    BlockImage:
      type: object
      properties:
        alt_text:
          type:
          - string
          - 'null'
          description: Alternative text associated with the image
          example: Scanned collage of magazine cutouts
        blurhash:
          type:
          - string
          - 'null'
          description: BlurHash representation of the image for progressive loading
          example: LEHV6nWB2yk8pyo0adR*.7kCMdnj
        width:
          type:
          - integer
          - 'null'
          description: Original image width in pixels
          example: 1920
        height:
          type:
          - integer
          - 'null'
          description: Original image height in pixels
          example: 1080
        src:
          type: string
          format: uri
          description: URL to the original image
          example: https://d2w9rnfcy7mm78.cloudfront.net/12345/original_image.jpg
        aspect_ratio:
          type:
          - number
          - 'null'
          format: float
          description: Image aspect ratio (width / height)
          example: 1.7778
        content_type:
          type: string
          description: Image content type
          example: image/jpeg
        filename:
          type: string
          description: Image filename
          example: image.jpg
        file_size:
          type:
          - integer
          - 'null'
          description: File size in bytes
          example: 1024000
        updated_at:
          type: string
          format: date-time
          description: When the image was last updated
          example: '2023-01-15T14:45:00Z'
        small:
          "$ref": "#/components/schemas/ImageVersion"
          description: Small image version (thumb)
        medium:
          "$ref": "#/components/schemas/ImageVersion"
          description: Medium image version (display)
        large:
          "$ref": "#/components/schemas/ImageVersion"
          description: Large image version
        square:
          "$ref": "#/components/schemas/ImageVersion"
          description: Square cropped image version
      required:
      - small
      - medium
      - large
      - square
    ImageVersion:
      type: object
      description: A resized/processed version of an image with multiple resolution
        URLs
      properties:
        src:
          type: string
          format: uri
          description: Default image URL (1x resolution)
          example: https://d2w9rnfcy7mm78.cloudfront.net/12345/display_image.jpg
        src_2x:
          type: string
          format: uri
          description: 2x resolution image URL for high DPI displays
          example: https://d2w9rnfcy7mm78.cloudfront.net/12345/display_image@2x.jpg
        width:
          type:
          - integer
          - 'null'
          description: Width of the resized image in pixels
          example: 640
        height:
          type:
          - integer
          - 'null'
          description: Height of the resized image in pixels
          example: 480
      required:
      - src
      - src_2x
    BlockEmbed:
      type: object
      properties:
        url:
          type:
          - string
          - 'null'
          format: uri
          description: Embed URL
          example: https://www.youtube.com/embed/abc123
        type:
          type:
          - string
          - 'null'
          description: Embed type
          example: youtube
        title:
          type:
          - string
          - 'null'
          description: Embed title
          example: Video Title
        author_name:
          type:
          - string
          - 'null'
          description: Author name
          example: Author Name
        author_url:
          type:
          - string
          - 'null'
          format: uri
          description: Author URL
          example: https://example.com/author
        source_url:
          type:
          - string
          - 'null'
          format: uri
          description: Embed source URL
          example: https://www.youtube.com/watch?v=abc123
        width:
          type:
          - integer
          - 'null'
          description: Embed width
          example: 640
        height:
          type:
          - integer
          - 'null'
          description: Embed height
          example: 480
        html:
          type:
          - string
          - 'null'
          description: Embed HTML
          example: "<iframe src='...'></iframe>"
        thumbnail_url:
          type:
          - string
          - 'null'
          format: uri
          description: Thumbnail URL
          example: https://example.com/thumbnail.jpg
    BlockAttachment:
      type: object
      properties:
        filename:
          type:
          - string
          - 'null'
          description: Attachment filename
          example: document.pdf
        content_type:
          type:
          - string
          - 'null'
          description: Attachment content type
          example: application/pdf
        file_size:
          type:
          - integer
          - 'null'
          description: File size in bytes
          example: 2048000
        file_extension:
          type:
          - string
          - 'null'
          description: File extension
          example: pdf
        updated_at:
          type:
          - string
          - 'null'
          format: date-time
          description: When the attachment was last updated
        url:
          type: string
          format: uri
          description: Attachment download URL
          example: https://attachments.are.na/12345/document.pdf
      required:
      - url
    Comment:
      type: object
      description: A comment on a block
      properties:
        id:
          type: integer
          description: Unique identifier for the comment
          example: 12345
        type:
          type: string
          description: Comment type
          enum:
          - Comment
          example: Comment
        body:
          oneOf:
          - "$ref": "#/components/schemas/MarkdownContent"
          - type: 'null'
          description: Comment body with markdown, HTML, and plain text renderings
        created_at:
          type: string
          format: date-time
          description: When the comment was created
          example: '2023-01-15T10:30:00Z'
        updated_at:
          type: string
          format: date-time
          description: When the comment was last updated
          example: '2023-01-15T14:45:00Z'
        user:
          "$ref": "#/components/schemas/EmbeddedUser"
        _links:
          allOf:
          - "$ref": "#/components/schemas/Links"
          - description: HATEOAS links for navigation
      required:
      - id
      - type
      - created_at
      - updated_at
      - user
      - _links
    Channel:
      type: object
      properties:
        id:
          type: integer
          description: Unique identifier for the channel
          example: 12345
        type:
          type: string
          description: Channel type
          enum:
          - Channel
          example: Channel
        slug:
          type: string
          description: Channel URL slug
          example: my-collection-abc123
        title:
          type: string
          description: Channel title
          example: My Collection
        description:
          oneOf:
          - "$ref": "#/components/schemas/MarkdownContent"
          - type: 'null'
          description: Channel description with multiple renderings
        state:
          "$ref": "#/components/schemas/ChannelState"
          example: available
        visibility:
          "$ref": "#/components/schemas/ChannelVisibility"
        created_at:
          type: string
          format: date-time
          description: When the channel was created
          example: '2023-01-15T10:30:00Z'
        updated_at:
          type: string
          format: date-time
          description: When the channel was last updated
          example: '2023-01-15T14:45:00Z'
        metadata:
          oneOf:
          - "$ref": "#/components/schemas/Metadata"
          - type: 'null'
          description: Custom key-value metadata
        owner:
          "$ref": "#/components/schemas/ChannelOwner"
        counts:
          "$ref": "#/components/schemas/ChannelCounts"
        collaborators:
          type: array
          description: |
            Collaborators on this channel (users and groups).
            Only present when channel is returned as a full resource, not when embedded.
          items:
            "$ref": "#/components/schemas/ChannelCollaborator"
        _links:
          allOf:
          - "$ref": "#/components/schemas/Links"
          - description: HATEOAS links for navigation
        connection:
          oneOf:
          - "$ref": "#/components/schemas/EmbeddedConnection"
          - type: 'null'
          description: |
            Connection context (only present when channel is returned as part of another channel's contents).
            Contains position, pinned status, and information about who connected the channel.
        can:
          oneOf:
          - "$ref": "#/components/schemas/ChannelAbilities"
          - type: 'null'
          description: |
            Actions the current user can perform on this channel.
            Only present when channel is returned as a full resource, not when embedded.
      required:
      - id
      - type
      - slug
      - title
      - state
      - visibility
      - created_at
      - updated_at
      - owner
      - counts
      - _links
    ChannelOwner:
      description: Channel owner (User or Group)
      oneOf:
      - "$ref": "#/components/schemas/EmbeddedUser"
      - "$ref": "#/components/schemas/EmbeddedGroup"
      discriminator:
        propertyName: type
        mapping:
          User: "#/components/schemas/EmbeddedUser"
          Group: "#/components/schemas/EmbeddedGroup"
    ChannelOwnerInput:
      type: object
      description: User or Group that should own the channel.
      required:
      - id
      properties:
        id:
          type: integer
          description: ID of the User or Group to own the channel.
          example: 12345
        type:
          type: string
          enum:
          - User
          - Group
          default: User
          description: Owner type. Defaults to User when omitted.
    ChannelCollaborator:
      description: Channel collaborator (User or Group)
      oneOf:
      - "$ref": "#/components/schemas/EmbeddedUser"
      - "$ref": "#/components/schemas/EmbeddedGroup"
      discriminator:
        propertyName: type
        mapping:
          User: "#/components/schemas/EmbeddedUser"
          Group: "#/components/schemas/EmbeddedGroup"
    ChannelAbilities:
      type: object
      description: Actions the current user can perform on the channel
      properties:
        add_to:
          type: boolean
          description: Whether the user can add blocks to this channel
          example: true
        update:
          type: boolean
          description: Whether the user can update this channel
          example: false
        destroy:
          type: boolean
          description: Whether the user can delete this channel
          example: false
        manage_collaborators:
          type: boolean
          description: Whether the user can add/remove collaborators
          example: false
      required:
      - add_to
      - update
      - destroy
      - manage_collaborators
    GroupAbilities:
      type: object
      description: Actions the current user can perform on the group
      properties:
        update:
          type: boolean
          description: Whether the user can update this group
          example: false
        destroy:
          type: boolean
          description: Whether the user can delete this group
          example: false
        manage_members:
          type: boolean
          description: Whether the user can add/remove group members
          example: false
        manage_invitations:
          type: boolean
          description: Whether the user can create/revoke group invitations
          example: false
      required:
      - update
      - destroy
      - manage_members
      - manage_invitations
    ChannelCounts:
      type: object
      description: Counts of various items in the channel
      properties:
        blocks:
          type: integer
          description: Number of blocks in the channel
          example: 42
        channels:
          type: integer
          description: Number of channels connected to this channel
          example: 8
        contents:
          type: integer
          description: Total number of contents (blocks + channels)
