export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startEngine } = await import("./lib/loop");
    startEngine();
  }
}
