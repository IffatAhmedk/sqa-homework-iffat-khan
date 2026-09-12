# UX review

**Method:** I tested pre-login on desktop (1280×720) and tablet (768×1024) in responsive mode. For post-login, I went through the happy path in Comet’s responsive mode across landscape, tablet, and mobile.

## What works

Pre-login, the core agent experience is solid. Suggested pills, free-text, and the mobile send-button flow all return on-topic answers, and Enter vs. Shift+Enter behaves exactly as the UI says it should.

The `/register` password checklist is also good — clear, live, and easy to understand.

Post-login, the main flow holds up too. Login works, follow-up questions work through both pills and free-text, in-response CTAs behave as expected, and ASK points accrue correctly.

## What’s rough

* **Tablet, pre-login:** the hamburger opens a real drawer, dims the page, locks scrolling, and then shows… nothing. No content, no close action except tapping the icon again. It feels less unfinished and more actively broken.

* **Registration:** the “special character” rule rejects several completely normal characters like `- _ + = \ / ' ; [ ] ~`, but doesn’t tell the user which ones actually count.

* **Post-login:** the footer takes up roughly 15% of the mobile viewport. The Redeem Offers carousel goes out of sync with its dots, and past-offer cards don’t adapt well to smaller screens. My Data Hub sometimes loads empty through in-app navigation and only recovers after a full refresh. The wallet/bridge flow also has weak CTA hierarchy.

## Prioritized improvements

1. **Reclaim the mobile footer space.** It affects a large part of the product, including the pre-login experience. Shrink or collapse it on smaller screens.

2. **Fix My Data Hub’s silent load failure.** This is the surface where users manage data opt-ins, basically the core promise of the product. Currently, this requires a refresh of the site to load new data. Switching tabs or scrolling from the top doesn't work.

3. **Fix the tablet menu dead-end.** Smaller audience than mobile, but it’s still a real trap on the main pre-login page.

4. **Fix Redeem Offers responsiveness and carousel state.** This is where users actually realise the value of earned ASK, so broken presentation here matters.

5. **Give the wallet/bridge flow one clear primary action per screen.** The transfer modal puts Cancel before Bridge, while the wallet modal gives two actions equal visual weight. When real value is moving, the hierarchy should be obvious.

I ranked these by reach first, then by how trust-sensitive the surface is: data control, core agent flow, redemption, and moving value.
