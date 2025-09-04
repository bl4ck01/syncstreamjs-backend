export default {
    meta: {
        name: 'English',
        nativeName: 'English',
        direction: 'ltr'
    },

    // Common messages
    common: {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Information',
        loading: 'Loading...',
        saving: 'Saving...',
        cancel: 'Cancel',
        confirm: 'Confirm',
        delete: 'Delete',
        edit: 'Edit',
        save: 'Save',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        search: 'Search',
        filter: 'Filter',
        sort: 'Sort',
        refresh: 'Refresh',
        download: 'Download',
        upload: 'Upload',
        yes: 'Yes',
        no: 'No'
    },

    // Authentication
    auth: {
        login: 'Login',
        logout: 'Logout',
        signup: 'Sign Up',
        forgotPassword: 'Forgot Password?',
        resetPassword: 'Reset Password',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        rememberMe: 'Remember Me',
        loginSuccess: 'Logged in successfully',
        logoutSuccess: 'Logged out successfully',
        signupSuccess: 'Account created successfully',
        invalidCredentials: 'Invalid email or password',
        emailAlreadyExists: 'User with this email already exists',
        unauthorized: 'Authentication required',
        forbidden: 'Insufficient permissions',
        sessionExpired: 'Your session has expired. Please login again.'
    },

    // User & Profile
    user: {
        profile: 'Profile',
        profiles: 'Profiles',
        settings: 'Settings',
        account: 'Account',
        subscription: 'Subscription',
        billing: 'Billing',
        fullName: 'Full Name',
        role: 'Role',
        createdAt: 'Member Since',
        selectProfile: 'Select Profile',
        createProfile: 'Create Profile',
        editProfile: 'Edit Profile',
        deleteProfile: 'Delete Profile',
        profileName: 'Profile Name',
        kidsProfile: 'Kids Profile',
        parentalPin: 'Parental PIN',
        pinRequired: 'PIN required',
        invalidPin: 'Invalid PIN',
        profileCreated: 'Profile created successfully',
        profileUpdated: 'Profile updated successfully',
        profileDeleted: 'Profile deleted successfully',
        profileNotFound: 'Profile not found',
        maxProfilesReached: 'Maximum profiles limit reached: {{limit}}'
    },

    // Playlists
    playlist: {
        playlists: 'Playlists',
        createPlaylist: 'Add Playlist',
        editPlaylist: 'Edit Playlist',
        deletePlaylist: 'Delete Playlist',
        playlistName: 'Playlist Name',
        playlistUrl: 'Playlist URL',
        username: 'Username',
        password: 'Password',
        active: 'Active',
        inactive: 'Inactive',
        playlistCreated: 'Playlist added successfully',
        playlistUpdated: 'Playlist updated successfully',
        playlistDeleted: 'Playlist deleted successfully',
        playlistNotFound: 'Playlist not found',
        maxPlaylistsReached: 'Maximum playlists limit reached: {{limit}}'
    },

    // Favorites
    favorite: {
        favorites: 'Favorites',
        addToFavorites: 'Add to Favorites',
        removeFromFavorites: 'Remove from Favorites',
        favoriteAdded: 'Added to favorites',
        favoriteRemoved: 'Removed from favorites',
        alreadyInFavorites: 'Item is already in favorites',
        favoriteNotFound: 'Favorite not found',
        maxFavoritesReached: 'Maximum favorites limit reached: {{limit}}'
    },

    // Watch Progress
    progress: {
        continueWatching: 'Continue Watching',
        watchProgress: 'Watch Progress',
        markAsWatched: 'Mark as Watched',
        progressUpdated: 'Progress updated',
        progressDeleted: 'Progress deleted'
    },

    // Subscriptions
    subscription: {
        plans: 'Plans',
        currentPlan: 'Current Plan',
        upgradePlan: 'Upgrade Plan',
        downgradePlan: 'Downgrade Plan',
        cancelSubscription: 'Cancel Subscription',
        reactivateSubscription: 'Reactivate Subscription',
        billingPortal: 'Billing Portal',
        free: 'Free',
        basic: 'Basic',
        premium: 'Premium',
        family: 'Family',
        monthly: 'Monthly',
        yearly: 'Yearly',
        price: 'Price',
        features: 'Features',
        subscriptionCreated: 'Subscription created successfully',
        subscriptionUpdated: 'Subscription updated successfully',
        subscriptionCanceled: 'Subscription canceled',
        subscriptionReactivated: 'Subscription reactivated',
        paymentFailed: 'Payment failed',
        trialEnding: 'Your trial ends in {{days}} days',
        noActiveSubscription: 'No active subscription found'
    },

    // Admin
    admin: {
        dashboard: 'Admin Dashboard',
        users: 'Users',
        statistics: 'Statistics',
        systemStats: 'System Statistics',
        totalUsers: 'Total Users',
        activeSubscriptions: 'Active Subscriptions',
        monthlyRevenue: 'Monthly Revenue',
        userManagement: 'User Management',
        roleUpdated: 'User role updated to {{role}}',
        creditsAdded: '{{amount}} credits added successfully',
        planCreated: 'Plan created successfully',
        planUpdated: 'Plan updated successfully'
    },

    // Reseller
    reseller: {
        dashboard: 'Reseller Dashboard',
        clients: 'Clients',
        createClient: 'Create Client',
        transactions: 'Transactions',
        creditsBalance: 'Credits Balance',
        totalClients: 'Total Clients',
        activeClients: 'Active Clients',
        clientCreated: 'Client created successfully',
        insufficientCredits: 'Insufficient credits. Required: {{required}}, Available: {{available}}',
        creditsPurchased: 'Credits purchased successfully'
    },

    // Errors
    error: {
        notFound: '{{resource}} not found',
        validation: 'Validation error: {{details}}',
        database: 'Database operation failed',
        payment: 'Payment processing failed',
        stripe: 'Payment service error',
        rateLimit: 'Too many requests. Please try again later',
        serverError: 'An unexpected error occurred',
        networkError: 'Network error. Please check your connection',
        timeout: 'Request timeout',
        maintenance: 'Service is under maintenance'
    },

    // Success messages
    success: {
        saved: 'Saved successfully',
        updated: 'Updated successfully',
        deleted: 'Deleted successfully',
        created: 'Created successfully',
        sent: 'Sent successfully',
        copied: 'Copied to clipboard'
    },

    // Validation messages
    validation: {
        required: '{{field}} is required',
        email: 'Invalid email address',
        minLength: '{{field}} must be at least {{min}} characters',
        maxLength: '{{field}} must not exceed {{max}} characters',
        minValue: '{{field}} must be at least {{min}}',
        maxValue: '{{field}} must not exceed {{max}}',
        pattern: '{{field}} format is invalid',
        unique: '{{field}} already exists',
        confirmed: '{{field}} confirmation does not match'
    }
};
