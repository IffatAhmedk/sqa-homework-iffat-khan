import { expect, type Page } from '@playwright/test';
import { ASK_ENDPOINT, SUGGESTIONS_ENDPOINT } from '../apis/chat-apis';
import { seedConsentCookie } from './site';

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
  await seedConsentCookie(page);

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

// JSON object skeleton from the ask API , the full answer arrives in ONE
// payload; the visible "streaming" is a client-side typewriter animation
export interface AgentReply {
  message: string;
  session_id: string;
}

export interface AskResult {
  reply: AgentReply; // what the agent answered
  sentMessage: string; // what the UI actually put in the POST payload
}

// send (click a pill, press Enter, ...) and wait for the agent's
// reply: the POST must succeed, carry a non-empty answer, and that answer
// must finish rendering on screen. no fixed strings, no sleeps
export async function ask(page: Page, send: () => Promise<void>): Promise<AskResult> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(ASK_ENDPOINT) && response.request().method() === 'POST',
  );
  await send();
  const response = await responsePromise;

  expect(response.ok(), `${ASK_ENDPOINT} responds 2xx`).toBeTruthy();
  const sentMessage =
    (response.request().postDataJSON() as { message?: string }).message ?? '';
  const reply = (await response.json()) as AgentReply;
  expect(reply.message.trim().length, 'agent answer is non-empty').toBeGreaterThan(0);
  await expectFullyRendered(page, reply.message);
  await expect(agentBubble(page, reply.message), 'agent answer bubble is visible').toBeVisible();

  return { reply, sentMessage };
}

// message bubbles carry no data-testid, role, or aria-label
// plain divs all the way up. the only non-fragile hook left is
// the answer text itself
export function agentBubble(page: Page, message: string) {
  const snippet = normalize(message).slice(0, 40);
  return page.getByText(snippet, { exact: false }).last();
}

// wait until the typewriter has rendered the complete API answer on screen
export async function expectFullyRendered(page: Page, message: string): Promise<void> {
  await expect
    .poll(async () => normalize(await page.locator('body').innerText()), {
      timeout: 120_000,
      message: 'typewriter animation should finish rendering the full agent answer',
    })
    .toContain(normalize(message));
}

// collapse whitespace and strip the markdown tokens the renderer consumes,
// so the raw API text and the on-screen text compare equal
export function normalize(text: string): string {
  return text
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
