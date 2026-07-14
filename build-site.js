const { cp, mkdir, rm, writeFile } = require("node:fs/promises");
const { resolve } = require("node:path");

const root = __dirname;
const dist = resolve(root, "dist");
const files = ["index.html", "styles.css", "engine.js", "audio.js", "game.js", "simulate.js", "talent-icons.js", "talent-tree.js", "talent-icons.html"];

const worker = `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
    }
    return env.ASSETS.fetch(request);
  },
};
`;

async function build() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(resolve(dist, "server"), { recursive: true });
  await Promise.all(files.map((file) => cp(resolve(root, file), resolve(dist, file))));
  await cp(resolve(root, "assets"), resolve(dist, "assets"), { recursive: true });
  await writeFile(resolve(dist, "server", "index.js"), worker);
  console.log("Static site build ready in dist/.");
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
