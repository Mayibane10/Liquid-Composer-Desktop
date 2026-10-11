import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { API_VERSION, GUIDE, LayerPatchSchema, RecipeSchema, encodeRecipe, formatIssues, recipeLayers, sourceType, type Issue, type Recipe } from '../src/agent/recipe.js';

const MAX_BODY = 1024 * 1024;
const MAX_RECIPE = 512 * 1024;
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/;

function check(input: unknown): { recipe: Recipe; issues: [] } | { recipe: null; issues: Issue[] } {
  const result = RecipeSchema.safeParse(input);
  if (!result.success) return { recipe: null, issues: formatIssues(result.error.issues) };
  const issues = recipeLayers(result.data)
    .filter(({ layer }) => layer.type !== 'group' && layer.src && sourceType(layer.src) === 'path')
    .map(({ path }) => ({ path: [...path, 'src'].join('.'), message: 'Remote recipes need inline SVG markup or a data: URL; file paths only work with the local CLI and MCP server' }));
  if (JSON.stringify(result.data).length > MAX_RECIPE) issues.push({ path: '(root)', message: `Recipe larger than ${MAX_RECIPE / 1024} KB` });
  return issues.length ? { recipe: null, issues } : { recipe: result.data, issues: [] };
}

function createServer(appUrl: string) {
  const server = new McpServer({ name: 'liquid-composer', version: String(API_VERSION) }, {
    instructions: `Liquid Composer designs Liquid Glass app icons (iOS 27, Icon Composer 2). This remote server cannot render: write a recipe, check it with liquid_validate, then call liquid_open and give the user the link; the icon opens in their browser, where they can export PNG, the all-appearances zip or .icon.\n\n${GUIDE}`,
  });
  const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });

  server.registerTool('liquid_schema', {
    title: 'Recipe schema',
    description: 'JSON Schema of recipes and layer patches, and the guide.',
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, () => json({
    version: API_VERSION,
    guide: GUIDE,
    recipe: z.toJSONSchema(RecipeSchema, { io: 'input' }),
    patch: z.toJSONSchema(LayerPatchSchema, { io: 'input' }),
  }));

  server.registerTool('liquid_validate', {
    title: 'Validate recipe',
    description: 'Check a recipe without opening it; returns ok or the list of issues with their paths.',
    inputSchema: { recipe: z.unknown() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, ({ recipe }) => {
    const { issues } = check(recipe);
    return json(issues.length ? { ok: false, issues } : { ok: true });
  });

  server.registerTool('liquid_open', {
    title: 'Open in Liquid Composer',
    description: 'Turn a recipe into a link that opens the icon in Liquid Composer. The recipe travels in the URL fragment, so it never reaches a server. Images must be inline SVG markup or data: URLs.',
    inputSchema: { recipe: RecipeSchema },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, ({ recipe }) => {
    const checked = check(recipe);
    if (!checked.recipe) return { ...json({ ok: false, issues: checked.issues }), isError: true };
    return json({ ok: true, url: `${appUrl}/#r=${encodeRecipe(checked.recipe)}` });
  });

  return server;
}

function allowedOrigin(origin: string, self: URL) {
  try {
    const url = new URL(origin);
    return url.origin === self.origin || url.hostname === 'liquid-composer.vercel.app' || LOCAL_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
    const self = new URL(request.url);
    const origin = request.headers.get('origin');
    if (origin && !allowedOrigin(origin, self)) return new Response('Origin not allowed', { status: 403 });
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: MAX_BODY });
    await createServer(self.origin).connect(transport);
    return transport.handleRequest(request);
  },
};
