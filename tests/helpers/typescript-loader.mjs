import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { URL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try { return await nextResolve(`${specifier}.ts`, context); } catch { /* try normal resolution */ }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') && !url.includes('/node_modules/')) {
    const source = await readFile(new URL(url), 'utf8');
    return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023,
      } }).outputText,
    };
  }
  return nextLoad(url, context);
}
