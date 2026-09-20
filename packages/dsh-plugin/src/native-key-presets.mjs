/**
 * Subscription-key presets for the mainland-China coding plans.
 *
 * These are API-key providers that DSH itself serves (`llm-pi-ai` routes), not
 * Dockyard OAuth providers: the vendor issues one key, the host stores it in the
 * DSH credential store, and the route profile points at the vendor endpoint.
 * Endpoint, wire protocol, and model IDs mirror the vendor documentation and
 * match the presets `dsh-AuthInOne` ships for the same plans, so a provider
 * declared by either plugin reads the same route in the model picker.
 */

export const NATIVE_KEY_PRESETS = Object.freeze([
  Object.freeze({
    id: "glm-coding-plan",
    name: "GLM Coding Plan（智谱 BigModel）",
    provider: "glm-coding-plan",
    baseURL: "https://open.bigmodel.cn/api/coding/paas/v4",
    api: "openai-completions",
    credentialRef: "GLM_CODING_PLAN_API_KEY",
    sourceUrl: "https://docs.bigmodel.cn/cn/coding-plan/quick-start",
    notice: "厂商把 Coding Plan 限定在受支持的编程工具与产品环境，接入前请确认当前用途符合规则。",
    models: Object.freeze([
      Object.freeze({ id: "glm-5.2", name: "GLM-5.2" }),
      Object.freeze({ id: "glm-5-turbo", name: "GLM-5-Turbo" }),
      Object.freeze({ id: "glm-4.7", name: "GLM-4.7" }),
    ]),
  }),
  Object.freeze({
    id: "kimi-code-plan",
    name: "Kimi Code（月之暗面）",
    provider: "kimi-code-plan",
    baseURL: "https://api.kimi.com/coding/v1",
    api: "openai-completions",
    credentialRef: "KIMI_CODE_PLAN_API_KEY",
    sourceUrl: "https://www.kimi.com/help/kimi-code/membership-guide",
    notice: "使用 Kimi Code 订阅配套的 API Key；这不是 Kimi 开放平台的通用 API Key。",
    models: Object.freeze([
      Object.freeze({ id: "k3", name: "K3" }),
      Object.freeze({ id: "kimi-for-coding", name: "Kimi for Coding" }),
      Object.freeze({ id: "kimi-for-coding-highspeed", name: "Kimi for Coding HighSpeed" }),
    ]),
  }),
  Object.freeze({
    id: "qwen-coding-plan",
    name: "ModelStudio Coding Plan（阿里云百炼）",
    provider: "qwen-coding-plan",
    baseURL: "https://coding.dashscope.aliyuncs.com/v1",
    api: "openai-completions",
    credentialRef: "QWEN_CODING_PLAN_API_KEY",
    sourceUrl: "https://help.aliyun.com/zh/model-studio/coding-plan",
    notice: "专用 Key 面向交互式编程工具，厂商禁止自定义后端、自动化脚本和非交互批处理。",
    models: Object.freeze([
      Object.freeze({ id: "qwen3.7-plus", name: "Qwen 3.7 Plus" }),
      Object.freeze({ id: "qwen3.6-plus", name: "Qwen 3.6 Plus" }),
      Object.freeze({ id: "qwen3-coder-next", name: "Qwen 3 Coder Next" }),
      Object.freeze({ id: "qwen3-coder-plus", name: "Qwen 3 Coder Plus" }),
      Object.freeze({ id: "kimi-k2.5", name: "Kimi K2.5" }),
      Object.freeze({ id: "glm-5", name: "GLM-5" }),
      Object.freeze({ id: "MiniMax-M2.5", name: "MiniMax M2.5" }),
    ]),
  }),
]);

export function nativeKeyPreset(presetId) {
  const id = typeof presetId === "string" ? presetId.trim().toLowerCase() : "";
  if (id.length === 0) return null;
  return NATIVE_KEY_PRESETS.find((preset) => preset.id === id)
    ?? NATIVE_KEY_PRESETS.find((preset) => preset.provider === id)
    ?? null;
}

/** Secret-free projection for the Remote wire and the human command. */
export function nativeKeyPresetView(preset) {
  return {
    id: preset.id,
    name: preset.name,
    provider: preset.provider,
    baseURL: preset.baseURL,
    api: preset.api,
    modelCount: preset.models.length,
    models: preset.models.map((model) => model.id),
    sourceUrl: preset.sourceUrl,
    notice: preset.notice,
  };
}
