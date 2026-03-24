# Payroll Parser Service

Vercel Python Function for payroll PDF parsing.

## Deploy

1. Create a new Vercel project using this `payroll-parser-service` directory as the project root.
2. Deploy it as a separate service from the main `web` app.
3. Confirm the endpoint responds at:

`https://<your-payroll-service-domain>/api`

## Main App Configuration

Set this environment variable on the main `web` project:

`PAYROLL_PARSE_API_URL=https://<your-payroll-service-domain>/api`

## Notes

- This service expects raw PDF bytes in the request body.
- It uses the `x-payroll-filename` header to classify `給与` or `賞与`.
- Response shape:

```json
{
  "success": true,
  "data": {
    "month": "2026-03-01",
    "type": "給与",
    "details": {
      "基本給": "300000"
    }
  }
}
```
