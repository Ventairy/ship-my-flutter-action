export class ShipError extends Error {
    code;
    constructor(message, code, options) {
        super(message, options);
        this.code = code;
        this.name = "ShipError";
    }
}
export function invariant(condition, message, code = "INVALID_STATE") {
    if (!condition) {
        throw new ShipError(message, code);
    }
}
//# sourceMappingURL=errors.js.map