import net from "node:net";
/**
 * Minimal client for ArtCraft desktop control channels.
 * Usage: node scripts/craft-control.mjs <port> '<json request>'
 * Or import { send } from this file.
 */
export function send(port, request, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.write(JSON.stringify(request) + "\n");
    });
    let data = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      data += chunk;
      if (data.includes("\n")) {
        const line = data.slice(0, data.indexOf("\n"));
        socket.end();
        try { resolve(JSON.parse(line)); } catch (e) { reject(new Error(`Bad reply: ${line}`)); }
      }
    });
    socket.on("error", reject);
    socket.setTimeout(30000, () => { socket.destroy(); reject(new Error("control channel timeout")); });
  });
}

if (process.argv[1] && process.argv[1].endsWith("craft-control.mjs")) {
  const port = Number(process.argv[2]);
  const req = JSON.parse(process.argv[3]);
  send(port, req).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
