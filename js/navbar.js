// Page motion for the shop pages (never loaded on Home or Our Mission), built on GSAP and ScrollTrigger.
// Each page gets the same hero entrance and scroll reveals, plus one or two moments of its own.
// Without GSAP, or with reduced motion, nothing here runs and every page stays fully readable.
(function () {
    "use strict";

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) {
        return;
    }
    gsap.registerPlugin(ScrollTrigger);

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const has = (selector) => Boolean($(selector));

    // Things that animate on their own and should be left alone.
    const SKIP = ".navbar, .site-footer, #festival, .cookie-notice, [hidden]";

    // Cards and blocks that rise in as they scroll into view.
    const REVEAL = [
        "[data-reveal]", "[data-pm-reveal]",
        ".fq-group_head", ".fq-helpdesk > *", ".fq-tickets_list > li", ".fq-contact_grid > li", ".fq-cta",
        ".cart-summary", ".cart-perks > *",
        ".si-card",
        ".sm-group",
        ".wc-note", ".wc-group",
        ".pm-now_card", ".rv > *"
    ].join(", ");

    // Section titles on the shop pages that get the word-by-word entrance.
    const SECTION_TITLES = [
        ".plans-section_header h2", ".plans-compare_header h2", ".plans-faq > h2", ".plans-cta h2",
        ".sp-section_header h2", ".sp-local_copy h2", ".sp-cta h2",
        ".fq-section_head h2", ".fq-cta h2",
        ".pm-city_copy h2",
        ".btv-head h2", ".btv-next_copy h2"
    ].join(", ");

    // Wrap each word of a heading so it can slide up out of a mask. Screen readers still read the text.
    function splitWords(element) {
        const words = [];
        (function walk(node) {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    if (!child.textContent.trim()) {
                        return;
                    }
                    const fragment = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) {
                            return;
                        }
                        if (/^\s+$/.test(part)) {
                            fragment.appendChild(document.createTextNode(part));
                            return;
                        }
                        const outer = document.createElement("span");
                        const inner = document.createElement("span");
                        outer.className = "mo-word";
                        inner.className = "mo-word_in";
                        inner.textContent = part;
                        outer.appendChild(inner);
                        fragment.appendChild(outer);
                        words.push(inner);
                    });
                    child.replaceWith(fragment);
                } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains("visually-hidden")) {
                    walk(child);
                }
            });
        })(element);
        return words;
    }

    // Count a number up from zero, keeping its decimals and any text around it.
    function countUp(element, duration = 1.1) {
        const match = element.textContent.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
        if (!match) {
            return;
        }
        const decimals = (match[2].split(".")[1] || "").length;
        const target = parseFloat(match[2]);
        const state = { value: 0 };
        gsap.to(state, {
            value: target,
            duration,
            ease: "power2.out",
            onUpdate: () => (element.textContent = match[1] + state.value.toFixed(decimals) + match[3]),
            onComplete: () => (element.textContent = match[1] + match[2] + match[3])
        });
    }

    function onEnter(element, callback, start = "top 85%") {
        ScrollTrigger.create({ trigger: element, start, once: true, onEnter: () => callback(element) });
    }

    // Pattern from the GSAP docs, "gsap.matchMedia()": everything inside runs only while the media
    // query matches, and GSAP undoes it all if the visitor turns on reduced motion.
    // https://gsap.com/docs/v3/GSAP/gsap.matchMedia()
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
        document.documentElement.classList.add("has-motion");

        // The pages' own CSS reveal (data-reveal) is replaced by the GSAP one, so the two never fight.
        $$("[data-reveal], [data-pm-reveal]").forEach((element) => {
            element.removeAttribute("data-reveal");
            element.removeAttribute("data-pm-reveal");
            element.setAttribute("data-mo", "");
        });

        // ---- Hero: eyebrow, the headline word by word, then the rest ----
        const title = $("main h1");
        const hero = title && title.closest("section");
        if (hero) {
            const words = splitWords(title);
            const pick = (selectors) => selectors.map((s) => $(s, hero)).filter(Boolean);
            const eyebrow = $("[class*='eyebrow']", hero);
            // The lead paragraph is often the page's largest text, so it only slides and never starts
            // invisible: hiding it would hold back Largest Contentful Paint until the fade ended.
            const lead = $("[class*='lead']", hero);
            const follow = pick(["[class*='_actions']", ".plans-hero_finder", ".fq-search", ".sm-search", ".wc-jump"]);

            const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
            if (eyebrow) {
                intro.from(eyebrow, { y: 14, opacity: 0, duration: 0.5 });
            }
            intro.from(words, { yPercent: 115, duration: 0.95, stagger: 0.055, ease: "power4.out" }, eyebrow ? "-=0.2" : 0);
            if (lead) {
                intro.from(lead, { y: 18, duration: 0.6 }, "-=0.65");
            }
            if (follow.length) {
                intro.from(follow, { y: 18, opacity: 0, duration: 0.6, stagger: 0.08 }, lead ? "-=0.52" : "-=0.65");
            }
            heroMoments(hero, intro);
        }

        // ---- Scroll reveals, batched so neighbours arrive one after another ----
        // Adapted from the GSAP docs, "ScrollTrigger.batch()"
        // https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.batch()/
        // Changed: each card reveals once (no onLeave/onEnterBack), and GSAP's inline styles are
        // cleared afterwards so the cards' own hover effects keep working.
        let reveal = $$(REVEAL).filter((element) => !element.closest(SKIP) && !(hero && hero.contains(element)));
        // The money flow on Specials reveals step by step instead of as one block.
        reveal = reveal.flatMap((element) => (element.matches(".sp-flow") ? Array.from(element.children) : [element]));
        if (reveal.length) {
            gsap.set(reveal, { opacity: 0, y: 36, transition: "none" });
            ScrollTrigger.batch(reveal, {
                start: "top 90%",
                once: true,
                onEnter: (batch) => gsap.to(batch, {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    stagger: 0.09,
                    ease: "power3.out",
                    overwrite: true,
                    clearProps: "opacity,transform,transition"
                })
            });
        }

        // The below-the-fold moments wait until the browser is idle, so setting them up
        // never holds up the first paint or the visitor's first tap.
        const later = window.requestIdleCallback || ((callback) => setTimeout(callback, 200));
        later(() => {
            pageMoments();
            ScrollTrigger.refresh();
        });

        // Filters and dynamic content change the page height without a scroll, so re-measure.
        let pending = 0;
        const observer = new ResizeObserver(() => {
            clearTimeout(pending);
            pending = setTimeout(() => ScrollTrigger.refresh(), 150);
        });
        observer.observe(document.body);

        return () => {
            observer.disconnect();
            document.documentElement.classList.remove("has-motion");
        };
    });

    // Extra beats that belong in each page's hero timeline.
    function heroMoments(hero, intro) {
        // Subscription Plans: the "Now shipping" box slides in and its items tick down.
        const box = $(".hero-box", hero);
        if (box) {
            intro.from(box, { x: 40, rotation: 1.5, opacity: 0, duration: 0.9, clearProps: "transform" }, 0.35)
                .from($$(".hero-box_list li", box), { x: -14, opacity: 0, duration: 0.45, stagger: 0.06 }, "-=0.45");
        }

        // Specials: the stats pop in and the offer board flips row by row like a departures board.
        if (hero.matches(".sp-hero")) {
            intro.from($$(".sp-stats > div", hero), { y: 16, opacity: 0, duration: 0.5, stagger: 0.08 }, "-=0.4");
            const board = $(".sp-board", hero);
            if (board) {
                intro.from(board, { y: 40, opacity: 0, duration: 0.8 }, 0.45)
                    .from($$(".sp-board_table tbody tr", board), {
                        rotationX: -90,
                        transformOrigin: "50% 0%",
                        transformPerspective: 700,
                        opacity: 0,
                        duration: 0.55,
                        stagger: 0.09,
                        ease: "back.out(1.6)",
                        clearProps: "transform"
                    }, "-=0.35");
            }
        }

        // Help desk: topic chips pop in and the desk card lands with a postmark thud.
        if (hero.matches(".fq-hero")) {
            intro.from($$(".fq-chip", hero), { y: 12, scale: 0.9, opacity: 0, duration: 0.4, stagger: 0.05, clearProps: "transform" }, "-=0.35");
            const card = $(".fq-desk-card", hero);
            if (card) {
                intro.from(card, { y: 40, rotation: -2, opacity: 0, duration: 0.9, clearProps: "transform" }, 0.4)
                    .from($(".fq-desk-card_postmark", card), { scale: 1.6, rotation: -25, opacity: 0, duration: 0.5, ease: "back.out(2.2)" }, "-=0.35");
            }
        }

        // Past months: the dotted route draws itself across the hero, then each city pin drops in.
        const route = $(".pm-hero_route", hero);
        if (route) {
            intro.from($$(".pm-jump a", hero), { y: 14, opacity: 0, duration: 0.45, stagger: 0.07 }, "-=0.4")
                .fromTo(route, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.6, ease: "power2.inOut", clearProps: "clipPath" }, 0.3)
                .from($$("circle", route), { scale: 0, transformOrigin: "50% 50%", duration: 0.45, stagger: 0.3, ease: "back.out(3)" }, 0.6);
        }

        // Cart: the checkout steps line up.
        if (has(".cart-steps")) {
            intro.from($$(".cart-steps li", hero), { y: 12, opacity: 0, duration: 0.45, stagger: 0.08 }, "-=0.35");
        }

        // Sign in: the passport drops onto the desk and the city stamps thud onto its page.
        const passport = $(".si-passport", hero);
        if (passport) {
            intro.from(passport, { y: 50, rotation: -12, opacity: 0, duration: 1, ease: "power3.out", clearProps: "transform" }, 0.3)
                .from($$(".si-mini", passport), {
                    scale: 1.9,
                    rotation: (i) => (i % 2 ? 18 : -18),
                    opacity: 0,
                    duration: 0.4,
                    stagger: 0.2,
                    ease: "back.out(2.4)",
                    clearProps: "transform"
                }, "-=0.35")
                .from($$(".si-perks li", hero), { x: -14, opacity: 0, duration: 0.45, stagger: 0.08 }, "-=0.5");
        }

        // Sitemap: popular links pop in.
        if (has(".sm-popular")) {
            intro.from($$(".sm-popular li", hero), { y: 12, opacity: 0, duration: 0.4, stagger: 0.06 }, "-=0.3");
        }

        // Burlington: the postmark stamps on and the jump buttons settle.
        const postmark = $(".btv-postmark", hero);
        if (postmark) {
            intro.from(postmark, { scale: 1.6, rotation: -20, opacity: 0, duration: 0.55, ease: "back.out(2)" }, 0)
                .from($(".btv-scene", hero), { y: 40, opacity: 0, duration: 1.2, ease: "power2.out" }, 0.2);
        }
    }

    // Scroll moments further down each page.
    function pageMoments() {
        // Plans: prices count up the first time each card comes into view.
        $$(".plan-card_amount").forEach((amount) => onEnter(amount, countUp, "top 90%"));

        // Specials: the money flow icons pop as their step arrives.
        $$(".sp-flow_icon").forEach((icon) => {
            gsap.from(icon, {
                scale: 0,
                rotation: -30,
                duration: 0.6,
                ease: "back.out(2.5)",
                scrollTrigger: { trigger: icon, start: "top 88%", once: true }
            });
        });

        // Past months: each city's stamp turns as you scroll past it, and its big fact counts up.
        $$(".pm-city").forEach((city) => {
            const stamp = $(".pm-stamp", city);
            if (stamp) {
                gsap.fromTo(stamp, { rotation: -14, scale: 0.88 }, {
                    rotation: 10,
                    scale: 1,
                    ease: "none",
                    scrollTrigger: { trigger: city, start: "top bottom", end: "bottom top", scrub: 0.8 }
                });
            }
            const fact = $(".pm-city_fact b", city);
            if (fact) {
                onEnter(fact, countUp, "top 90%");
            }
        });

        // Burlington: the sun sinks into the lake as you scroll down past the hero.
        const scene = $(".btv-scene svg");
        if (scene) {
            gsap.to($$(":scope > circle", scene), {
                y: 70,
                ease: "none",
                scrollTrigger: { trigger: scene, start: "top 60%", end: "bottom top", scrub: 0.6 }
            });
        }

        // Section titles slide up word by word, like the page headline, as each one scrolls in.
        $$(SECTION_TITLES).filter((title) => !title.closest(SKIP)).forEach((title) => {
            const words = splitWords(title);
            gsap.set(words, { yPercent: 115 });
            onEnter(title, () => gsap.to(words, { yPercent: 0, duration: 0.8, stagger: 0.045, ease: "power4.out" }), "top 88%");
        });

        // Burlington, "A day in Burlington": the coloured timeline draws itself down the page as you
        // read, and each stop's time slides in beside it.
        const day = $(".btv-day_list");
        if (day) {
            gsap.fromTo(day, { "--day-progress": 0 }, {
                "--day-progress": 1,
                ease: "none",
                scrollTrigger: { trigger: day, start: "top 75%", end: "bottom 60%", scrub: 0.5 }
            });
            $$(".btv-stop_time", day).forEach((time) => {
                gsap.from(time, {
                    x: -24,
                    opacity: 0,
                    duration: 0.6,
                    ease: "power3.out",
                    scrollTrigger: { trigger: time, start: "top 80%", once: true }
                });
            });
        }

        // Plans, "Compare plans": the table's rows cascade in from the left.
        const compare = $("#compareTable");
        if (compare) {
            gsap.from($$("tbody tr", compare), {
                x: -20,
                opacity: 0,
                duration: 0.5,
                stagger: 0.05,
                ease: "power2.out",
                clearProps: "transform,opacity",
                scrollTrigger: { trigger: compare, start: "top 80%", once: true }
            });
        }

        // Past months: each city's goods tick in one after another.
        $$(".pm-items").forEach((list) => {
            gsap.from(list.children, {
                x: -16,
                opacity: 0,
                duration: 0.45,
                stagger: 0.07,
                ease: "power2.out",
                scrollTrigger: { trigger: list, start: "top 85%", once: true }
            });
        });

        // Specials, "Your code wallet": the saved codes flip over like cards being dealt. The list is
        // filled in by specials.js, so the codes are looked up when the wallet scrolls into view.
        const wallet = $("#walletList");
        if (wallet) {
            onEnter(wallet, () => {
                gsap.from(wallet.children, {
                    rotationY: -80,
                    transformPerspective: 800,
                    transformOrigin: "0% 50%",
                    opacity: 0,
                    duration: 0.7,
                    stagger: 0.08,
                    ease: "power3.out",
                    clearProps: "transform,opacity"
                });
            }, "top 85%");
        }
    }
})();
