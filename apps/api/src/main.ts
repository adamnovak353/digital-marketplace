import "reflect-metadata";
import { All, Controller, Get, Module, Req, Res } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { handleRequest, listRoutes, openMarketplace, openSession, readCookie, sealSession } from "@marketplace/domain/server";
import type { Request, Response } from "express";

function log(event: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ time: new Date().toISOString(), service: "api", event, ...fields }));
}

const runtime = openMarketplace(process.env, log);

@Controller()
class MarketplaceController {
  @Get("health")
  async health() {
    return {
      ok: true,
      persistence: (await runtime).store.kind,
      providers: "mock",
      sentry: Boolean(process.env.SENTRY_DSN),
      otel: Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT),
    };
  }

  @Get("api/v1/docs/routes")
  routes() {
    return { routes: listRoutes() };
  }

  @All("api/v1/*")
  async gateway(@Req() req: Request, @Res() res: Response) {
    const url = new URL(req.originalUrl, "http://localhost");
    const path = url.pathname.replace(/^\/api\/v1/, "") || "/";
    const query: Record<string, string | string[] | undefined> = {};
    url.searchParams.forEach((value, key) => {
      const existing = query[key];
      query[key] = existing ? ([] as string[]).concat(existing, value) : value;
    });
    const token = readCookie(req.headers.cookie, "dm_session");
    const result = await handleRequest(await runtime, {
      method: req.method,
      path,
      query,
      body: req.body,
      actor: token ? openSession(token) : null,
      guestId: readCookie(req.headers.cookie, "dm_guest"),
    });
    if (result.clearSession) res.append("Set-Cookie", "dm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    if (result.session) res.append("Set-Cookie", `dm_session=${sealSession(result.session)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    log("http", { method: req.method, path, status: result.status });
    res.status(result.status).json(result.body);
  }
}

@Module({ controllers: [MarketplaceController] })
class AppModule {}

async function main() {
  const { store } = await runtime;
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN || "http://localhost:3000", credentials: true });
  const config = new DocumentBuilder()
    .setTitle("Digital Marketplace API")
    .setDescription("Versioned demo API. Payment, payout, telecom, and card providers are mock adapters.")
    .setVersion("1.0")
    .addCookieAuth("dm_session")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.paths = {
    ...document.paths,
    ...Object.fromEntries(listRoutes().map((route) => [`/api/v1${route.path.replace(/:([A-Za-z]+)/g, "{$1}")}`, { [route.method.toLowerCase()]: { summary: route.path, responses: { 200: { description: "See route handler" } } } }])),
  };
  SwaggerModule.setup("docs", app, document);
  const port = Number(process.env.API_PORT || 4000);
  await app.listen(port);
  log("listen", { port, persistence: store.kind, providers: "mock" });
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
