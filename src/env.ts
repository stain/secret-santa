// What the app needs from its surroundings, set up by server.ts.

import type { Database } from "./sqlite";

export interface Env {
  DB: Database;
  ADMIN_PASSWORD: string;
  /** Named in the privacy notice, e.g. "UpCloud Ltd". */
  HOSTING_PROVIDER: string;
  /** Where the server is, for the privacy notice, e.g. "Helsinki, Finland". */
  HOSTING_LOCATION: string;
}
