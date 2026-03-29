import { Db } from 'mongodb';
export interface DatabaseUser {
    _id: string;
    empid: string;
    name: string;
    email: string;
    gender?: string;
    role?: string;
    department?: string;
    availability?: string;
}
declare class UserService {
    private db;
    /**
     * Initialize the service with the database connection
     * This should be called after PermissionService is initialized
     */
    init(db: Db): void;
    /**
     * Fetch all users from the database
     * Returns only essential fields, excludes sensitive data like passwords
     */
    getAllUsers(): Promise<DatabaseUser[]>;
    /**
     * Get a specific user by empid
     */
    getUserByEmpId(empid: string): Promise<DatabaseUser | null>;
    /**
     * Update user details in the database
     */
    updateUser(empid: string, userData: Partial<DatabaseUser>): Promise<void>;
    /**
     * Update user availability status
     */
    updateAvailability(empid: string, availability: string): Promise<void>;
}
declare const _default: UserService;
export default _default;
//# sourceMappingURL=UserService.d.ts.map