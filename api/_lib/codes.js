import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Short, unambiguous public codes like MB-7KQ2XD (no 0/O or 1/I).
export function publicCode(prefix, length = 6) {
    let code = "";
    for (let i = 0; i < length; i += 1) {
        code += ALPHABET[randomInt(ALPHABET.length)];
    }
    return prefix + "-" + code;
}
