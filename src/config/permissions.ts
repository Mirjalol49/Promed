export const ROLES = {
    ADMIN: 'admin',
    DOCTOR: 'doctor',
    NURSE: 'nurse',
    SELLER: 'seller', // Represents "Call Operator"
    VIEWER: 'viewer',
    STAFF: 'staff',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const SCOPES = {
    // Global
    canViewDashboard: 'view:dashboard',

    // Patients
    canViewPatients: 'view:patients',
    canEditPatients: 'edit:patients', // Create, Update, Delete

    // Leads (Clients)
    canViewLeads: 'view:leads',
    canEditLeads: 'edit:leads',

    // Finance
    canViewFinance: 'view:finance',
    canEditFinance: 'edit:finance',

    // Staff
    canViewStaff: 'view:staff',
    canEditStaff: 'edit:staff',

    // Messages
    canViewMessages: 'view:messages',
    canEditMessages: 'edit:messages',

    // Notes
    canViewNotes: 'view:notes',
    canEditNotes: 'edit:notes',

    // Settings & Admin
    canViewSettings: 'view:settings',
    canEditSettings: 'edit:settings',
    canViewRoles: 'view:roles',
    canEditRoles: 'edit:roles',
    canViewAdmin: 'view:admin',
} as const;

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

/**
 * Role-Based Permission Matrix
 */
export const ROLE_PERMISSIONS: Record<Role, Scope[] | '*'> = {
    [ROLES.ADMIN]: '*', // Super Admin
    [ROLES.DOCTOR]: '*', // Doctor (Admin equivalent)

    // 1. Nurse: Can only access Dashboard + Patients (CRUD)
    [ROLES.NURSE]: [
        SCOPES.canViewDashboard,
        SCOPES.canViewPatients,
        SCOPES.canEditPatients,
        SCOPES.canViewSettings,
    ],

    // 2. Call Operator (Seller): Can only access Leads (CRUD)
    [ROLES.SELLER]: [
        SCOPES.canViewLeads,
        SCOPES.canEditLeads,
        SCOPES.canViewSettings,
    ],

    // 3. Viewer: Global Read-Only
    [ROLES.VIEWER]: [
        SCOPES.canViewDashboard,
        SCOPES.canViewPatients,
        SCOPES.canViewLeads,
        SCOPES.canViewFinance,
        SCOPES.canViewStaff,
        SCOPES.canViewMessages,
        SCOPES.canViewNotes,
        SCOPES.canViewSettings,
        // NO EDIT PERMISSIONS
    ],

    // Default Staff (if unused, keep minimal)
    [ROLES.STAFF]: [
        SCOPES.canViewDashboard,
        SCOPES.canViewPatients,
    ],
};

/**
 * Helper to check if a role has a specific permission
 */
export const hasPermission = (role: Role, scope: Scope): boolean => {
    const permissions = ROLE_PERMISSIONS[role];
    if (permissions === '*') return true;
    return permissions.includes(scope);
};
