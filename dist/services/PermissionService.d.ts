interface UserPermissions {
    calls: boolean;
    messages: boolean;
}
declare class PermissionService {
    private cache;
    private db;
    init(mongoUrl: string, dbName?: string): Promise<void>;
    getUserPermissions(empid: string | number): Promise<UserPermissions>;
    clearCache(empid: string): void;
    clearAllCache(): void;
    /**
     * Update permissions for a user
     */
    updatePermissions(empid: string, permissions: {
        calls: boolean;
        messages: boolean;
    }): Promise<void>;
}
declare const _default: PermissionService;
export default _default;
//# sourceMappingURL=PermissionService.d.ts.map