export declare function readJson<T>(filePath: string): Promise<T>;
export declare function writeJson(filePath: string, value: unknown): Promise<void>;
export declare function readYaml<T>(filePath: string): Promise<T>;
export declare function writeYaml(filePath: string, value: unknown, schemaUrl?: string): Promise<void>;
export declare function fileExists(filePath: string): Promise<boolean>;
//# sourceMappingURL=json.d.ts.map