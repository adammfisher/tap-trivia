# TapTrivia Contact Form Lambda

Handles POST requests from the taptrivia.com contact form. Validates input and sends an email notification via SES.

## Deployment

1. **Add to API Gateway** -- Create a `POST /contact` route on the existing TapTrivia API Gateway (`api.taptrivia.tv`) pointing to this Lambda.

2. **IAM** -- This Lambda needs `ses:SendEmail` permission. The shared TapTrivia Lambda role already grants SES access, so attach that role.

3. **SES Sender** -- The sender address `adam@visudolabs.com` must be verified in SES. If the SES account is still in sandbox mode, the recipient address must also be verified.

4. **Runtime** -- Node.js 18+ (uses ES modules). The handler is `index.handler`. No dependencies to install -- `@aws-sdk/client-ses` is provided by the Lambda runtime.

## API

**POST /contact**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "venue": "The Local Pub",
  "message": "Interested in adding TapTrivia to our bar."
}
```

- `name` (required) -- string
- `email` (required) -- valid email
- `venue` (optional) -- string
- `message` (required) -- string

**Responses:**
- `200` -- `{ "success": true }`
- `400` -- `{ "error": "VALIDATION_ERROR", "message": "..." }`
- `500` -- `{ "error": "SEND_FAILED", "message": "..." }`

CORS is configured for `https://taptrivia.com` and `https://www.taptrivia.com`.
