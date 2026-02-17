import { useAccount } from '../contexts/AccountContext';
import { ROLES, ROLE_PERMISSIONS, Scope, hasPermission, Role } from '../config/permissions';

export const useRBAC = () => {
    const { role } = useAccount();

    const can = (scope: Scope): boolean => {
        // If role is undefined or invalid, default false
        if (!role) return false;
        return hasPermission(role as Role, scope);
    };

    /**
     * Helper to check exact role match
     */
    const is = (checkRole: Role) => role === checkRole;

    /**
     * Helper to check if user has ANY of the provided scopes
     */
    const canAny = (scopes: Scope[]) => {
        return scopes.some(scope => can(scope));
    };

    return {
        role,
        can,
        canAny,
        is,
        permissions: role ? ROLE_PERMISSIONS[role as Role] : []
    };
};
