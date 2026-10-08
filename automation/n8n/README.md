# CRM lead workflow

Import `lead-created.json` into the local n8n instance. It receives `lead.created`, validates the event, calls `http://ai:8000/classify-lead`, validates the classifier response, and patches the lead through `http://backend:8000`.

Before publishing:

1. Set the `CRM_API_TOKEN` environment variable for the n8n container to a valid CRM bearer token.
2. Set `DISCORD_WEBHOOK_URL` to the webhook URL for the target Discord channel.
3. Ensure the AI service exposes `/classify-lead` (Milestone 8).
4. Import and activate both `lead-created.json` and `automation-failure.json`.
5. Publish the workflow and use its production webhook URL in the backend `.env`.

Invalid event or classifier data throws an error, which records a failed n8n execution.

The lead workflow notifies Discord for high-priority leads and low-confidence leads needing manual review. Its workflow static data prevents duplicate notifications for the same event ID.
