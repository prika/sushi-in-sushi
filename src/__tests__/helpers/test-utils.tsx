import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
}

function AllTheProviders({ children }: { children: React.ReactNode }) {
  // Add your providers here (e.g., context providers, theme providers)
  return <>{children}</>;
}

export function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const user = userEvent.setup();
  return {
    user,
    ...render(ui, { wrapper: AllTheProviders, ...options }),
  };
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };
export { userEvent };
