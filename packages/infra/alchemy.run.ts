import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import "varlock/auto-load";

export const web = Cloudflare.Website.Vite("web", {
  rootDir: "../../apps/web",
  compatibility: {
    flags: ["nodejs_compat", "global_fetch_strictly_public"],
  },
  env: {
    DATABASE_URL: Config.Redacted("DATABASE_URL"),
    DATABASE_AUTH_TOKEN: Config.Redacted("DATABASE_AUTH_TOKEN"),
    BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: Config.String("BETTER_AUTH_URL"),
    GOOGLE_CLIENT_ID: Config.Redacted("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: Config.Redacted("GOOGLE_CLIENT_SECRET"),
    RESEND_API_KEY: Config.Redacted("RESEND_API_KEY"),
    EMAIL_FROM: Config.String("EMAIL_FROM"),
  },
  dev: {
    port: 3005,
  },
  name: "humara-neta",
});

export type WebEnv = Cloudflare.InferEnv<typeof web>;

export default Alchemy.Stack(
  "humara-neta",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const webWorker = yield* web;

    return {
      web: webWorker.url,
    };
  })
);
