#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { dirname, resolve } from 'node:path';
import { checkRecipe, errorJson, openSession, readIconFile, readJson, resolveSources, writeFiles } from './session.mjs';

const USAGE = `Usage: liquid-composer <command> [options]

Commands:
  apply <recipe.json>      Build the icon from a recipe and write its outputs
  render <recipe.json>     Build the icon and write one image (--size, --mode, --format, --bare)
  import <icon>            Open an Icon Composer document (.icon folder or zip) and print its state (--render <size>)
  validate <recipe.json>   Check a recipe and its files without opening the browser
  schema                   Print the recipe JSON Schema, defaults and guide
  mcp                      Run the MCP server on stdio

Options:
  --out <dir>              Output directory (default: current directory)
  --target <dist|dev|url>  App to drive (default: dist, built by npm run build)
  --gpu                    Render on the GPU instead of SwiftShader
  --allow-fallback         Accept the Canvas 2D fallback when WebGL2 is unavailable

Prints one JSON object on stdout and exits with 1 on error.`;

const OPTIONS = {
  out: { type: 'string', default: '.' },
  target: { type: 'string', default: 'dist' },
  gpu: { type: 'boolean', default: false },
  'allow-fallback': { type: 'boolean', default: false },
  size: { type: 'string', default: '1024' },
  mode: { type: 'string' },
  format: { type: 'string', default: 'png' },
  bare: { type: 'boolean', default: false },
  render: { type: 'string' },
  help: { type: 'boolean', short: 'h' },
};

function usage(message) {
  if (message) process.stderr.write(`${message}\n\n`);
  process.stderr.write(`${USAGE}\n`);
  process.exitCode = 2;
}

async function withSession(options, fn) {
  const session = await openSession(options);
  try {
    const result = await fn(session);
    return { ...result, warnings: session.drainWarnings(), renderer: session.renderer };
  } finally {
    await session.close();
  }
}

async function build(file, outputs, options) {
  const recipe = await resolveSources(await checkRecipe(await readJson(file)), dirname(resolve(file)));
  return withSession(options, async (session) => {
    const state = await session.call('apply', recipe);
    const files = [];
    for (const output of outputs ?? recipe.outputs ?? [{}]) files.push(...await writeFiles(await session.call('export', output), options.out));
    return { files, state };
  });
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({ options: OPTIONS, allowPositionals: true });
  } catch (err) {
    return usage(err.message);
  }
  const { values, positionals: [command, file] } = parsed;
  if (values.help || !command) return usage();
  if (['apply', 'render', 'import', 'validate'].includes(command) && !file) return usage(`${command} needs a file`);
  const options = { target: values.target, gpu: values.gpu, allowFallback: values['allow-fallback'], out: resolve(values.out) };

  if (command === 'mcp') {
    const { startMcp } = await import('./mcp.mjs');
    return startMcp(options);
  }

  const run = {
    apply: () => build(file, undefined, options),
    render: () => build(file, [{ sizes: [Number(values.size)], modes: values.mode && [values.mode], format: values.format, bare: values.bare }], options),
    import: async () => {
      const icon = await readIconFile(resolve(file));
      return withSession(options, async (session) => {
        const state = await session.call('load', icon);
        const files = values.render ? await writeFiles(await session.call('export', { sizes: [Number(values.render)] }), options.out) : [];
        return { files, state };
      });
    },
    validate: async () => {
      await resolveSources(await checkRecipe(await readJson(file)), dirname(resolve(file)));
      return {};
    },
    schema: () => withSession(options, async (session) => ({ schema: await session.call('schema') })),
  }[command];
  if (!run) return usage(`Unknown command "${command}"`);

  try {
    process.stdout.write(`${JSON.stringify({ ok: true, ...await run() }, null, 2)}\n`);
  } catch (err) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: errorJson(err) }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

main();
