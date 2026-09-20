import { createHash, randomUUID } from "node:crypto";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

export function encodeVarint(value) {
  let current = BigInt(Math.max(0, Number(value) || 0));
  const result = [];
  while (current >= 0x80n) {
    result.push(Number((current & 0x7fn) | 0x80n));
    current >>= 7n;
  }
  result.push(Number(current));
  return Uint8Array.from(result);
}

function fieldKey(field, wireType) {
  return encodeVarint((field << 3) | wireType);
}

export function bytesField(field, value) {
  const bytes = typeof value === "string"
    ? textEncoder.encode(value)
    : value instanceof Uint8Array ? value : Uint8Array.from(value ?? []);
  return concatBytes([fieldKey(field, 2), encodeVarint(bytes.byteLength), bytes]);
}

export function stringField(field, value) {
  return bytesField(field, textEncoder.encode(String(value ?? "")));
}

export function varintField(field, value) {
  return concatBytes([fieldKey(field, 0), encodeVarint(value)]);
}

export function frameConnectMessage(message, flags = 0) {
  const payload = message instanceof Uint8Array ? message : Uint8Array.from(message ?? []);
  const header = new Uint8Array(5);
  header[0] = flags & 0xff;
  new DataView(header.buffer).setUint32(1, payload.byteLength, false);
  return concatBytes([header, payload]);
}

export function decodeProtoFields(bytes) {
  const value = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes ?? []);
  const fields = [];
  let offset = 0;
  while (offset < value.length) {
    const key = readVarint(value, offset);
    if (!key) break;
    offset = key.offset;
    const field = Number(key.value >> 3n);
    const wireType = Number(key.value & 7n);
    if (wireType === 0) {
      const parsed = readVarint(value, offset);
      if (!parsed) break;
      offset = parsed.offset;
      fields.push({ field, wireType, value: Number(parsed.value) });
      continue;
    }
    if (wireType === 1) {
      if (offset + 8 > value.length) break;
      fields.push({ field, wireType, value: value.slice(offset, offset + 8) });
      offset += 8;
      continue;
    }
    if (wireType === 2) {
      const length = readVarint(value, offset);
      if (!length) break;
      offset = length.offset;
      const end = offset + Number(length.value);
      if (end > value.length) break;
      fields.push({ field, wireType, value: value.slice(offset, end) });
      offset = end;
      continue;
    }
    if (wireType === 5) {
      if (offset + 4 > value.length) break;
      fields.push({ field, wireType, value: value.slice(offset, offset + 4) });
      offset += 4;
      continue;
    }
    break;
  }
  return fields;
}

function readVarint(bytes, start) {
  let offset = start;
  let value = 0n;
  let shift = 0n;
  while (offset < bytes.length && shift <= 63n) {
    const byte = bytes[offset++];
    value |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value, offset };
    shift += 7n;
  }
  return null;
}

function firstBytes(fields, field) {
  return fields.find((entry) => entry.field === field && entry.wireType === 2)?.value ?? null;
}

function firstString(fields, field) {
  const bytes = firstBytes(fields, field);
  return bytes ? textDecoder.decode(bytes) : "";
}

function sha256(bytes) {
  return new Uint8Array(createHash("sha256").update(bytes).digest());
}

function putBlob(store, value) {
  const bytes = value instanceof Uint8Array ? value : textEncoder.encode(String(value));
  const id = sha256(bytes);
  store.set(Buffer.from(id).toString("hex"), bytes);
  return id;
}

function jsonBlob(store, value) {
  return putBlob(store, textEncoder.encode(JSON.stringify(value)));
}

function isInlineBase64(value) {
  const compact = value.replace(/\s+/g, "");
  return compact.length > 0 && compact.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact);
}

function normalizeText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(normalizeText).filter(Boolean).join("");
  if (!content || typeof content !== "object") return "";
  if (content.type === "image") {
    const mimeType = String(content.mimeType ?? content.mediaType ?? content.source?.media_type ?? "image/png");
    const raw = content.data ?? content.source?.data ?? content.source?.url ?? null;
    if (raw instanceof Uint8Array || Buffer.isBuffer(raw)) {
      return `[Image ${mimeType}] data:${mimeType};base64,${Buffer.from(raw).toString("base64")}`;
    }
    if (typeof raw === "string" && raw.length > 0) {
      // A remote reference is not inline pixel data: folding it into a data
      // URI would fabricate an invalid base64 payload. Keep the explicit URL
      // reference form instead.
      if (/^https?:\/\//i.test(raw)) return `[Image ${mimeType}] ${raw}`;
      if (raw.startsWith("data:")) return `[Image ${mimeType}] ${raw}`;
      // Only compose a base64 data URI from bytes that actually are base64.
      if (!isInlineBase64(raw)) return "[image attachment without inline data]";
      return `[Image ${mimeType}] data:${mimeType};base64,${raw}`;
    }
    return "[image attachment without inline data]";
  }
  if (content.type === "tool-result" || content.type === "tool_result") {
    return `[Tool Result]\n${normalizeText(content.content ?? content.output ?? content.result ?? content.text)}`;
  }
  if (content.type === "tool-call" || content.type === "tool_call") {
    return `[Tool Call ${content.name ?? "tool"}] ${content.arguments ?? "{}"}`;
  }
  return String(content.text ?? content.value ?? content.content ?? content.delta ?? "");
}

function normalizedMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => ({
      role: String(message?.role ?? "user"),
      content: normalizeText(message?.content ?? message?.text).trim(),
    }))
    .filter((message) => message.content.length > 0);
}

function encodeUserMessage(text, messageId, mode = 1) {
  return concatBytes([stringField(1, text), stringField(2, messageId), varintField(4, mode)]);
}

function encodeAssistantStep(text) {
  const assistantMessage = stringField(1, text);
  const conversationStep = bytesField(1, assistantMessage);
  return conversationStep;
}

function encodeConversationTurn(userMessageId, stepIds, requestId) {
  return concatBytes([
    bytesField(1, userMessageId),
    ...stepIds.map((id) => bytesField(2, id)),
    ...(requestId ? [stringField(3, requestId)] : []),
  ]);
}

function encodeConversationState(messages, blobStore, requestId) {
  const roots = [];
  const turns = [];
  const turnRecords = [];
  for (const message of messages) {
    if (message.role === "system") {
      roots.push(jsonBlob(blobStore, { role: "system", content: message.content }));
      continue;
    }
    if (message.role === "user") {
      const userMessage = { role: "user", content: [{ type: "text", text: message.content }] };
      roots.push(jsonBlob(blobStore, userMessage));
      turnRecords.push({ text: message.content, steps: [] });
      continue;
    }
    if (message.role === "assistant") {
      roots.push(jsonBlob(blobStore, { role: "assistant", content: [{ type: "text", text: message.content }] }));
      turnRecords.at(-1)?.steps.push(putBlob(blobStore, encodeAssistantStep(message.content)));
      continue;
    }
    const resultText = `[Tool Result]\n${message.content}`;
    roots.push(jsonBlob(blobStore, { role: "user", content: [{ type: "text", text: resultText }] }));
    turnRecords.at(-1)?.steps.push(putBlob(blobStore, encodeAssistantStep(resultText)));
  }
  for (const record of turnRecords.slice(0, -1)) {
    const userMessageId = putBlob(blobStore, encodeUserMessage(record.text, randomUUID()));
    const turn = encodeConversationTurn(userMessageId, record.steps, requestId);
    turns.push(putBlob(blobStore, turn));
  }
  return concatBytes([
    ...roots.map((id) => bytesField(1, id)),
    ...turns.map((id) => bytesField(8, id)),
  ]);
}

function encodeRequestContext(timeZone = "UTC") {
  const env = stringField(10, timeZone);
  const requestContext = bytesField(4, env);
  return bytesField(2, requestContext);
}

function encodeModelDetails(model) {
  return concatBytes([
    stringField(1, model),
    stringField(3, model),
    stringField(4, model),
    stringField(5, model),
  ]);
}

function encodeMcpTools(tools) {
  const supported = (Array.isArray(tools) ? tools : []).map((tool) => {
    const name = String(tool?.name ?? tool?.function?.name ?? "").trim();
    if (!name) return null;
    const fn = tool?.function ?? tool;
    const definition = concatBytes([
      stringField(1, name),
      stringField(4, "opencodex-responses"),
      stringField(5, name),
      stringField(2, fn?.description ?? ""),
      // Cursor accepts a protobuf Value. A JSON string is intentionally not
      // sent here; unsupported schemas are omitted so the Agent turn does not
      // enter the heartbeat-only state caused by an invalid Value payload.
    ]);
    return bytesField(1, definition);
  }).filter(Boolean);
  return concatBytes(supported);
}

/** Build an AgentService Run request and retain the blobs for KV responses. */
export function encodeAgentRunRequest({
  messages,
  model,
  requestId = randomUUID(),
  conversationId = requestId,
  tools = [],
  timeZone = "UTC",
} = {}) {
  const normalized = normalizedMessages(messages);
  const blobStore = new Map();
  const latestUserIndex = normalized.map((message) => message.role).lastIndexOf("user");
  const latestUserText = latestUserIndex >= 0 ? normalized[latestUserIndex].content : normalized.at(-1)?.content ?? "Continue the conversation.";
  const priorConversation = latestUserIndex > 0
    ? normalized.slice(0, latestUserIndex)
      .filter((message) => message.role !== "system")
      .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
      .join("\n\n")
    : "";
  const userText = priorConversation
    ? `Conversation history:\n${priorConversation}\n\nCurrent user message:\n${latestUserText}`
    : latestUserText;
  const userMessage = encodeUserMessage(userText, requestId, 1);
  const userAction = concatBytes([
    bytesField(1, userMessage),
    encodeRequestContext(timeZone),
  ]);
  const action = bytesField(1, userAction);
  const run = concatBytes([
    bytesField(1, encodeConversationState(normalized, blobStore, requestId)),
    bytesField(2, action),
    bytesField(3, encodeModelDetails(String(model ?? ""))),
    bytesField(4, encodeMcpTools(tools)),
    stringField(5, conversationId),
  ]);
  const clientMessage = bytesField(1, run);
  return { frame: frameConnectMessage(clientMessage), blobs: blobStore, requestId, conversationId };
}

export function encodeHeartbeat() {
  return frameConnectMessage(bytesField(7, new Uint8Array()));
}

export function decodeConnectFrames(buffer) {
  const frames = [];
  let offset = 0;
  while (buffer.length - offset >= 5) {
    const flags = buffer[offset];
    const length = new DataView(buffer.buffer, buffer.byteOffset + offset + 1, 4).getUint32(0, false);
    if (buffer.length - offset - 5 < length) break;
    frames.push({ flags, payload: buffer.slice(offset + 5, offset + 5 + length) });
    offset += 5 + length;
  }
  return { frames, rest: buffer.slice(offset) };
}

/**
 * Return redacted wire metadata for diagnostics. This deliberately records
 * only Connect flags, byte lengths, wire types, and protobuf field paths.
 */
export function cursorFrameMetadata(message, flags = null) {
  const bytes = message instanceof Uint8Array ? message : Uint8Array.from(message ?? []);
  const fieldPaths = [];
  const visit = (value, prefix = [], depth = 0) => {
    if (depth > 4 || fieldPaths.length >= 64) return;
    for (const field of decodeProtoFields(value).slice(0, 32)) {
      const path = [...prefix, field.field].join(".");
      fieldPaths.push({ path, wireType: field.wireType, byteLength: field.value instanceof Uint8Array ? field.value.byteLength : null });
      if (field.wireType === 2) visit(field.value, [...prefix, field.field], depth + 1);
      if (fieldPaths.length >= 64) return;
    }
  };
  visit(bytes);
  return {
    ...(Number.isInteger(flags) ? { flags } : {}),
    payloadLength: bytes.byteLength,
    fieldPaths,
  };
}

/**
 * Connect's end-stream frame is either a JSON envelope or a binary
 * google.rpc.Status protobuf for this Cursor endpoint. Older code treated
 * every trailer as a successful turn, which made upstream quota errors appear
 * in the UI as an empty assistant message.
 */
export function decodeCursorConnectTrailer(payload) {
  const bytes = payload instanceof Uint8Array ? payload : Uint8Array.from(payload ?? []);
  const text = textDecoder.decode(bytes).trim();
  if (!text) return null;
  if (text.startsWith("{")) {
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Not JSON after all; fall through and try the binary Status shape.
      parsed = null;
    }
    if (parsed && typeof parsed === "object") {
      const error = parsed.error && typeof parsed.error === "object" ? parsed.error : null;
      const rawCode = error ? error.code : (parsed.status ?? parsed.code);
      const label = rawCode === undefined || rawCode === null || !String(rawCode).trim()
        ? null
        : grpcStatusLabel(rawCode);
      if (!label) {
        // An explicit error envelope without a usable code keeps the generic
        // error; a payload without any error/status field is not an error.
        if (!error) return null;
        const fallbackMessage = typeof error.message === "string" && error.message.trim()
          ? error.message.trim().slice(0, 500)
          : "CURSOR_CONNECT_ERROR";
        return { code: "CURSOR_CONNECT_ERROR", message: fallbackMessage };
      }
      const messageSource = error?.message ?? parsed.message;
      return {
        code: label,
        message: typeof messageSource === "string" && messageSource.trim()
          ? messageSource.trim().slice(0, 500)
          : label,
      };
    }
  }
  const status = decodeGoogleRpcStatus(bytes);
  if (status) {
    const code = grpcStatusLabel(status.code);
    return {
      code,
      message: status.message.trim() ? status.message.trim().slice(0, 500) : code,
    };
  }
  return { code: "CURSOR_CONNECT_ERROR", message: text.slice(0, 500) };
}

const GRPC_STATUS_NAMES = new Map([
  [0, "OK"],
  [1, "CANCELLED"],
  [2, "UNKNOWN"],
  [3, "INVALID_ARGUMENT"],
  [4, "DEADLINE_EXCEEDED"],
  [5, "NOT_FOUND"],
  [6, "ALREADY_EXISTS"],
  [7, "PERMISSION_DENIED"],
  [8, "RESOURCE_EXHAUSTED"],
  [9, "FAILED_PRECONDITION"],
  [10, "ABORTED"],
  [11, "OUT_OF_RANGE"],
  [12, "UNIMPLEMENTED"],
  [13, "INTERNAL"],
  [14, "UNAVAILABLE"],
  [15, "DATA_LOSS"],
  [16, "UNAUTHENTICATED"],
]);

function grpcStatusLabel(value) {
  const text = String(value ?? "").trim();
  if (/^\d+$/.test(text)) return GRPC_STATUS_NAMES.get(Number(text)) ?? text;
  return text;
}

/**
 * Map a decoded trailer/gRPC code onto the account-pool markers DSH already
 * understands, so binary google.rpc.Status trailers no longer degrade into a
 * generic CURSOR_CONNECT_ERROR.
 */
export function cursorGrpcStatusFlags(code) {
  const label = grpcStatusLabel(code).toUpperCase();
  const flags = {};
  if (label === "UNAUTHENTICATED") flags.authExpired = true;
  else if (label === "PERMISSION_DENIED") flags.authForbidden = true;
  if (label === "RESOURCE_EXHAUSTED") flags.quotaExhausted = true;
  return flags;
}

/**
 * Minimal hand-rolled decoder for a binary google.rpc.Status:
 * field 1 code = varint int32, field 2 message = string, field 3 details =
 * repeated Any (skipped). Returns null for anything that does not parse
 * cleanly so callers can keep their previous fallback behavior.
 */
export function decodeGoogleRpcStatus(payload) {
  const bytes = payload instanceof Uint8Array ? payload : Uint8Array.from(payload ?? []);
  let offset = 0;
  let code = null;
  let message = "";
  while (offset < bytes.length) {
    const key = readVarint(bytes, offset);
    if (!key) return null;
    offset = key.offset;
    const field = Number(key.value >> 3n);
    const wireType = Number(key.value & 7n);
    if (field === 1 && wireType === 0) {
      const value = readVarint(bytes, offset);
      if (!value) return null;
      const numeric = Number(BigInt.asIntN(32, value.value));
      // gRPC status codes are 0..16; anything else is not a Status.
      if (!Number.isInteger(numeric) || numeric < 0 || numeric > 16) return null;
      code = numeric;
      offset = value.offset;
      continue;
    }
    if ((field === 2 || field === 3) && wireType === 2) {
      const length = readVarint(bytes, offset);
      if (!length) return null;
      const end = length.offset + Number(length.value);
      if (end > bytes.length) return null;
      if (field === 2) message = textDecoder.decode(bytes.slice(length.offset, end));
      offset = end;
      continue;
    }
    return null;
  }
  if (code === null && message.length === 0) return null;
  return { code: code ?? 2, message };
}

export function decodeCursorText(message) {
  try {
    const interaction = firstBytes(decodeProtoFields(message), 1);
    if (!interaction) return "";
    const update = firstBytes(decodeProtoFields(interaction), 1);
    if (!update) return "";
    return firstString(decodeProtoFields(update), 1);
  } catch {
    return "";
  }
}

export function cursorTurnComplete(message) {
  try {
    const interaction = firstBytes(decodeProtoFields(message), 1);
    if (!interaction) return false;
    return decodeProtoFields(interaction).some((field) => field.wireType === 2 && [14, 18, 19].includes(field.field));
  } catch {
    return false;
  }
}

function decodeKvRequest(message) {
  const kv = firstBytes(decodeProtoFields(message), 4);
  if (!kv) return null;
  const fields = decodeProtoFields(kv);
  const id = fields.find((field) => field.field === 1 && field.wireType === 0)?.value ?? 0;
  const getArgs = firstBytes(fields, 2);
  const setArgs = firstBytes(fields, 3);
  if (getArgs) return { id, kind: "get", blobId: firstBytes(decodeProtoFields(getArgs), 1) };
  if (setArgs) return { id, kind: "set" };
  return null;
}

export function encodeKvResponse(request, blobs) {
  if (request.kind === "get") {
    const key = request.blobId ? Buffer.from(request.blobId).toString("hex") : "";
    const value = blobs.get(key) ?? new Uint8Array();
    const result = bytesField(1, value);
    return frameConnectMessage(bytesField(3, concatBytes([varintField(1, request.id), bytesField(2, result)])));
  }
  return frameConnectMessage(bytesField(3, concatBytes([varintField(1, request.id), bytesField(3, new Uint8Array())])));
}

export function decodeCursorKvRequest(message) {
  return decodeKvRequest(message);
}

// agent.v1.InteractionUpdate oneof members that carry server-side tool calls.
// DSH's Cursor transport never advertises tool schemas, so a compliant turn
// only contains text/thinking/turn-end updates; these fields mean the server
// is asking the desktop client to execute a native tool.
const CURSOR_TOOL_CALL_UPDATE_FIELDS = new Map([
  [2, "tool_call_started"],
  [3, "tool_call_completed"],
  [7, "partial_tool_call"],
  [15, "tool_call_delta"],
]);

// agent.v1.ToolCall oneof discriminators, used for diagnostic labels only.
const CURSOR_TOOL_KINDS = new Map([
  [1, "shell"],
  [3, "delete"],
  [4, "glob"],
  [5, "grep"],
  [8, "read"],
  [9, "update-todos"],
  [10, "read-todos"],
  [12, "edit"],
  [13, "ls"],
  [14, "read-lints"],
  [15, "mcp"],
  [16, "sem-search"],
  [17, "create-plan"],
  [18, "web-search"],
  [19, "task"],
  [20, "list-mcp-resources"],
  [21, "read-mcp-resource"],
  [22, "apply-agent-diff"],
  [23, "ask-question"],
  [24, "fetch"],
  [25, "switch-mode"],
  [26, "exa-search"],
  [27, "exa-fetch"],
  [28, "generate-image"],
  [29, "record-screen"],
  [30, "computer-use"],
  [31, "write-shell-stdin"],
  [32, "reflect"],
  [33, "setup-vm-environment"],
  [34, "truncated-tool-call"],
]);

/**
 * Detect AgentService frames that request a native tool execution. Returns a
 * small descriptor for diagnostics (or null when the frame carries no tool
 * call), so the transport can fail loudly instead of silently dropping the
 * server's tool traffic and fabricating an empty success.
 */
export function decodeCursorToolMessage(message) {
  try {
    // AgentServerMessage.interaction_update (field 1).
    const interaction = firstBytes(decodeProtoFields(message), 1);
    if (!interaction) return null;
    const updates = decodeProtoFields(interaction)
      .filter((field) => field.wireType === 2 && CURSOR_TOOL_CALL_UPDATE_FIELDS.has(field.field));
    if (updates.length === 0) return null;
    let callId = "";
    let toolKind = null;
    for (const update of updates.slice(0, 8)) {
      const fields = decodeProtoFields(update.value);
      callId = callId || firstString(fields, 1);
      // Started/completed/partial updates embed agent.v1.ToolCall (field 2);
      // its oneof discriminator names the concrete tool.
      const toolCall = firstBytes(fields, 2);
      const kindField = toolCall
        ? decodeProtoFields(toolCall).find((field) => CURSOR_TOOL_KINDS.has(field.field))
        : null;
      if (kindField) toolKind = CURSOR_TOOL_KINDS.get(kindField.field);
    }
    return {
      updates: updates.map((update) => CURSOR_TOOL_CALL_UPDATE_FIELDS.get(update.field)),
      ...(callId ? { callId } : {}),
      ...(toolKind ? { toolKind } : {}),
    };
  } catch {
    return null;
  }
}

export const cursorNativeProtocolConstants = Object.freeze({
  endpoint: "https://agent.api5.cursor.sh/agent.v1.AgentService/Run",
  providerIdentifier: "opencodex-responses",
});
