import { route, sendJson } from "../_lib/http.js";
import { currentUser, clearCookie } from "../_lib/auth.js";
import { publicUser } from "../_lib/users.js";

export default route({
    async GET(req, res) {
        const user = await currentUser(req);
        if (!user && String(req.headers.cookie || "").includes("mb_session=")) {
            clearCookie(res);
        }
        sendJson(res, 200, { user: await publicUser(user) });
    }
});
