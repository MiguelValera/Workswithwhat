# Workswithwhat

Source for [workswithwhat.com](https://workswithwhat.com): smart-home compatibility, with a source for every claim.

```bash
npm install
npm run dev        # http://localhost:4321
npm run validate   # check device data against the schema
npm run build
```

Device data lives in `src/data/devices/*.json`. Schema: `src/schema/device.ts`. Project conventions and the agent pipeline are in `CLAUDE.md`.
