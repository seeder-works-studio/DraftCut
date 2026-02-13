# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - heading "DraftCut" [level=1] [ref=e5]
        - paragraph [ref=e6]: AI Video Editor - Local & Private
    - main [ref=e7]:
      - generic [ref=e8]:
        - heading "Create Videos with AI" [level=2] [ref=e9]
        - paragraph [ref=e10]: Describe your video, upload assets, and let AI generate a complete video draft. Everything runs in your browser.
      - generic [ref=e11]:
        - textbox "e.g. Create a 20s promo for gruns.com with intro, captions, and CTA..." [ref=e12]
        - generic [ref=e13]:
          - button "Settings" [ref=e14]:
            - img
          - button "Generate Video Draft" [disabled]
      - generic [ref=e16]:
        - generic [ref=e17]: +
        - paragraph [ref=e18]: Drag & drop video, image, or audio files here
        - button "Browse Files" [ref=e19]
      - button "Load Example Project" [ref=e21]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e27] [cursor=pointer]:
    - img [ref=e28]
  - alert [ref=e31]
```