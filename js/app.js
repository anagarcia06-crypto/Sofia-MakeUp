// Shared app.js — tooltips, lightbox, reveal, nav collapse, carousel
document.addEventListener('DOMContentLoaded', function(){
  // Tooltips
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (el) { return new bootstrap.Tooltip(el); });

  // Reveal on scroll
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{ if(entry.isIntersecting) entry.target.classList.add('visible'); });
  },{threshold:0.12});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

  // Lightbox: load src from clicked image with data-src
  document.querySelectorAll('[data-bs-target="#lightboxModal"]').forEach(img=>{
    img.addEventListener('click', function(e){
      var src = e.currentTarget.getAttribute('data-src') || e.currentTarget.src;
      var el = document.getElementById('lightboxImage'); if(el) el.src = src;
    });
  });

  // Collapse mob nav after click
  document.querySelectorAll('.nav-link').forEach(link=>{
    link.addEventListener('click', ()=>{
      var bsCollapse = document.querySelector('.navbar-collapse');
      if(bsCollapse && bsCollapse.classList.contains('show')) new bootstrap.Collapse(bsCollapse).hide();
    });
  });

  // Activate bootstrap carousel if present
  var car = document.querySelectorAll('.carousel');
  car.forEach(c=>{ try{ new bootstrap.Carousel(c,{interval:4000}); }catch(e){} });
});

/* 3D Coverflow logic — supports any .coverflow container on the page
   - markup: .coverflow > .coverflow__stage > .coverflow__item (any number)
   - data-autoplay="true" and data-interval="3500" on root element enable autoplay
   - controls: .coverflow__nav buttons with data-target attribute referencing id
*/

(function(){
  function initCoverflow(root){
    const stage = root.querySelector('.coverflow__stage');
    if(!stage) return;
    const items = Array.from(stage.querySelectorAll('.coverflow__item'));
    if(items.length === 0) return;

    // ensure each item has inline size/position baseline
    const len = items.length;
    let index = Math.floor(len / 2); // start centered
    // expose for debugging:
    root._cfState = { index };

    // set z-index base
    items.forEach((it,i)=> it.style.zIndex = (100 - Math.abs(i - index)));

    // update function applies transforms for dramatic coverflow
    function update(){
      const centerX = 0; // we use transforms around the center
      const spread = Math.min(120, Math.round((stage.clientWidth) / 8));
      const tilt = 40; // degrees to tilt side images
      const scaleCenter = 1.06;
      const baseZ = 120; // base translateZ for center
      items.forEach((it, i) => {
        const offset = i - index;
        const abs = Math.abs(offset);
        const direction = offset < 0 ? -1 : 1;

        // compute transforms for dramatic perspective
        if(abs === 0){
          // center
          it.style.opacity = '1';
          it.style.transform = `translate3d(${direction * 0}px, -50%, translateZ(${baseZ}px)) scale(${scaleCenter}) rotateY(0deg)`;
          it.style.zIndex = 200;
        } else if(abs === 1){
          // immediate neighbors
          const tx = direction * (spread * 0.95);
          it.style.opacity = '1';
          it.style.transform = `translate3d(${tx}px, -50%, translateZ(${baseZ - 60}px)) scale(.92) rotateY(${direction * -tilt}deg)`;
          it.style.zIndex = 150 - abs;
        } else if(abs === 2){
          const tx = direction * (spread * 1.6);
          it.style.opacity = '0.9';
          it.style.transform = `translate3d(${tx}px, -50%, translateZ(${baseZ - 110}px)) scale(.82) rotateY(${direction * -tilt}deg)`;
          it.style.zIndex = 100 - abs;
        } else {
          // far sides — push further and fade
          const tx = direction * (spread * (1.6 + (abs - 2) * 0.6));
          it.style.opacity = Math.max(0, 0.65 - (abs - 2) * 0.12);
          it.style.transform = `translate3d(${tx}px, -50%, translateZ(${baseZ - 140 - (abs - 3) * 40}px)) scale(.7) rotateY(${direction * -tilt}deg)`;
          it.style.zIndex = 80 - abs;
        }
      });
    }

    // clamp index
    function clampIdx(i){
      if(i < 0) return len - 1;
      if(i >= len) return 0;
      return i;
    }

    // move to next/prev
    function goto(i){
      index = clampIdx(i);
      root._cfState.index = index;
      update();
      updateDots();
    }

    function next(){ goto(index + 1); }
    function prev(){ goto(index - 1); }

    // autoplay
    let autoplay = root.getAttribute('data-autoplay') === 'true';
    let interval = parseInt(root.getAttribute('data-interval') || 3500, 10);
    let timer = null;
    function startAuto(){
      if(!autoplay) return;
      stopAuto();
      timer = setInterval(()=> next(), interval);
    }
    function stopAuto(){ if(timer) { clearInterval(timer); timer = null; } }

    // controls
    const btnPrev = root.querySelector('.coverflow__nav--prev');
    const btnNext = root.querySelector('.coverflow__nav--next');
    if(btnPrev) btnPrev.addEventListener('click', ()=>{ prev(); startAuto(); });
    if(btnNext) btnNext.addEventListener('click', ()=>{ next(); startAuto(); });

    // keyboard support
    root.addEventListener('keydown', function(e){
      if(e.key === 'ArrowLeft') { prev(); startAuto(); }
      if(e.key === 'ArrowRight') { next(); startAuto(); }
    });

    // dots
    const dotsWrap = root.querySelector('.coverflow__dots');
    function updateDots(){
      if(!dotsWrap) return;
      dotsWrap.innerHTML = '';
      for(let i=0;i<len;i++){
        const b = document.createElement('button');
        b.className = (i === index) ? 'active' : '';
        b.addEventListener('click', ()=>{ goto(i); startAuto(); });
        dotsWrap.appendChild(b);
      }
    }

    // touch / swipe support (pointer events)
    (function addSwipe(){
      let startX = 0, startT = 0, dragging = false;
      root.addEventListener('pointerdown', function(e){
        dragging = true; startX = e.clientX; startT = Date.now(); stopAuto();
        root.setPointerCapture(e.pointerId);
      });
      root.addEventListener('pointermove', function(e){
        if(!dragging) return;
        // small live drag could be implemented — we keep it simple
      });
      root.addEventListener('pointerup', function(e){
        if(!dragging) return;
        dragging = false;
        const dx = e.clientX - startX;
        const dt = Date.now() - startT;
        // swipe threshold
        if(Math.abs(dx) > 50 && dt < 600){
          if(dx < 0) next(); else prev();
        }
        startAuto();
      });
      root.addEventListener('pointercancel', ()=>{ dragging=false; startAuto(); });
    })();

    // initial layout & resize handling
    function onResize(){
      // we may change values based on width in CSS; reapply transforms
      update();
    }
    window.addEventListener('resize', onResize);

    // init: set items absolute positions centered (JS sets transforms)
    items.forEach((it)=>{
      // make sure each item uses width/height from CSS; we absolute center them
      it.style.left = '50%';
      it.style.top = '50%';
      it.style.transform = 'translate3d(-50%,-50%,0)';
    });

    // Start
    updateDots();
    update();
    if(autoplay) startAuto();

    // expose controls on root for potential external use
    root.coverflow = { next, prev, goto, startAuto, stopAuto, getIndex:()=>index };
  }

  // Initialize any coverflow elements on DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    const flows = document.querySelectorAll('.coverflow');
    flows.forEach(f => initCoverflow(f));
  });

})();
