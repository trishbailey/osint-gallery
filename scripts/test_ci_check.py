#!/usr/bin/env python3
"""Self-test for scripts/ci_check.py: the browser checks must fail a page with look-alike
category colours (two greens, two blues, 16 colours), numbered-key circles, short text and a
dead button, and pass a clean page (incl. a 16-step single-hue intensity ramp)."""
import os, sys, functools, threading, http.server
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ci_check as c
FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ci_fixtures")
http.server.SimpleHTTPRequestHandler.log_message = lambda *x: None
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=FIX))
threading.Thread(target=srv.serve_forever, daemon=True).start()
c.ROOT = "/tmp/ci-selftest"  # screenshots go here, not into the repo
bad = c.browser_checks(srv.server_address[1], ["bad"])
bad2 = c.browser_checks(srv.server_address[1], ["bad2"])  # pill keys, narrow text in a card, hover-only button
good = c.browser_checks(srv.server_address[1], ["good"])
srv.shutdown()
want = {"look-alike colour": False, "numbered circles": False, "stop well short": False, "shows nothing": False}
for e in bad:
    for k in want:
        if k in e: want[k] = True
want2 = {"numbered circles": False, "stop well short": False, "shows nothing": False}
for e in bad2:
    for k in want2:
        if k in e: want2[k] = True
fails = [f"bad2 page not caught: {k}" for k, v in want2.items() if not v] + [f"bad page not caught: {k}" for k, v in want.items() if not v] + [f"clean page flagged: {e}" for e in good]
# changed_files must use the merge base: a branch that is merely behind main must not be blamed for main's newer commits
import subprocess, tempfile
def _git(d, *a): return subprocess.check_output(["git", "-c", "user.name=t", "-c", "user.email=t@t", *a], cwd=d, text=True).strip()
def _commit(d, path, msg):
    os.makedirs(os.path.join(d, os.path.dirname(path)), exist_ok=True)
    open(os.path.join(d, path), "w").write(msg)
    _git(d, "add", "-A"); _git(d, "commit", "-q", "-m", msg)
_d = tempfile.mkdtemp()
_git(_d, "init", "-q", "-b", "main")
_commit(_d, "mine/index.html", "base")
_git(_d, "checkout", "-q", "-b", "branch")
_commit(_d, "mine/app.js", "branch change")
_head = _git(_d, "rev-parse", "HEAD")
_git(_d, "checkout", "-q", "main")
_old_base = _git(_d, "rev-parse", "HEAD")
_commit(_d, "other/index.html", "newer main commit A")
_commit(_d, "scripts/x.py", "newer main commit B")
_git(_d, "checkout", "-q", "branch")  # branch is now behind main; HEAD is the branch tip
got = sorted(c.changed_files("main", _head, cwd=_d))
if got != ["mine/app.js"]: fails.append(f"changed_files blamed the branch for main's newer commits: {got}")
got2 = sorted(c.changed_files("main", "HEAD", cwd=_d))
if got2 != ["mine/app.js"]: fails.append(f"changed_files (HEAD) blamed the branch for main's newer commits: {got2}")
# once main is merged into the branch, merged-in main files still must not count
_git(_d, "merge", "-q", "--no-edit", "main")
got3 = sorted(c.changed_files("main", "HEAD", cwd=_d))
if got3 != ["mine/app.js"]: fails.append(f"changed_files after merging main counted main's files: {got3}")
# GitHub Actions checks out the PR's merge commit (main tip + branch), and the PR's recorded base sha can predate newer main commits
_git(_d, "checkout", "-q", "--detach", "main"); _git(_d, "reset", "-q", "--hard", _old_base)  # stale base: the sha main had when the PR opened
_stale = _git(_d, "rev-parse", "HEAD")
_git(_d, "checkout", "-q", "main"); _git(_d, "checkout", "-q", "--detach", "main")
_git(_d, "merge", "-q", "--no-ff", "--no-edit", _head)  # the refs/pull/N/merge commit
old_way = sorted(subprocess.check_output(["git", "diff", "--name-only", f"{_stale}...HEAD"], cwd=_d, text=True).split())
if old_way == ["mine/app.js"]: fails.append("test setup: expected the old stale-base diff to over-count, it did not")
got4 = sorted(c.changed_files("main", _head, cwd=_d))
if got4 != ["mine/app.js"]: fails.append(f"changed_files on a PR merge checkout over-counted: {got4}")
for f in fails: print("FAIL:", f)
print("ci_check self-test:", "OK" if not fails else f"{len(fails)} problem(s)")
sys.exit(1 if fails else 0)
