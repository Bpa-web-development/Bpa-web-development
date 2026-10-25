import { route, sendJson } from "../_lib/http.js";
import { endSession } from "../_lib/auth.js";

export default route({
    async POST(req, res) {
        await endSession(req, res);
        sendJson(res, 200, { ok: true });
    }
});
