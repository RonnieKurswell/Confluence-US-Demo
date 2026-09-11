# Unlock AI Value — deploying the built demo

Everything in `site/` is a plain static site. No Node, no build step, no server
code. Upload the contents of `site/` and open `index.html`.

**Every path in the build is relative**, so it runs from a domain root, a
subfolder, an S3 bucket or a USB stick without being rebuilt or reconfigured.

One caveat that follows from that: if you deploy into a subfolder, the URL needs
its **trailing slash**. `example.com/demo/` works; `example.com/demo` resolves
the relative paths one level too high and loads nothing. Apache and S3 website
endpoints both add the slash themselves for a real directory, so this only
bites behind a hand-written redirect or proxy rule.

## What is in here

| | |
|---|---|
| `site/` | **the demo. This is the thing you deploy.** |
| `upload-to-s3.sh` | uploads `site/` to S3 with the correct content types |
| `.htaccess` | Apache config — already inside `site/`, copied up here so it is easy to read without digging |

Only `site/` is served. `README.md` and `upload-to-s3.sh` are for you and
should not end up in a web root.

`site/` is about **134 MB**, and **133 MB of that is five MP4s**. Nothing else
is above 300 KB.

## cPanel

Upload this whole folder somewhere outside the web root — e.g.
`/home/<account>/confluence-demo/` — then point the domain or subdomain's
**document root** at the `site` subfolder. That keeps these notes and the
upload script off the public site, and means a redeploy is just replacing
`site/`.

If you would rather not touch the document root, extract into `public_html`
and move the **contents** of `site/` up one level, so `index.html` sits
directly in `public_html` beside `media/` and `assets/`.

Either way:

- Do not upload the 40-odd files one at a time through File Manager — the five
  films will time out individually. Upload the zip and use **Extract**, or use
  SFTP, which is more reliable for a 130 MB transfer.
- `.htaccess` ships inside `site/`. cPanel's File Manager hides dotfiles by
  default; switch on "Show Hidden Files" in its settings to confirm it arrived.

The `.htaccess` is optional — the demo runs without it — but it fixes the two
things shared hosting reliably gets wrong: serving `.mp4`/`.woff2` as
`octet-stream`, and byte-range requests, which is how the browser seeks inside
a 40 MB film. Read the comments in it before changing anything.

## S3

```bash
./upload-to-s3.sh my-bucket-name
# or into a subfolder:
./upload-to-s3.sh my-bucket-name confluence-demo
```

Then, if the bucket is new:

```bash
aws s3 website s3://my-bucket-name --index-document index.html
```

…and make the objects readable, either with a public-read bucket policy or —
better for anything client-facing — CloudFront with an Origin Access Control.

**Do not just run `aws s3 sync` and hope.** Sync guesses content types from
the file extension, and an object uploaded without one is served as
`application/octet-stream`. Browsers sniff fonts and video well enough that
this often still works — I tested the package against a host that mislabels
every `.mp4` and `.woff2` and it ran fine — but "often" is not a thing to rely
on for a client demo, and Safari is fussier about video than Chrome. The script
sets the types explicitly so the question never arises.

## Checking it worked

Open the deployed URL and confirm, in order:

1. **The intro headline is in Geist**, not a system sans. If it looks wrong the
   font files did not upload — check `site/fonts/` arrived.
2. **Begin plays the warp tunnel**, with the six pool names arriving from 8s.
3. **Tap "Data for AI" or "AI Strategy & Engineering"** — the panel film should
   be moving, not a still poster. A still means the file did not upload, or the
   host is returning an error page for it.
4. **Tap that film** to open it full screen: it should play **with sound**.
5. The other four pools still show a placeholder. That is correct — those films
   have not been delivered yet.

`?screen=pool&pool=0` through `pool=5` jump straight to a pool, which is the
quickest way to check all six without sitting through the intro.

## Two notes for whoever maintains this

The demo holds its state in the **query string** (`?screen=pool&pool=1`), never
in the path. So there is no SPA fallback or rewrite rule to configure — a
deliberate choice, and the reason this deploys anywhere without special cases.

New value pool films need **no code change**. Drop the file into
`site/media/` named after the pool id and it is picked up on the next load:

```
data-for-ai.mp4                  (delivered)
ai-strategy-engineering.mp4      (delivered)
ai-trust.mp4                     (waiting)
physical-ai.mp4                  (waiting)
agentic-legacy-modernization.mp4 (waiting)
process-ai.mp4                   (waiting)
```
