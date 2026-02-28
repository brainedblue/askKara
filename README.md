# kara.

I wanted to build something like perplexity but with a ui that actually feels good to use. the idea is you ask a question, it searches google, scrapes the top results using my yada scraper feeds everything to openai or any other api, and gives you a clean synthesized answer with sources.

the backend isnt wired up yet so the answers are placeholders for now. started with the frontend first because i wanted to nail the feel before hooking up the apis.

## what it does

- you type a question on the landing page, hit enter, it becomes a results feed
- you can ask follow-up questions and grow the conversation
- dark/light theme toggle, persists across reloads
- sessions save to sessionStorage so your history sticks around while the tab is open, currenlty no login or account management setup

## running it

```
open index.html
```

thats it. no npm, no build step, no dependencies. just html/css/js and google fonts.


## whats next

- wire up the backend: google search api → yada scraper → openai for answer generation
- markdown rendering for answers
- streaming responses instead of the fake typing
