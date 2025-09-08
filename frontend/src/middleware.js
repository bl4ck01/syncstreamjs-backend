import { NextResponse } from 'next/server';

export async function middleware(request) {
    // Get token from cookie (raw JWT token)
    const token = request.cookies.get('token')?.value;
    const profileToken = request.cookies.get('profile')?.value;

    const pathname = request.nextUrl.pathname;

    // Public routes that don't require authentication
    const publicRoutes = ['/auth/login', '/auth/register'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // Helper: validate token against backend
    async function isTokenValid(jwt) {
        if (!jwt) return false;
        const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
        try {
            const resp = await fetch(`${apiUrl}/auth/me`, {
                headers: { Authorization: `Bearer ${jwt}` },
                // Keep this fast; middleware runs on the edge
                cache: 'no-store',
            });
            const data = await resp.json().catch(() => null);
            return { success: resp.ok && data && data.success === true, user: data?.data };
        } catch {
            return { success: false, user: {} };
        }
    }

    // No token and route is protected -> redirect to login
    if (!token && !isPublicRoute) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // If token exists, validate it
    if (token) {
        const validToken = await isTokenValid(token);

        // On invalid token: clear cookie and redirect appropriately
        if (!validToken.success) {
            // If currently on login, allow access and drop cookie to avoid loops
            if (pathname === '/auth/login') {
                const res = NextResponse.next();
                console.log('CASE 1: delete token cookie');
                res.cookies.delete('token');
                return res;
            }
            // Protected page: drop cookie and go to login
            const res = NextResponse.redirect(new URL('/auth/login', request.url));
            console.log('CASE 2: delete token cookie');
            res.cookies.delete('token');
            return res;
        }

        // If token is valid and user visits auth pages -> redirect appropriately
        else if (pathname === '/auth/login' || pathname === '/auth/register') {
            // Check subscription status to determine where to redirect
            return NextResponse.redirect(new URL('/', request.url));
        }

        else if (validToken.user?.subscription_status === 'none' && pathname !== '/pricing') {
            return NextResponse.redirect(new URL('/pricing', request.url));
        }

        else if (validToken.user?.subscription_status !== 'none' && pathname === '/pricing') {
            return NextResponse.redirect(new URL('/', request.url));
        }


        else if (validToken.user?.subscription_status !== 'none' && !profileToken && pathname !== '/profiles') {
            return NextResponse.redirect(new URL('/profiles', request.url));
        }

    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/auth/login',
        '/auth/register',
        '/pricing',
        '/',
        '/(app)/:path*',
        '/profiles',
    ],
};
