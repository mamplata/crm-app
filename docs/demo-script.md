# CRM demo script

## Start

```bash
cp .env.example .env
./dev.sh
```

Import and activate both n8n workflows, then open the Angular app.

## Happy path

1. Log in.
2. Create a lead with an urgent business message.
3. Show the lead priority, industry, summary, and confidence after n8n runs.
4. Show the Discord alert.
5. Click **Qualify** and show the status change.

## Failure path

1. Temporarily break `N8N_WEBHOOK_URL` or stop n8n.
2. Create a lead.
3. Open **Automation** and show the `FAILED` event.
4. Restore n8n and click **Retry**.
5. Show the event becoming `PROCESSED`.

## Meta test path

1. Send a message to the development Facebook Page.
2. Show the message becoming a CRM lead.
3. Show the AI classification and Discord notification.

Do not publish the Meta app or expose the local tunnel for production use.
