# Design references and implementation

Reviewed on 2026-10-15. The caption studio uses the existing Next.js, Tailwind v4, and Motion stack. No additional component framework or paid library is installed.

- Componentry Annotated Text: https://componentry.dev/docs/components/annotated-text. `StudioDetails.tsx` implements an original, reduced-motion-safe SVG underline based on its annotation pattern. Componentry publishes its repository under MIT (Harsh Jadhav, 2026).
- Aceternity File Upload: https://ui.aceternity.com/components/file-upload and https://ui.aceternity.com/registry/file-upload.json. Adapted its grid/layered-card interaction with original markup, existing validated upload handling, and keyboard-accessible native inputs. No Pro template assets or source are used.
- Motion: https://motion.dev/docs/react-layout-animations. Existing MIT-licensed Motion dependency drives the annotation, upload hover, tone selection indicator, and history layout transitions. Reduced-motion users receive static states.
- daisyUI Filter: https://daisyui.com/components/filter/. Adapted the labeled native-radio approach for verdict filters; the existing token palette styles it. No global daisyUI theme is loaded. daisyUI publishes under MIT (Pouya Saadeghi, 2020).
- Animos: https://animos.app/. Reviewed as a showcase-template reference; no reusable source or license was available through the public page, so no template code or media was copied.

The design uses real Supabase image/caption records. Tone controls form part of the exact persisted generation prompt. Search and verdict filters apply to the loaded history page and explicitly display their scope. No fabricated counters, testimonials, sample captions, or generated progress percentages are used.
