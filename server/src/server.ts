import { buildApp } from "./app";
import { env } from "./env";

const app = buildApp();
app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT}`);
});
