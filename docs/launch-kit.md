# Launch kit

Ready-to-use steps and posts for getting workswithwhat.com in front of people.
Everything here is done **from your own accounts**: communities ban accounts created
just to promote a site, and search consoles need the domain owner.

## 1. Search engines (do these first, 15 minutes, free)

1. **Google Search Console** → Add property → *Domain* → `workswithwhat.com`.
   Google gives a TXT record; add it in Cloudflare → DNS (Type TXT, Name `@`).
   Then Sitemaps → submit `https://workswithwhat.com/sitemap-index.xml`.
   Use *URL inspection* → *Request indexing* on the home page, `/smart-plugs/` and `/works-with/matter/`.
2. **Bing Webmaster Tools** → *Import from Google Search Console* (one click once step 1 is done).
   Bing also feeds Copilot and ChatGPT search. The site already pings IndexNow on every deploy.
3. Check the AI crawlers can reach you: the daily *Live site check* in GitHub Actions warns if they get blocked.

## 2. Communities

Rules that keep posts alive: read each sub's self-promotion rules, post from an account with history,
lead with something useful (the data), say plainly it's your project, and answer every comment.
Post one community per day, not all at once.

### r/homeassistant · r/smarthome · r/HomeKit · r/Matter

**Title:** I built a smart plug compatibility chart where every answer links to the manufacturer source

**Body:**
> I kept buying plugs whose box said "works with X" and then finding out it needed a hub, only worked through
> Matter, or the EU version was different. So I started a reference that checks each claim against manufacturer
> pages and the CSA Matter database, and links the source next to every answer.
>
> 20 plugs so far (Tapo, Kasa, Eve, Shelly, IKEA, Hue, Aqara, Meross, Govee, Leviton, Wemo…), split by
> Apple Home / Google Home / Alexa / SmartThings / Home Assistant, plus a Matter page that separates Wi-Fi
> from Thread plugs. Anything we couldn't confirm is marked "unconfirmed" instead of guessed.
>
> https://workswithwhat.com/smart-plugs/
>
> No ads, no affiliate links, no cookies. If you spot something wrong, tell me and I'll fix it with a source.
> Which plugs should I add next?

For r/HomeKit, link `/works-with/apple-home/` instead. For r/Matter, link `/works-with/matter/`.

### Home Assistant Community forum (Share your Projects)
Same text, linking `/works-with/home-assistant/`. Mention the JSON at `/api/smart-plugs.json`:
HA users like data they can script against.

### Hacker News (Show HN), once there are 40+ devices
**Title:** Show HN: Workswithwhat – smart home compatibility with a source for every claim
Lead with the method: two-pass verification, "unknown beats a guess", static site, open JSON.

## 3. Ideas that compound

- **Answer real questions.** Search Reddit for "does * work with homekit" / "matter plug" threads and answer
  them with the facts, linking the device page only where it answers the question.
- **Corrections loop.** Every fix reported by a reader is a reason to post an update.
- **Wemo shutdown angle.** People with Wemo plugs are looking for replacements: our WSP100 page plus the Matter
  page answer "what still works and what to buy instead".
- **More devices = more long-tail queries.** Each device page targets "does [model] work with [platform]".
  Bulbs and sensors are the next categories in the roadmap.
