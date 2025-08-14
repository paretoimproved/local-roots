import type { Context, Next } from 'hono';

// A simple auth middleware for development without requiring Clerk
export const requireAuth = () => async (c: Context, next: Next) => {
  try {
    // For development - allow all requests through
    console.log("Development mode: Auth bypassed");
    
    // Attach a mock user ID for development
    c.set('auth', { userId: 'dev_user_123' });
    
    await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: 'Authentication error' }, 401);
  }
};

// A simple optional auth middleware
export const auth = () => async (c: Context, next: Next) => {
  try {
    // For development - fake authentication
    console.log("Development mode: Optional auth bypassed");
    
    // Attach a mock user ID for development
    c.set('auth', { userId: 'dev_user_123' });
    
    await next();
  } catch (error) {
    console.error('Auth error:', error);
    await next();
  }
};

// Helper function to get the user ID from the request context
export function getUserId(c: Context): string {
  const auth = c.get('auth');
  
  if (!auth || !auth.userId) {
    throw new Error('User not authenticated');
  }
  
  return auth.userId;
} 