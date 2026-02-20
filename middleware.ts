// Next.js types mocked because this is a Vite project
type NextRequest = any;
type NextResponse = any;
const NextResponse = { next: () => ({}), redirect: (url: any) => ({}) };

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
    console.log("🛡️ Middleware intercepting:", request.nextUrl.pathname);

    // Example logic to protect /admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        const sessionCookie = request.cookies.get('session');

        // Check if the secure, HttpOnly session cookie exists
        if (!sessionCookie) {
            console.warn("🚫 Unauthorized access attempt to /admin. Redirecting to /login.");
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: ['/admin/:path*'],
};
