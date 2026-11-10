// Discover Jazz Festival section (html/burlington.html), animated with GSAP and ScrollTrigger.
// Everything here is an enhancement: without GSAP, or with reduced motion, the section is a
// normal readable layout and "Play a riff" still plays its notes.
(function () {
    "use strict";

    const section = document.getElementById("festival");
    if (!section) {
        return;
    }

    const $ = (selector, root = section) => root.querySelector(selector);
    const $$ = (selector, root = section) => Array.from(root.querySelectorAll(selector));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const gsap = window.gsap;
    const hasGsap = Boolean(gsap && window.ScrollTrigger);

    const stage = $(".jz-stage");
    const horn = $(".jz-horn");
    const valves = $$(".jz-valve");
    const notesLayer = $(".jz-notes");
    const bars = $$(".jz-eq span");
    const track = $("#jazzTrack");
    const cards = $$(".jz-card");
    const yearEl = $("#jazzYear");
    const labelEl = $("#jazzLabel");
    const meter = $("#jazzMeter");
    const playButton = $("#jazzPlay");

    // ---- Set list carousel: swipe, drag, arrows, dots or arrow keys ----
    // The arrows and dots follow W3Schools, "How To Create a Slideshow" (plusSlides, currentSlide
    // and showSlides): https://www.w3schools.com/howto/howto_js_slideshow.asp
    // Changed: the cards scroll sideways instead of swapping display, the arrows stop at the first
    // and last card instead of wrapping around, and GSAP glides between cards.
    const prevButton = $("#jazzPrev");
    const nextButton = $("#jazzNext");
    const dots = $$(".jz-dot");
    const status = $("#jazzStatus");
    const counter = { year: Number(cards[0].dataset.year) };
    let activeIndex = -1;

    function setActive(index) {
        if (index === activeIndex) {
            return;
        }
        activeIndex = index;
        const card = cards[index];
        cards.forEach((other, i) => other.classList.toggle("is-active", i === index));
        dots.forEach((dot, i) => dot.setAttribute("aria-current", String(i === index)));
        prevButton.disabled = index === 0;
        nextButton.disabled = index === cards.length - 1;
        labelEl.textContent = card.querySelector("h3").textContent;
        meter.style.transform = "scaleX(" + ((index + 1) / cards.length).toFixed(3) + ")";
        const target = Number(card.dataset.year);
        if (hasGsap && !reduceMotion.matches) {
            gsap.to(counter, {
                year: target,
                duration: 0.8,
                ease: "power2.out",
                overwrite: true,
                onUpdate: () => (yearEl.textContent = String(Math.round(counter.year)))
            });
        } else {
            counter.year = target;
            yearEl.textContent = String(target);
        }
    }

    // Where the track has to scroll to for a card to sit at the start, clamped to the end.
    function offsetOf(index) {
        const padding = parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0;
        const max = track.scrollWidth - track.clientWidth;
        return Math.max(0, Math.min(max, cards[index].offsetLeft - track.offsetLeft - padding));
    }

    // The card closest to the start of the track; at the very end, the last card.
    function nearestIndex() {
        const max = track.scrollWidth - track.clientWidth;
        if (max > 0 && track.scrollLeft >= max - 4) {
            return cards.length - 1;
        }
        let best = 0;
        cards.forEach((card, i) => {
            if (Math.abs(offsetOf(i) - track.scrollLeft) < Math.abs(offsetOf(best) - track.scrollLeft)) {
                best = i;
            }
        });
        return best;
    }

    function goTo(index, announce) {
        index = Math.max(0, Math.min(cards.length - 1, index));
        const left = offsetOf(index);
        setActive(index);
        if (announce) {
            status.textContent = "Set " + (index + 1) + " of " + cards.length + ": " + cards[index].querySelector("h3").textContent;
        }
        if (hasGsap && !reduceMotion.matches) {
            // Snapping is paused while GSAP glides, or the browser would fight the tween.
            track.classList.add("is-gliding");
            gsap.to(track, {
                scrollLeft: left,
                duration: 0.7,
                ease: "power3.inOut",
                overwrite: true,
                onComplete: () => track.classList.remove("is-gliding")
            });
            gsap.fromTo(cards[index], { "--tilt": "-2deg" }, { "--tilt": "0deg", duration: 0.7, ease: "elastic.out(1, 0.45)" });
        } else {
            track.classList.add("is-gliding");
            track.scrollTo({ left, behavior: "auto" });
            window.setTimeout(() => track.classList.remove("is-gliding"), 150);
        }
    }

    // Next/previous controls
    function plusSlides(n) {
        goTo(activeIndex + n, true);
    }

    // Dot controls
    function currentSlide(n) {
        goTo(n, true);
    }

    prevButton.addEventListener("click", () => plusSlides(-1));
    nextButton.addEventListener("click", () => plusSlides(1));
    dots.forEach((dot) => dot.addEventListener("click", () => currentSlide(Number(dot.dataset.go))));
    track.addEventListener("keydown", (event) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (step) {
            event.preventDefault();
            goTo(activeIndex + step, true);
        } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            goTo(event.key === "Home" ? 0 : cards.length - 1, true);
        }
    });

    // Swiping or trackpad scrolling updates the counter as it goes.
    let ticking = false;
    track.addEventListener("scroll", () => {
        if (ticking || track.classList.contains("is-gliding")) {
            return;
        }
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            setActive(nearestIndex());
        });
    }, { passive: true });

    // Mouse drag (touch already scrolls natively). A short drag counts as a flick to the next card.
    let drag = null;
    track.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "mouse" || event.button !== 0) {
            return;
        }
        drag = { x: event.clientX, left: track.scrollLeft, moved: false, start: activeIndex };
    });
    window.addEventListener("pointermove", (event) => {
        if (!drag) {
            return;
        }
        const dx = event.clientX - drag.x;
        if (!drag.moved && Math.abs(dx) > 5) {
            drag.moved = true;
            track.classList.add("is-dragging");
            if (hasGsap) {
                gsap.killTweensOf(track);
            }
        }
        if (drag.moved) {
            track.scrollLeft = drag.left - dx;
        }
    });
    window.addEventListener("pointerup", (event) => {
        if (!drag) {
            return;
        }
        const { moved, x, start } = drag;
        drag = null;
        if (!moved) {
            return;
        }
        track.classList.remove("is-dragging");
        const dx = event.clientX - x;
        let index = nearestIndex();
        if (index === start && Math.abs(dx) > 40) {
            index = start + (dx < 0 ? 1 : -1);
        }
        goTo(index);
        // Don't let the end of a drag click a link inside a card.
        track.addEventListener("click", (e) => e.preventDefault(), { capture: true, once: true });
    });

    section.classList.add("jz-has-carousel");
    $("#jazzControls").hidden = false;
    setActive(0);

    // ---- The riff: Web Audio brass plus valves, notes and the equalizer ----
    const RIFF = [
        { freq: 523.25, at: 0, len: 0.22, valves: [0, 2] },
        { freq: 622.25, at: 0.26, len: 0.2, valves: [1] },
        { freq: 698.46, at: 0.5, len: 0.2, valves: [0] },
        { freq: 739.99, at: 0.74, len: 0.16, valves: [1, 2] },
        { freq: 783.99, at: 0.94, len: 0.42, valves: [] },
        { freq: 932.33, at: 1.5, len: 0.6, valves: [0] }
    ];
    let audio = null;

    // One brass note, built from oscillators with the Web Audio API.
    // Based on MDN Web Docs, "OscillatorNode" (basic usage example)
    // https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode
    // Changed: two oscillators (sawtooth and square) run through a low-pass filter and a volume
    // envelope so the note swells and fades like a trumpet instead of beeping.
    function brass(ctx, freq, start, length) {
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.Q.value = 3;
        filter.frequency.setValueAtTime(600, start);
        filter.frequency.linearRampToValueAtTime(2600, start + 0.06);
        filter.frequency.exponentialRampToValueAtTime(1200, start + length);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.16, start + 0.04);
        gain.gain.setValueAtTime(0.14, start + length * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + length + 0.12);
        filter.connect(gain).connect(ctx.destination);
        [0, 4].forEach((detune, i) => {
            const osc = ctx.createOscillator();
            osc.type = i ? "square" : "sawtooth";
            osc.frequency.setValueAtTime(freq * 0.985, start);
            osc.frequency.linearRampToValueAtTime(freq, start + 0.05);
            osc.detune.value = detune;
            osc.connect(filter);
            osc.start(start);
            osc.stop(start + length + 0.15);
        });
    }

    function flyNote(index) {
        const box = stage.getBoundingClientRect();
        const svg = horn.getBoundingClientRect();
        const note = document.createElement("span");
        note.className = "jz-note";
        note.textContent = index % 2 ? "♫" : "♪";
        // The bell sits at about x=318, y=60 in the trumpet's 330 x 186 drawing.
        note.style.left = (svg.left - box.left + svg.width * (318 / 330)) + "px";
        note.style.top = (svg.top - box.top + svg.height * (60 / 186) - 16) + "px";
        notesLayer.appendChild(note);
        gsap.fromTo(note, { x: 0, y: 0, scale: 0.6, opacity: 0, rotation: -10 }, {
            keyframes: [
                { opacity: 1, scale: 1, x: 18, y: -24, duration: 0.25, ease: "power2.out" },
                { x: 40 + Math.random() * 70, y: -110 - Math.random() * 70, rotation: 10 + Math.random() * 20, opacity: 0, duration: 1.3, ease: "sine.out" }
            ],
            onComplete: () => note.remove()
        });
    }

    function pulseBars(strength) {
        bars.forEach((bar, i) => {
            const shape = 0.35 + 0.65 * Math.sin((i / bars.length) * Math.PI);
            gsap.to(bar, {
                scaleY: Math.min(1, 0.15 + strength * shape * (0.6 + Math.random() * 0.6)),
                duration: 0.12,
                ease: "power2.out",
                overwrite: true,
                onComplete: () => gsap.to(bar, { scaleY: 0.12 + Math.random() * 0.1, duration: 0.6, ease: "power2.inOut" })
            });
        });
    }

    let playing = false;
    function playRiff() {
        if (playing) {
            return;
        }
        playing = true;
        playButton.classList.add("is-playing");
        playButton.querySelector(".jz-play_label").textContent = "Playing…";
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
            audio = audio || new Ctx();
            audio.resume();
            const now = audio.currentTime + 0.05;
            RIFF.forEach((note) => brass(audio, note.freq, now + note.at, note.len));
        }
        const animate = hasGsap && !reduceMotion.matches;
        if (animate) {
            const tl = gsap.timeline();
            tl.to(horn, { rotation: -3, transformOrigin: "20% 50%", duration: 0.12, ease: "power2.out" }, 0)
                .to(horn, { rotation: 0, duration: 1.6, ease: "elastic.out(1, 0.4)" }, 0.12)
                .to($(".jz-spot"), { scaleX: 1.12, duration: 0.18, yoyo: true, repeat: 1, ease: "power1.inOut" }, 0);
            RIFF.forEach((note, i) => {
                tl.call(() => {
                    flyNote(i);
                    pulseBars(0.6 + note.len);
                }, null, note.at);
                note.valves.forEach((v) => {
                    tl.to(valves[v], { y: 5, duration: 0.06, ease: "power1.in" }, note.at)
                        .to(valves[v], { y: 0, duration: 0.14, ease: "power2.out" }, note.at + note.len * 0.8);
                });
                tl.to($(".jz-bell"), { scaleX: 1.08, scaleY: 1.04, duration: 0.08, yoyo: true, repeat: 1 }, note.at);
            });
        }
        window.setTimeout(() => {
            playing = false;
            playButton.classList.remove("is-playing");
            playButton.querySelector(".jz-play_label").textContent = "Play it again";
        }, 2300);
    }
    playButton.addEventListener("click", playRiff);

    if (!hasGsap) {
        return;
    }

    gsap.registerPlugin(window.ScrollTrigger);
    // gsap.matchMedia() runs the animations only for people who haven't asked for reduced motion.
    // Pattern from the GSAP docs, "gsap.matchMedia()": https://gsap.com/docs/v3/GSAP/gsap.matchMedia()
    const mm = gsap.matchMedia();

    // Entrance and idle motion, for anyone who hasn't asked for reduced motion.
    mm.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = gsap.timeline({ scrollTrigger: { trigger: $(".jz-intro"), start: "top 75%" } });
        intro.from($(".jz-intro .jz-eyebrow"), { y: 16, opacity: 0, duration: 0.5, ease: "power2.out" })
            .from($$(".jz-line > span"), { yPercent: 110, duration: 0.9, stagger: 0.12, ease: "power4.out" }, "-=0.25")
            .from([$(".jz-lead"), $(".jz-actions")], { y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }, "-=0.55")
            .from($(".jz-spot"), { scaleY: 0, opacity: 0, duration: 0.9, ease: "power2.out" }, 0.2)
            .from($(".jz-floor"), { scaleX: 0.3, opacity: 0, duration: 0.8, ease: "power2.out" }, 0.4)
            .from(horn, { x: 70, rotation: 8, opacity: 0, duration: 1.1, ease: "power3.out" }, 0.35)
            .from(bars, { scaleY: 0, duration: 0.5, stagger: { each: 0.015, from: "center" }, ease: "power2.out" }, 0.7);

        // The equalizer breathes gently while the section is on screen.
        const idle = gsap.timeline({ repeat: -1, paused: true });
        bars.forEach((bar, i) => {
            idle.to(bar, { scaleY: () => 0.12 + Math.random() * 0.22, duration: 0.5 + (i % 5) * 0.08, ease: "sine.inOut", yoyo: true, repeat: 1 }, (i % 7) * 0.07);
        });
        window.ScrollTrigger.create({
            trigger: stage,
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => (self.isActive ? idle.play() : idle.pause())
        });

        gsap.from($$(".jz-set_head > *"), {
            y: 24, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power2.out",
            scrollTrigger: { trigger: $(".jz-set"), start: "top 80%" }
        });
        gsap.from($$(".jz-guide_list li"), {
            y: 24, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power2.out",
            scrollTrigger: { trigger: $(".jz-guide"), start: "top 85%" }
        });

        return () => idle.kill();
    });

    // The tickets deal in from below the first time the set list comes into view.
    mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(cards, {
            y: 60, opacity: 0, rotation: (i) => (i % 2 ? 3 : -3), duration: 0.8, stagger: 0.08, ease: "power3.out", transition: "none", clearProps: "transform,opacity,transition",
            scrollTrigger: { trigger: $("#jazzSet"), start: "top 70%" }
        });
    });
})();
