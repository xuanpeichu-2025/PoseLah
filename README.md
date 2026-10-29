# PoseLah
PoseLah: an AI photo coach in your phone browser. Scan the scene, find the best light and angle, then match a pose outline. Built with Meta’s Muse Spark and SAM 3.1.
# PoseLah 📸

**Cannot pose? Don't worry lah.**

PoseLah is a photo coach that runs in your phone's browser. It looks at the scene around you, works out where the best light is, tells you which way to move your phone, and shows a white pose outline to match, so you can take photos you're proud of without a photographer.

Built for the **Meta Global AI Developer Hackathon (Oct 26 – Nov 4, 2026)**. Everything in this repository was built during the hackathon.

> Not affiliated with or endorsed by Meta.

## The problem

Many people avoid being in photos because they feel awkward and don't know how to pose, where to stand, or how to use the light. Hiring a photographer isn't realistic for everyday moments.

## How it works

1. **Scan:** pan your phone slowly around you. The app captures a few frames along with the compass heading of each.
2. **Analyze:** Meta's Muse Spark reads the scene and judges the light and background in each direction. SAM 3.1 finds the people and objects in the frame.
3. **Move:** arrows on the camera view tell you which way to turn and tilt.
4. **Pose:** pick a white pose outline suited to the scene, drawing on composition ideas such as the rule of thirds and 留白 (negative space).
5. **Match and capture:** line yourself up with the outline and take the shot.

Works with both front and back cameras.

## Status

- [ ] Camera page with front/back switch
- [ ] Compass heading and tilt readout
- [ ] Direction arrows
- [ ] Scene scan with Muse Spark
- [ ] Subject detection with SAM 3.1
- [ ] Pose outlines and matching
- [ ] Deployed demo link

## Meta models used

| Model | Used for |
|---|---|
| Muse Spark | Scene understanding, lighting and composition advice |
| SAM 3.1 | Finding the person and key objects in the frame |

## Tech stack


- Browser camera and device sensor APIs
- A small backend that keeps the API key private and calls the Meta Model API
- Hosted over HTTPS (required for phone camera and sensors)

## Run it locally

```bash
git clone https://github.com/xuanpeichu-2025/pose-lah.git
cd pose-lah
npm install
```

Create a file called `.env` in the project folder:

```
META_API_KEY=your_key_here
```

Get a key from the Meta Model API dashboard. **Never commit your `.env` file.** It's already listed in `.gitignore`.

```bash
npm run dev
```

Phone cameras and sensors need HTTPS, so test on your phone through the deployed link or a tunnel tool.

## Privacy

Photos are only sent to the Meta Model API to get advice.

## Roadmap

- Learn composition styles from a curated, licensed reference set
- More scene types: food, landscapes, group photos
- Voice commands for hands-free selfies

## Built by

Xuan Pei, a year 2 AI student at Universiti Malaya.

## License

MIT
