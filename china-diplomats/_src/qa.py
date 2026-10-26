import asyncio,sys,json
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8951/china-diplomats/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for w,h,name in[(1440,1000,'desktop'),(390,844,'mobile')]:
      pg=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=1 if w>500 else 2)
      errs=[];pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None);pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto(URL,wait_until='networkidle');await pg.wait_for_timeout(9500)
      # tooltips
      res={}
      for k,s in [('spread','#map circle'),('stream','#stream path[fill]'),('matrix','#matrix rect'),('net','#net g g'),('tone','#tc path'),('cal','#calv rect.c')]:
        el=pg.locator(s).nth(3) if k!='stream' else pg.locator('#stream svg');await el.scroll_into_view_if_needed();bb=await el.bounding_box();await pg.mouse.move(bb['x']+bb['width']/2,bb['y']+bb['height']/2) if k=='stream' else await el.hover(force=True);await pg.wait_for_timeout(150)
        res[k]=await pg.evaluate("()=>{const t=document.getElementById('tip');return t.hidden?null:t.innerText.slice(0,60)}")
      # labels: font >=12.95 & all nodes labelled
      lab=await pg.evaluate("""()=>{const bad=[];document.querySelectorAll('svg text').forEach(t=>{const fs=parseFloat(getComputedStyle(t).fontSize);if(t.textContent.trim()&&fs<12.95)bad.push(t.textContent+':'+fs)});
        const nodes=document.querySelectorAll('#net g g').length,lbl=[...document.querySelectorAll('#net g g text')].filter(t=>t.textContent.trim()).length;
        const small=[...document.querySelectorAll('button,select,input[type=range],nav a')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).display!=='none'&&r.height<43.5}).map(e=>e.outerHTML.slice(0,60));
        const pfont=[...document.querySelectorAll('body *')].filter(e=>e.children.length===0&&e.textContent.trim()&&e.getClientRects().length&&parseFloat(getComputedStyle(e).fontSize)<12.95).map(e=>e.outerHTML.slice(0,50));
        return {bad,nodes,lbl,small:small.slice(0,8),pfont:pfont.slice(0,8),scrollW:document.documentElement.scrollWidth}}""")
      await pg.evaluate("window.scrollTo(0,0)");await pg.screenshot(path=f'/workspace/china-diplomats/screenshot-{w}.png',full_page=True)
      # click a day -> panel
      await pg.locator('#calv g.d').nth(6).click();await pg.wait_for_timeout(300)
      panel=await pg.evaluate("()=>({hidden:document.getElementById('panel').hidden,posts:document.querySelectorAll('#pbody .post').length,url:location.href})")
      if w<500:
        await pg.locator('#pclose').click();await pg.evaluate("window.scrollTo(0,0)");await pg.locator('#ftoggle').click();await pg.wait_for_timeout(400);await pg.screenshot(path='/workspace/china-diplomats/screenshot-390-sheet.png')
      print(name,json.dumps(dict(errs=errs,tips=res,labels=lab,panel=panel),ensure_ascii=False))
    await b.close()
asyncio.run(main())
