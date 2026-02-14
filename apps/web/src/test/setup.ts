import '@testing-library/jest-dom';
import { beforeAll, afterAll, vi } from 'vitest';
import React from 'react';

// JSDOM does not implement matchMedia; many responsive components rely on it.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Clerk authentication
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isSignedIn: true,
    userId: 'user_test',
    getToken: vi.fn(() => Promise.resolve('mock-token')),
  }),
  useUser: () => ({
    user: {
      id: 'user_test',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      publicMetadata: { userType: 'farmer' },
    },
  }),
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  SignUpButton: ({ children }: { children: React.ReactNode }) => children,
  UserButton: () => React.createElement('div', { 'data-testid': 'user-button' }, 'User Button'),
}));

beforeAll(() => {
  // Setup global test environment
  console.log('Setting up frontend test environment...');
});

afterAll(() => {
  // Cleanup
  console.log('Cleaning up frontend test environment...');
});
