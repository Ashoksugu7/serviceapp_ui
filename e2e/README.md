# End-to-end checks

Runs the main workflows in Chrome against the running Go API and `npm run dev`.
The admin suite creates `E2E …` customers and records, so use a development database.

Credentials are read from the environment only. Set them in your shell, not in files:

```sh
export E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=…
export E2E_USER_EMAIL=… E2E_USER_PASSWORD=…
export E2E_SUPER_ADMIN_EMAIL=… E2E_SUPER_ADMIN_PASSWORD=…
npm run e2e
```

Roles without credentials are skipped. The report is written to `e2e/.report/`
(`npx playwright show-report e2e/.report`).
