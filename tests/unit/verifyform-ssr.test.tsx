/**
 * Regression tests for the VerifyForm hydration bug.
 *
 * Bug: VerifyForm called `useSearchParams()` during render to seed the active
 * tab from `?tab=`. On the statically prerendered `/` route that makes Next.js
 * bail out to client-side rendering for the enclosing Suspense boundary, so the
 * server shipped the fallback `<div>` instead of the `<form>`. React then failed
 * hydration with:
 *
 *   "Expected server HTML to contain a matching <form> in <div>."
 *
 * These tests lock in the two properties that keep it fixed:
 *   1. the component renders a <form> on the server, and
 *   2. it does not read search params during render.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const replace = jest.fn();

// Mirrors Next.js behaviour: calling useSearchParams() while server-rendering a
// static route triggers a bail-out instead of returning params. If someone
// reintroduces a render-time call, this throws and the tests below fail.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => {
    throw new Error('BAILOUT_TO_CLIENT_SIDE_RENDERING');
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { VerifyForm } = require('@/components/verify/VerifyForm') as typeof import('@/components/verify/VerifyForm');

describe('VerifyForm — server rendering', () => {
  it('renders a <form> in the server markup', () => {
    const html = renderToStaticMarkup(<VerifyForm onSubmit={jest.fn()} />);
    expect(html).toContain('<form');
  });

  it('does not call useSearchParams() during render', () => {
    // The mock throws on any render-time call, so a successful render proves
    // the hook is not on the render path.
    expect(() => renderToStaticMarkup(<VerifyForm onSubmit={jest.fn()} />)).not.toThrow();
  });

  it('produces identical markup across renders (deterministic first paint)', () => {
    const first = renderToStaticMarkup(<VerifyForm onSubmit={jest.fn()} />);
    const second = renderToStaticMarkup(<VerifyForm onSubmit={jest.fn()} />);
    expect(first).toBe(second);
  });

  it('defaults to the screenshot tab so server and client agree before hydration', () => {
    const html = renderToStaticMarkup(<VerifyForm onSubmit={jest.fn()} />);
    // The screenshot tab is the only one selected in the initial server markup.
    expect(html).toContain('aria-selected="true"');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    const screenshotTabIndex = html.indexOf('Screenshot');
    const selectedIndex = html.indexOf('aria-selected="true"');
    expect(selectedIndex).toBeLessThan(screenshotTabIndex);
  });

  it('renders the submit button in the server markup', () => {
    const html = renderToStaticMarkup(<VerifyForm onSubmit={jest.fn()} />);
    expect(html).toContain('type="submit"');
  });
});
