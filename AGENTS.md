<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Resolve broadcast languages through the shared source-language helper on both player pages, passing each stream/substream locale; explicit locales take priority over URL/name hints to disambiguate duplicate channels without relying on source order.
- Define typography in the global stylesheet and inherit its font token on every page; keep local font sources with uploaded CDN fallbacks so both external hosting and Lovable resolve fonts.
- Animate countdown value changes within fixed-size cells using the existing motion library and reduced-motion support so ticking never shifts the centered layout.
