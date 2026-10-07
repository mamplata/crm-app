# CRM lead workflow

Import `lead-created.json` into the local n8n instance. It receives `lead.created`, validates the event, calls `http://ai:8000/classify-lead`, validates the classifier response, and patches the lead through `http://backend:8000`.

Before publishing:

1. Set the `CRM_API_TOKEN` environment variable for the n8n container to a valid CRM bearer token.
2. Ensure the AI service exposes `/classify-lead` (Milestone 8).
3. Publish the workflow and use its production webhook URL in the backend `.env`.

Invalid event or classifier data throws an error, which records a failed n8n execution.
