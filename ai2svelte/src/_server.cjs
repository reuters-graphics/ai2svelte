const { createServer } = require("vite");

let server;

async function start() {
  server = await createServer({
    root: __dirname + "/preview-app/",
    server: { port: 7000, host: "127.0.0.1", strictPort: true },
  });
  await server.listen();
  console.log("Vite server running at http://127.0.0.1:7000");
}

start();
