import { writeFileSync } from "node:fs";

const workflow = {
  name: "Maintenance Router (Python Tools + App Callback)",
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "maintenance-request",
        responseMode: "responseNode",
        options: {},
      },
      id: "1",
      name: "Webhook - Maintenance Request",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [-1500, 220],
      webhookId: "maintenance-request",
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
          conditions: [
            {
              leftValue: '={{ $json.headers["x-n8n-api-key"] || $json.headers["x-api-key"] || "" }}',
              rightValue: '={{ $env.N8N_API_KEY || "" }}',
              operator: { type: "string", operation: "equals" },
            },
          ],
          combinator: "and",
        },
      },
      id: "2",
      name: "IF - API Key Valid",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [-1260, 220],
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: '={"error":"Unauthorized"}',
        options: { responseCode: 401 },
      },
      id: "3",
      name: "Respond 401",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.3,
      position: [-1030, 380],
    },
    {
      parameters: {
        jsCode:
          "const data = $json.body ?? $json;\nreturn [{ json: { ticketId: data.ticketId, name: data.name ?? '', email: data.email ?? '', phone: data.phone ?? '', description: data.description ?? '', callbackUrl: data.callbackUrl, callbackSecret: data.callbackSecret } }];",
      },
      id: "4",
      name: "Normalize Input",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [-1030, 140],
    },
    {
      parameters: {
        command:
          '={{ "python E:/Workflows/RE_SAAS/tools/classify_maintenance.py --description \"" + ($json.description || "").replace(/\"/g, "\\\\\"") + "\"" }}',
      },
      id: "5",
      name: "Execute - classify_maintenance.py",
      type: "n8n-nodes-base.executeCommand",
      typeVersion: 1,
      position: [-790, 140],
    },
    {
      parameters: {
        jsCode:
          "const input = $('Normalize Input').item.json;\nconst raw = $json.stdout || $json.data || '';\nconst start = raw.indexOf('{');\nconst end = raw.lastIndexOf('}');\nif (start === -1 || end === -1) throw new Error('Classifier output not parseable as JSON: ' + raw);\nconst parsed = JSON.parse(raw.slice(start, end + 1));\nreturn [{ json: { ...input, category: parsed.category || 'other', urgency: parsed.urgency || 'normal', estimatedCost: parsed.estimated_cost || 0, summary: parsed.summary || 'Maintenance request' } }];",
      },
      id: "6",
      name: "Parse Classification",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [-550, 140],
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
          conditions: [{ leftValue: '={{ $json.urgency }}', rightValue: "emergency", operator: { type: "string", operation: "equals" } }],
          combinator: "and",
        },
      },
      id: "7",
      name: "IF - Emergency",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [-320, 140],
    },
    {
      parameters: {
        assignments: {
          assignments: [
            { name: "status", value: "assigned", type: "string" },
            { name: "messageType", value: "legal_notice", type: "string" },
            { name: "routeAction", value: "Emergency escalation", type: "string" },
          ],
        },
        options: {},
      },
      id: "8",
      name: "Set Emergency Meta",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [-90, 20],
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
          conditions: [{ leftValue: '={{ $json.urgency }}', rightValue: "high", operator: { type: "string", operation: "equals" } }],
          combinator: "and",
        },
      },
      id: "9",
      name: "IF - High",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [-90, 220],
    },
    {
      parameters: {
        assignments: {
          assignments: [
            { name: "status", value: "assigned", type: "string" },
            { name: "messageType", value: "overdue_reminder", type: "string" },
            { name: "routeAction", value: "High urgency notification", type: "string" },
          ],
        },
        options: {},
      },
      id: "10",
      name: "Set High Meta",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [130, 140],
    },
    {
      parameters: {
        assignments: {
          assignments: [
            { name: "status", value: "open", type: "string" },
            { name: "messageType", value: "satisfaction_survey", type: "string" },
            { name: "routeAction", value: "Normal backlog queue", type: "string" },
          ],
        },
        options: {},
      },
      id: "11",
      name: "Set Normal/Low Meta",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [130, 320],
    },
    {
      parameters: {
        command:
          '={{ "python E:/Workflows/RE_SAAS/tools/draft_message.py --type " + $json.messageType + " --channel sms --tenant_name \"" + ($json.name || "Tenant").replace(/\"/g, "\\\\\"") + "\" --issue_summary \"" + ($json.summary || "").replace(/\"/g, "\\\\\"") + "\"" }}',
      },
      id: "12",
      name: "Execute - draft_message.py",
      type: "n8n-nodes-base.executeCommand",
      typeVersion: 1,
      position: [370, 200],
    },
    {
      parameters: {
        jsCode:
          "const routed = $items('Set Emergency Meta', 0, 0)[0]?.json || $items('Set High Meta', 0, 0)[0]?.json || $items('Set Normal/Low Meta', 0, 0)[0]?.json || {};\nconst drafted = ($json.stdout || '').trim();\nreturn [{ json: { ...routed, draftedMessage: drafted || 'We received your maintenance request and will follow up shortly.' } }];",
      },
      id: "13",
      name: "Merge Drafted Message",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [610, 200],
    },
    {
      parameters: {
        command:
          '={{ "python E:/Workflows/RE_SAAS/tools/send_sms.py --to \"" + ($json.phone || "+10000000000") + "\" --body \"" + ($json.draftedMessage || "").replace(/\"/g, "\\\\\"") + "\"" }}',
      },
      id: "14",
      name: "Execute - send_sms.py",
      type: "n8n-nodes-base.executeCommand",
      typeVersion: 1,
      position: [850, 110],
      continueOnFail: true,
    },
    {
      parameters: {
        command:
          '={{ "python E:/Workflows/RE_SAAS/tools/send_email.py --to \"" + ($json.email || "tenant@example.com") + "\" --subject \"Maintenance Update #" + ($json.ticketId || "") + "\" --html \"<p>" + ($json.draftedMessage || "").replace(/\"/g, "\\\\\"") + "</p>\"" }}',
      },
      id: "15",
      name: "Execute - send_email.py",
      type: "n8n-nodes-base.executeCommand",
      typeVersion: 1,
      position: [850, 290],
      continueOnFail: true,
    },
    {
      parameters: {
        jsCode:
          "const core = $('Merge Drafted Message').item.json;\nconst sms = $items('Execute - send_sms.py', 0, 0)[0]?.json || {};\nconst email = $items('Execute - send_email.py', 0, 0)[0]?.json || {};\nreturn [{ json: { ...core, smsResult: sms.stdout || sms.error || null, emailResult: email.stdout || email.error || null } }];",
      },
      id: "16",
      name: "Assemble Callback Payload",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1090, 200],
    },
    {
      parameters: {
        method: "POST",
        url: '={{ $json.callbackUrl }}',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "x-api-key", value: '={{ $json.callbackSecret }}' },
            { name: "content-type", value: "application/json" },
          ],
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody:
          '={{ { workflowName: "maintenance-router", trigger: "webhook", outcome: "success", details: { category: $json.category, urgency: $json.urgency, status: $json.status, routeAction: $json.routeAction, estimatedCost: $json.estimatedCost, summary: $json.summary }, ticketId: $json.ticketId } }}',
        options: { timeout: 15000 },
      },
      id: "17",
      name: "HTTP - Callback to App",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1330, 200],
      continueOnFail: true,
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: '={"ok":true,"ticketId":$json.ticketId,"urgency":$json.urgency,"status":$json.status}',
        options: { responseCode: 200 },
      },
      id: "18",
      name: "Respond 200",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.3,
      position: [1560, 200],
    },
  ],
  connections: {
    "Webhook - Maintenance Request": { main: [[{ node: "IF - API Key Valid", type: "main", index: 0 }]] },
    "IF - API Key Valid": {
      main: [
        [{ node: "Normalize Input", type: "main", index: 0 }],
        [{ node: "Respond 401", type: "main", index: 0 }],
      ],
    },
    "Normalize Input": { main: [[{ node: "Execute - classify_maintenance.py", type: "main", index: 0 }]] },
    "Execute - classify_maintenance.py": { main: [[{ node: "Parse Classification", type: "main", index: 0 }]] },
    "Parse Classification": { main: [[{ node: "IF - Emergency", type: "main", index: 0 }]] },
    "IF - Emergency": {
      main: [
        [{ node: "Set Emergency Meta", type: "main", index: 0 }],
        [{ node: "IF - High", type: "main", index: 0 }],
      ],
    },
    "IF - High": {
      main: [
        [{ node: "Set High Meta", type: "main", index: 0 }],
        [{ node: "Set Normal/Low Meta", type: "main", index: 0 }],
      ],
    },
    "Set Emergency Meta": { main: [[{ node: "Execute - draft_message.py", type: "main", index: 0 }]] },
    "Set High Meta": { main: [[{ node: "Execute - draft_message.py", type: "main", index: 0 }]] },
    "Set Normal/Low Meta": { main: [[{ node: "Execute - draft_message.py", type: "main", index: 0 }]] },
    "Execute - draft_message.py": { main: [[{ node: "Merge Drafted Message", type: "main", index: 0 }]] },
    "Merge Drafted Message": {
      main: [[
        { node: "Execute - send_sms.py", type: "main", index: 0 },
        { node: "Execute - send_email.py", type: "main", index: 0 },
      ]],
    },
    "Execute - send_sms.py": { main: [[{ node: "Assemble Callback Payload", type: "main", index: 0 }]] },
    "Execute - send_email.py": { main: [[{ node: "Assemble Callback Payload", type: "main", index: 0 }]] },
    "Assemble Callback Payload": { main: [[{ node: "HTTP - Callback to App", type: "main", index: 0 }]] },
    "HTTP - Callback to App": { main: [[{ node: "Respond 200", type: "main", index: 0 }]] },
  },
  active: false,
  settings: { executionOrder: "v1" },
  versionId: "8f6a2d0d-8f8b-4f9a-a7df-fb2f9b79339a",
  meta: { instanceId: "re-saas" },
  id: "maintenance-router-tools-workflow",
  pinData: {},
};

const outPath = "e:/Workflows/RE_SAAS/workflows/n8n_maintenance_router_with_scripts.workflow.json";
writeFileSync(outPath, JSON.stringify(workflow, null, 2), "utf8");
console.log("generated", outPath);
