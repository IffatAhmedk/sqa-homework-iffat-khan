import { type Page } from '@playwright/test';
import { ASK_ENDPOINT, SUGGESTIONS_ENDPOINT } from '../apis/chat-apis';

// JSON object skeleton from the suggestions API
// pill displays the title; clicking the pill it sends prompt to the API
export interface Suggestion {
  id: string;
  title: string; 
  prompt: string; 
  order: number;
  enabled: boolean;
}

export const chatInput = (page: Page) => page.getByTestId('agent-chat-input');
export const sendButton = (page: Page) => page.getByTestId('agent-chat-input-send-button');
export const pill = (page: Page, title: string) =>
  page.getByRole('button', { name: title, exact: true });

export async function openChat(page: Page): Promise<Suggestion[]> {
  await page.context().addCookies([
    {
      name: 'OptanonAlertBoxClosed',
      value: new Date().toISOString(),
      domain: 'ask.permission.ai',
      path: '/',
    },
  ]);

// first visit auto-sends a greeting and hides the pills
// reload lands us in the returning-visitor state where they render the pills
  const greetingPromise = page
    .waitForResponse((response) => response.url().includes(ASK_ENDPOINT), { timeout: 20_000 })
    .catch(() => null); 
  await page.goto('/');
  await greetingPromise;

  const suggestionsPromise = page.waitForResponse((response) =>
    response.url().includes(SUGGESTIONS_ENDPOINT),
  );
  await page.reload();
  const suggestions = (await (await suggestionsPromise).json()) as Suggestion[];
  return suggestions
    .filter((suggestion) => suggestion.enabled)
    .sort((a, b) => a.order - b.order);
}
