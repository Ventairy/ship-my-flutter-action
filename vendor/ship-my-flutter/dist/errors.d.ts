export declare class ShipError extends Error {
    readonly code: string;
    constructor(message: string, code: string, options?: ErrorOptions);
}
export declare function invariant(condition: unknown, message: string, code?: string): asserts condition;
//# sourceMappingURL=errors.d.ts.map