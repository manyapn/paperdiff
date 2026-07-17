import componentSource from "./component.js?raw";
import templateSource from "./paperdiff.template.html?raw";
import stylesSource from "./styles.css?raw";
import { createPaperDiffApi, type PaperDiffApi, type PaperDiffConfig } from "./api";

interface RuntimeAsset {
  mime: string;
  compressed: boolean;
  data: string;
}

interface ExternalResource {
  id: string;
  uuid: string;
}

declare global {
  interface Window {
    PaperDiffAPI: PaperDiffApi;
    __resources: Record<string, string>;
    __resourceBlobs: Record<string, Blob>;
  }
}

const status = document.querySelector<HTMLElement>("#loading-status");

function setStatus(message: string) {
  if (status) status.textContent = message;
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function decompress(bytes: Uint8Array) {
  if (!("DecompressionStream" in window)) {
    throw new Error("This browser does not support the PaperDiff animation runtime.");
  }

  const ownedBytes = new Uint8Array(bytes.byteLength);
  ownedBytes.set(bytes);
  const compressed = new Blob([ownedBytes.buffer]).stream();
  const decompressed = compressed.pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(decompressed).arrayBuffer());
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(new URL(path, document.baseURI));
  if (!response.ok) throw new Error(`Could not load ${path}.`);
  return (await response.json()) as T;
}

async function executeTemplateScripts(resourceBlobs: Record<string, Blob>) {
  for (const oldScript of Array.from(document.scripts)) {
    const script = document.createElement("script");
    for (const attribute of Array.from(oldScript.attributes)) {
      script.setAttribute(attribute.name, attribute.value);
    }
    script.textContent = oldScript.textContent;

    if ((script.type === "text/babel" || script.type === "text/jsx") && script.src) {
      const source = resourceBlobs[script.src.split("#")[0]];
      script.textContent = source
        ? await source.text()
        : await (await fetch(script.src)).text();
      script.removeAttribute("src");
    }

    const loaded = script.src
      ? new Promise<void>((resolve) => {
          script.onload = () => resolve();
          script.onerror = () => resolve();
        })
      : null;
    oldScript.replaceWith(script);
    if (loaded) await loaded;
  }
}

async function start() {
  const [manifest, externalResources, config] = await Promise.all([
    fetchJson<Record<string, RuntimeAsset>>("./vendor/runtime-manifest.generated.json"),
    fetchJson<ExternalResource[]>("./vendor/external-resources.generated.json"),
    fetchJson<PaperDiffConfig>("./config.json"),
  ]);
  window.PaperDiffAPI = createPaperDiffApi(config);

  const assetUrls: Record<string, string> = {};
  const resourceBlobs: Record<string, Blob> = {};
  const entries = Object.entries(manifest);
  setStatus(`Loading ${entries.length} interface assets…`);

  await Promise.all(
    entries.map(async ([uuid, asset]) => {
      const encoded = decodeBase64(asset.data);
      const bytes = asset.compressed ? await decompress(encoded) : encoded;
      const isFont = /^(font\/|application\/(x-)?font-|application\/vnd\.ms-fontobject)/i.test(
        asset.mime,
      );

      if (isFont) {
        assetUrls[uuid] = `data:${asset.mime};base64,${encodeBase64(bytes)}`;
        return;
      }

      const ownedBytes = new Uint8Array(bytes.byteLength);
      ownedBytes.set(bytes);
      const blob = new Blob([ownedBytes.buffer], { type: asset.mime });
      const url = URL.createObjectURL(blob);
      assetUrls[uuid] = url;
      resourceBlobs[url] = blob;
    }),
  );

  window.__resourceBlobs = resourceBlobs;
  window.__resources = Object.fromEntries(
    externalResources
      .filter(({ uuid }) => Boolean(assetUrls[uuid]))
      .map(({ id, uuid }) => [id, assetUrls[uuid]]),
  );

  let template = templateSource
    .replace("/* PAPERDIFF_COMPONENT */", componentSource)
    .replace("<!-- PAPERDIFF_STYLES -->", `<style>${stylesSource}</style>`);

  for (const [uuid, url] of Object.entries(assetUrls)) {
    template = template.replaceAll(uuid, url);
  }
  template = template
    .replace(/\s+integrity="[^"]*"/gi, "")
    .replace(/\s+crossorigin="[^"]*"/gi, "");

  const resourceScript = `<script>window.__resources = ${JSON.stringify(window.__resources).replaceAll("</", "<\\/")};<\/script>`;
  template = template.replace(/<head[^>]*>/i, (opening) => opening + resourceScript);

  setStatus("Rendering PaperDiff…");
  const nextDocument = new DOMParser().parseFromString(template, "text/html");
  nextDocument.title = "PaperDiff";
  document.documentElement.replaceWith(nextDocument.documentElement);
  await executeTemplateScripts(resourceBlobs);
}

window.addEventListener("error", (event) => {
  console.error("[PaperDiff frontend]", event.error || event.message || event.type);
});

start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  setStatus(`PaperDiff could not start: ${message}`);
  console.error("[PaperDiff frontend]", error);
});
