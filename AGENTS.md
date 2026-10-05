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
- Recommendation logic (features, k-means, kNN, hybrid scoring) lives in src/lib/recommender.ts and runs in the browser over the static catalog in src/lib/catalog.ts; user behaviour is kept in localStorage — keeps the demo backend-free.
