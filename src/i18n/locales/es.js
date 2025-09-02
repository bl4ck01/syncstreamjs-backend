export default {
    meta: {
        name: 'Spanish',
        nativeName: 'Español',
        direction: 'ltr'
    },

    common: {
        success: 'Éxito',
        error: 'Error',
        warning: 'Advertencia',
        info: 'Información',
        loading: 'Cargando...',
        saving: 'Guardando...',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        delete: 'Eliminar',
        edit: 'Editar',
        save: 'Guardar',
        close: 'Cerrar',
        back: 'Atrás',
        next: 'Siguiente',
        previous: 'Anterior',
        search: 'Buscar',
        filter: 'Filtrar',
        sort: 'Ordenar',
        refresh: 'Actualizar',
        download: 'Descargar',
        upload: 'Subir',
        yes: 'Sí',
        no: 'No'
    },

    auth: {
        login: 'Iniciar Sesión',
        logout: 'Cerrar Sesión',
        signup: 'Registrarse',
        forgotPassword: '¿Olvidaste tu Contraseña?',
        resetPassword: 'Restablecer Contraseña',
        email: 'Correo Electrónico',
        password: 'Contraseña',
        confirmPassword: 'Confirmar Contraseña',
        rememberMe: 'Recuérdame',
        loginSuccess: 'Sesión iniciada correctamente',
        logoutSuccess: 'Sesión cerrada correctamente',
        signupSuccess: 'Cuenta creada correctamente',
        invalidCredentials: 'Correo o contraseña inválidos',
        emailAlreadyExists: 'Ya existe un usuario con este correo',
        unauthorized: 'Autenticación requerida',
        forbidden: 'Permisos insuficientes',
        sessionExpired: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
    },

    user: {
        profile: 'Perfil',
        profiles: 'Perfiles',
        settings: 'Configuración',
        account: 'Cuenta',
        subscription: 'Suscripción',
        billing: 'Facturación',
        fullName: 'Nombre Completo',
        role: 'Rol',
        createdAt: 'Miembro Desde',
        selectProfile: 'Seleccionar Perfil',
        createProfile: 'Crear Perfil',
        editProfile: 'Editar Perfil',
        deleteProfile: 'Eliminar Perfil',
        profileName: 'Nombre del Perfil',
        kidsProfile: 'Perfil Infantil',
        parentalPin: 'PIN Parental',
        pinRequired: 'PIN requerido',
        invalidPin: 'PIN inválido',
        profileCreated: 'Perfil creado correctamente',
        profileUpdated: 'Perfil actualizado correctamente',
        profileDeleted: 'Perfil eliminado correctamente',
        profileNotFound: 'Perfil no encontrado',
        maxProfilesReached: 'Límite máximo de perfiles alcanzado: {{limit}}'
    },

    playlist: {
        playlists: 'Listas de Reproducción',
        createPlaylist: 'Agregar Lista',
        editPlaylist: 'Editar Lista',
        deletePlaylist: 'Eliminar Lista',
        playlistName: 'Nombre de la Lista',
        playlistUrl: 'URL de la Lista',
        username: 'Usuario',
        password: 'Contraseña',
        active: 'Activa',
        inactive: 'Inactiva',
        playlistCreated: 'Lista agregada correctamente',
        playlistUpdated: 'Lista actualizada correctamente',
        playlistDeleted: 'Lista eliminada correctamente',
        playlistNotFound: 'Lista no encontrada',
        maxPlaylistsReached: 'Límite máximo de listas alcanzado: {{limit}}'
    },

    favorite: {
        favorites: 'Favoritos',
        addToFavorites: 'Agregar a Favoritos',
        removeFromFavorites: 'Quitar de Favoritos',
        favoriteAdded: 'Agregado a favoritos',
        favoriteRemoved: 'Quitado de favoritos',
        alreadyInFavorites: 'El elemento ya está en favoritos',
        favoriteNotFound: 'Favorito no encontrado',
        maxFavoritesReached: 'Límite máximo de favoritos alcanzado: {{limit}}'
    },

    progress: {
        continueWatching: 'Continuar Viendo',
        watchProgress: 'Progreso de Visualización',
        markAsWatched: 'Marcar como Visto',
        progressUpdated: 'Progreso actualizado',
        progressDeleted: 'Progreso eliminado'
    },

    subscription: {
        plans: 'Planes',
        currentPlan: 'Plan Actual',
        upgradePlan: 'Mejorar Plan',
        downgradePlan: 'Reducir Plan',
        cancelSubscription: 'Cancelar Suscripción',
        reactivateSubscription: 'Reactivar Suscripción',
        billingPortal: 'Portal de Facturación',
        free: 'Gratis',
        basic: 'Básico',
        premium: 'Premium',
        family: 'Familiar',
        monthly: 'Mensual',
        yearly: 'Anual',
        price: 'Precio',
        features: 'Características',
        subscriptionCreated: 'Suscripción creada correctamente',
        subscriptionUpdated: 'Suscripción actualizada correctamente',
        subscriptionCanceled: 'Suscripción cancelada',
        subscriptionReactivated: 'Suscripción reactivada',
        paymentFailed: 'Pago fallido',
        trialEnding: 'Tu prueba termina en {{days}} días',
        noActiveSubscription: 'No se encontró suscripción activa'
    },

    admin: {
        dashboard: 'Panel de Administración',
        users: 'Usuarios',
        statistics: 'Estadísticas',
        systemStats: 'Estadísticas del Sistema',
        totalUsers: 'Total de Usuarios',
        activeSubscriptions: 'Suscripciones Activas',
        monthlyRevenue: 'Ingresos Mensuales',
        userManagement: 'Gestión de Usuarios',
        roleUpdated: 'Rol de usuario actualizado a {{role}}',
        creditsAdded: '{{amount}} créditos agregados correctamente',
        planCreated: 'Plan creado correctamente',
        planUpdated: 'Plan actualizado correctamente'
    },

    reseller: {
        dashboard: 'Panel de Revendedor',
        clients: 'Clientes',
        createClient: 'Crear Cliente',
        transactions: 'Transacciones',
        creditsBalance: 'Saldo de Créditos',
        totalClients: 'Total de Clientes',
        activeClients: 'Clientes Activos',
        clientCreated: 'Cliente creado correctamente',
        insufficientCredits: 'Créditos insuficientes. Requeridos: {{required}}, Disponibles: {{available}}',
        creditsPurchased: 'Créditos comprados correctamente'
    },

    error: {
        notFound: '{{resource}} no encontrado',
        validation: 'Error de validación: {{details}}',
        database: 'Operación de base de datos fallida',
        payment: 'Procesamiento de pago fallido',
        stripe: 'Error del servicio de pago',
        rateLimit: 'Demasiadas solicitudes. Por favor, intenta más tarde',
        serverError: 'Ocurrió un error inesperado',
        networkError: 'Error de red. Por favor, verifica tu conexión',
        timeout: 'Tiempo de espera agotado',
        maintenance: 'El servicio está en mantenimiento'
    },

    success: {
        saved: 'Guardado correctamente',
        updated: 'Actualizado correctamente',
        deleted: 'Eliminado correctamente',
        created: 'Creado correctamente',
        sent: 'Enviado correctamente',
        copied: 'Copiado al portapapeles'
    },

    validation: {
        required: '{{field}} es requerido',
        email: 'Dirección de correo inválida',
        minLength: '{{field}} debe tener al menos {{min}} caracteres',
        maxLength: '{{field}} no debe exceder {{max}} caracteres',
        minValue: '{{field}} debe ser al menos {{min}}',
        maxValue: '{{field}} no debe exceder {{max}}',
        pattern: 'El formato de {{field}} es inválido',
        unique: '{{field}} ya existe',
        confirmed: 'La confirmación de {{field}} no coincide'
    }
};
