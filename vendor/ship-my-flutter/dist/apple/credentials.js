import { Buffer } from "node:buffer";
import { ShipError, invariant } from "../errors.js";
function required(env, name) {
    const value = env[name]?.trim();
    if (!value) {
        throw new ShipError(`Missing required secret ${name}.`, "MISSING_CREDENTIAL");
    }
    return value;
}
function decodeBase64(value, name) {
    const decoded = Buffer.from(value, "base64").toString("utf8").trim();
    invariant(decoded, `${name} decoded to an empty value`, "INVALID_CREDENTIAL");
    return decoded;
}
export function appleCredentialsFromEnvironment(env = process.env) {
    return {
        keyId: required(env, "SMF_APP_STORE_CONNECT_KEY_ID"),
        issuerId: required(env, "SMF_APP_STORE_CONNECT_ISSUER_ID"),
        privateKey: decodeBase64(required(env, "SMF_APP_STORE_CONNECT_PRIVATE_KEY_BASE64"), "SMF_APP_STORE_CONNECT_PRIVATE_KEY_BASE64"),
    };
}
export function signingCredentialsFromEnvironment(env = process.env) {
    return {
        certificateBase64: required(env, "SMF_IOS_CERTIFICATE_BASE64"),
        certificatePassword: required(env, "SMF_IOS_CERTIFICATE_PASSWORD"),
        provisioningProfiles: required(env, "SMF_IOS_PROVISIONING_PROFILES_BASE64"),
    };
}
//# sourceMappingURL=credentials.js.map