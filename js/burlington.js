(function () {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    function nextShipDate(now) {
        const ship = new Date(now.getFullYear(), now.getMonth(), 5, 9, 0, 0);
        if (now >= ship) {
            ship.setMonth(ship.getMonth() + 1);
        }
        return ship;
    }

    function initReveal() {
        const targets = $$("[data-reveal]");
        if (reduceMotion || !("IntersectionObserver" in window)) {
            targets.forEach((element) => element.classList.add("is-visible"));
            return;
        }
        document.documentElement.classList.add("has-reveal");
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
        targets.forEach((element, index) => {
            element.style.setProperty("--reveal-delay", (index % 3) * 90 + "ms");
            observer.observe(element);
        });
    }

    const confetti = { pieces: [], running: false };

    function launchConfetti(originX, originY, count = 140) {
        if (reduceMotion) {
            return;
        }
        const canvas = $("#confetti");
        const context = canvas.getContext("2d");
        const startX = originX === undefined ? window.innerWidth / 2 : originX;
        const startY = originY === undefined ? window.innerHeight / 2 : originY;
        const colors = ["#b0491f", "#e3a83b", "#5f7d64", "#1d2a3a", "#f4d6c4"];

        for (let i = 0; i < count; i += 1) {
            confetti.pieces.push({
                x: startX + (Math.random() - 0.5) * 60,
                y: startY,
                vx: (Math.random() - 0.5) * 14,
                vy: Math.random() * -14 - 4,
                size: Math.random() * 7 + 5,
                spin: Math.random() * Math.PI,
                spinSpeed: (Math.random() - 0.5) * 0.3,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 0
            });
        }

        if (typeof canvas.showPopover === "function") {
            if (canvas.matches(":popover-open")) {
                canvas.hidePopover();
            }
            canvas.showPopover();
        } else {
            canvas.classList.add("is-active");
        }

        if (confetti.running) {
            return;
        }
        confetti.running = true;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * ratio;
        canvas.height = window.innerHeight * ratio;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);

        function frame() {
            context.clearRect(0, 0, window.innerWidth, window.innerHeight);
            confetti.pieces = confetti.pieces.filter((piece) => piece.life < 170 && piece.y < window.innerHeight + 40);
            confetti.pieces.forEach((piece) => {
                piece.vy += 0.35;
                piece.vx *= 0.99;
                piece.x += piece.vx;
                piece.y += piece.vy;
                piece.spin += piece.spinSpeed;
                piece.life += 1;
                context.save();
                context.translate(piece.x, piece.y);
                context.rotate(piece.spin);
                context.fillStyle = piece.color;
                context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
                context.restore();
            });
            if (confetti.pieces.length) {
                requestAnimationFrame(frame);
            } else {
                confetti.running = false;
                context.clearRect(0, 0, window.innerWidth, window.innerHeight);
                if (typeof canvas.hidePopover === "function" && canvas.matches(":popover-open")) {
                    canvas.hidePopover();
                }
                canvas.classList.remove("is-active");
            }
        }
        requestAnimationFrame(frame);
    }

    const JAZZ_NOTES = [
        { freq: 523.25, valves: [], glow: "227, 168, 59", title: "Since 1984", text: "The Burlington Discover Jazz Festival has filled the city with music every June since 1984. That is more than forty years of jazz." },
        { freq: 622.25, valves: [2, 3], glow: "238, 154, 106", title: "Five days of music", text: "The festival now runs for five days in early June, from lunchtime sets on the street to evening shows on the Flynn Main Stage." },
        { freq: 698.46, valves: [1], glow: "232, 120, 140", title: "Put on by the Flynn", text: "The Flynn runs the whole festival. Its Art Deco theater on Main Street opened in 1930, showing vaudeville acts and movies." },
        { freq: 783.99, valves: [], glow: "120, 200, 190", title: "Free on Church Street", text: "Free stages pop up right on the Church Street Marketplace, so anyone walking by can stop and catch a set." },
        { freq: 932.33, valves: [1], glow: "170, 140, 230", title: "Students on stage", text: "Local school jazz bands play the same festival as touring headliners, sometimes on the very same street." },
        { freq: 1046.5, valves: [], glow: "156, 199, 164", title: "In your box", text: "This month's Burlington box carries that same small-stage, support-local spirit right to your door." }
    ];

    const JAZZ_RIFF = [
        { freq: 523.25, valves: [], wait: 0 },
        { freq: 622.25, valves: [2, 3], wait: 180 },
        { freq: 698.46, valves: [1], wait: 180 },
        { freq: 739.99, valves: [2], wait: 160 },
        { freq: 698.46, valves: [1], wait: 160 },
        { freq: 622.25, valves: [2, 3], wait: 180 },
        { freq: 523.25, valves: [], wait: 220 },
        { freq: 783.99, valves: [], wait: 260 },
        { freq: 1046.5, valves: [], wait: 320 }
    ];

    function initJazz() {
        const wrap = $("#jazz");
        if (!wrap) {
            return;
        }
        const horn = $("#jazzHorn");
        const stage = $("#jazzStage");
        const staff = $("#jazzStaff");
        const fact = $("#jazzFact");
        const text = $("#jazzText");
        const title = $("#jazzFactTitle");
        const num = $("#jazzNum");
        const count = $("#jazzCount");
        const sound = $("#jazzSound");
        const riff = $("#jazzRiff");
        const rings = $("#jazzRings");
        const meter = $$(".jazz_meter span", fact);
        const valves = $$(".jazz_pistons .jazz_valve", horn);
        const SVG_NS = "http://www.w3.org/2000/svg";
        let played = 0;
        let audio = null;
        let soundOn = true;
        let busy = false;

        JAZZ_NOTES.forEach((note, index) => {
            const li = document.createElement("li");
            li.className = "jazz_slot";
            li.style.setProperty("--rise", index);
            staff.appendChild(li);
        });
        const slots = $$(".jazz_slot", staff);

        function warm() {
            const Context = window.AudioContext || window.webkitAudioContext;
            if (!Context || !soundOn) {
                return;
            }
            try {
                audio = audio || new Context();
                if (audio.state === "suspended") {
                    audio.resume();
                }
            } catch (error) {
                audio = null;
            }
        }

        horn.addEventListener("pointerdown", warm);

        horn.addEventListener("animationend", (event) => {
            if (event.animationName === "jazz-kick") {
                horn.classList.remove("is-blowing");
            }
        });

        function noteSvg() {
            return '<svg viewBox="0 0 24 32" aria-hidden="true" focusable="false"><ellipse cx="8" cy="25" rx="6.5" ry="5" transform="rotate(-20 8 25)" fill="currentColor"/><rect x="13" y="3" width="2.4" height="22" fill="currentColor"/><path d="M15.4 3 C21 6 23 10 20 16 C21 11 19 8 15.4 8 Z" fill="currentColor"/></svg>';
        }

        function tone(freq) {
            if (!soundOn) {
                return;
            }
            const Context = window.AudioContext || window.webkitAudioContext;
            if (!Context) {
                return;
            }
            try {
                audio = audio || new Context();
                if (audio.state === "suspended") {
                    audio.resume();
                }
                const now = audio.currentTime;
                const gain = audio.createGain();
                const filter = audio.createBiquadFilter();
                filter.type = "lowpass";
                filter.frequency.setValueAtTime(900, now);
                filter.frequency.linearRampToValueAtTime(2600, now + 0.08);
                filter.frequency.linearRampToValueAtTime(1500, now + 0.5);
                gain.gain.setValueAtTime(0.0001, now);
                gain.gain.exponentialRampToValueAtTime(0.16, now + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.09, now + 0.25);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
                const lfo = audio.createOscillator();
                const depth = audio.createGain();
                lfo.frequency.value = 5.5;
                depth.gain.value = freq * 0.006;
                lfo.connect(depth);
                [["sawtooth", 1], ["square", 0.5]].forEach(([type, mix]) => {
                    const osc = audio.createOscillator();
                    const level = audio.createGain();
                    osc.type = type;
                    osc.frequency.setValueAtTime(freq * 0.97, now);
                    osc.frequency.linearRampToValueAtTime(freq, now + 0.06);
                    depth.connect(osc.frequency);
                    level.gain.value = mix;
                    osc.connect(level).connect(filter);
                    osc.start(now);
                    osc.stop(now + 0.8);
                });
                lfo.start(now);
                lfo.stop(now + 0.8);
                filter.connect(gain).connect(audio.destination);
            } catch (error) {
            }
        }

        function press(list) {
            list.forEach((number) => {
                const valve = valves[number - 1];
                if (!valve) {
                    return;
                }
                valve.classList.remove("is-press");
                void valve.getBoundingClientRect();
                valve.classList.add("is-press");
            });
        }

        function blast(glow) {
            stage.style.setProperty("--glow", glow);
            stage.classList.remove("is-hit");
            void stage.offsetWidth;
            stage.classList.add("is-hit");
            horn.classList.remove("is-blowing");
            void horn.offsetWidth;
            horn.classList.add("is-blowing");
            if (reduceMotion) {
                return;
            }
            if (rings && rings.animate !== undefined) {
                [0, 130, 260].forEach((delay) => {
                    const ring = document.createElementNS(SVG_NS, "ellipse");
                    ring.setAttribute("cx", "318");
                    ring.setAttribute("cy", "60");
                    ring.setAttribute("rx", "8.5");
                    ring.setAttribute("ry", "44");
                    ring.setAttribute("stroke", "rgb(" + glow + ")");
                    rings.appendChild(ring);
                    const wave = ring.animate([
                        { transform: "translateX(0) scale(1)", opacity: 0.9 },
                        { transform: "translateX(34px) scale(2.4, 1.35)", opacity: 0 }
                    ], { duration: 900, delay, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "backwards" });
                    wave.onfinish = () => ring.remove();
                });
            }
            if (!wrap.animate) {
                return;
            }
            const box = wrap.getBoundingClientRect();
            const bell = $(".jazz_bell", horn).getBoundingClientRect();
            const originX = bell.right - box.left - 6;
            const originY = bell.top + bell.height / 2 - box.top;
            for (let i = 0; i < 6; i += 1) {
                const spark = document.createElement("span");
                spark.className = "jazz_spark";
                spark.style.setProperty("--glow", glow);
                wrap.appendChild(spark);
                const angle = (Math.random() - 0.5) * 1.6;
                const distance = 50 + Math.random() * 70;
                const endX = originX + Math.cos(angle) * distance;
                const endY = originY + Math.sin(angle) * distance;
                const flight = spark.animate([
                    { transform: "translate(" + originX + "px, " + originY + "px) scale(1)", opacity: 1 },
                    { transform: "translate(" + endX + "px, " + endY + "px) scale(0.2)", opacity: 0 }
                ], { duration: 650 + Math.random() * 300, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" });
                flight.onfinish = () => spark.remove();
            }
        }

        function show(index) {
            const note = JAZZ_NOTES[index];
            num.textContent = String(index + 1).padStart(2, "0");
            title.textContent = note.title;
            text.textContent = note.text;
            fact.classList.remove("is-new");
            void fact.offsetWidth;
            fact.classList.add("is-new");
            $$(".jazz_note", staff).forEach((button) => button.classList.toggle("is-current", Number(button.dataset.index) === index));
        }

        function land(index) {
            const slot = slots[index];
            const button = document.createElement("button");
            button.type = "button";
            button.className = "jazz_note";
            button.dataset.index = String(index);
            button.innerHTML = noteSvg() + '<span class="jazz_note-label"></span>';
            $(".jazz_note-label", button).textContent = JAZZ_NOTES[index].title;
            button.setAttribute("aria-label", "Fact " + (index + 1) + ": " + JAZZ_NOTES[index].title + ". Play it again");
            button.addEventListener("click", () => {
                const note = JAZZ_NOTES[index];
                tone(note.freq);
                press(note.valves);
                blast(note.glow);
                show(index);
            });
            slot.appendChild(button);
            slot.classList.add("is-filled");
            $$(".jazz_note", staff).forEach((item) => item.classList.toggle("is-current", item === button));
        }

        function fly(index) {
            if (reduceMotion || !wrap.animate) {
                land(index);
                return;
            }
            const box = wrap.getBoundingClientRect();
            const bell = $(".jazz_bell", horn).getBoundingClientRect();
            const target = slots[index].getBoundingClientRect();
            const note = document.createElement("span");
            note.className = "jazz_flyer";
            note.style.color = "rgb(" + JAZZ_NOTES[index].glow + ")";
            note.innerHTML = noteSvg();
            wrap.appendChild(note);
            const startX = bell.right - box.left - 12;
            const startY = bell.top + bell.height / 2 - box.top - 16;
            const endX = target.left + target.width / 2 - box.left - 12;
            const endY = target.top + target.height / 2 - box.top - 16;
            const midX = (startX + endX) / 2 + 40;
            const midY = Math.min(startY, endY) - 70;
            const flight = note.animate([
                { transform: "translate(" + startX + "px, " + startY + "px) scale(0.4) rotate(-20deg)", opacity: 0 },
                { transform: "translate(" + midX + "px, " + midY + "px) scale(1.5) rotate(18deg)", opacity: 1, offset: 0.45 },
                { transform: "translate(" + endX + "px, " + endY + "px) scale(1) rotate(0deg)", opacity: 1 }
            ], { duration: 800, easing: "cubic-bezier(0.3, 0.7, 0.4, 1)" });
            flight.onfinish = () => {
                note.remove();
                land(index);
            };
        }

        function finish() {
            wrap.classList.add("is-encore");
            count.textContent = "Discover Jazz Festival \u00b7 Encore! All 6 notes";
            riff.hidden = false;
            const rect = wrap.getBoundingClientRect();
            launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 3, 70);
            [523.25, 622.25, 783.99, 1046.5].forEach((freq, step) => window.setTimeout(() => tone(freq), step * 140));
        }

        horn.addEventListener("click", () => {
            if (played >= JAZZ_NOTES.length) {
                const index = Math.floor(Math.random() * JAZZ_NOTES.length);
                const note = JAZZ_NOTES[index];
                tone(note.freq);
                press(note.valves);
                blast(note.glow);
                show(index);
                return;
            }
            const index = played;
            const note = JAZZ_NOTES[index];
            played += 1;
            tone(note.freq);
            press(note.valves);
            blast(note.glow);
            meter.forEach((bar, position) => bar.classList.toggle("is-on", position < played));
            count.textContent = "Discover Jazz Festival \u00b7 " + played + " of " + JAZZ_NOTES.length + " notes";
            show(index);
            fly(index);
            if (played === JAZZ_NOTES.length) {
                window.setTimeout(finish, reduceMotion ? 0 : 850);
            }
        });

        riff.addEventListener("click", () => {
            if (busy) {
                return;
            }
            busy = true;
            riff.disabled = true;
            let at = 0;
            JAZZ_RIFF.forEach((step, position) => {
                at += step.wait;
                window.setTimeout(() => {
                    tone(step.freq);
                    press(step.valves);
                    blast(JAZZ_NOTES[position % JAZZ_NOTES.length].glow);
                    if (position === JAZZ_RIFF.length - 1) {
                        const rect = stage.getBoundingClientRect();
                        launchConfetti(rect.left + rect.width * 0.8, rect.top + rect.height * 0.3, 90);
                        busy = false;
                        riff.disabled = false;
                    }
                }, at);
            });
        });

        if (stage && finePointer && !reduceMotion) {
            stage.addEventListener("pointermove", (event) => {
                const rect = stage.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width - 0.5;
                const y = (event.clientY - rect.top) / rect.height - 0.5;
                horn.style.setProperty("--ry", (-22 + x * 30).toFixed(1) + "deg");
                horn.style.setProperty("--rx", (10 - y * 18).toFixed(1) + "deg");
            });
            stage.addEventListener("pointerleave", () => {
                horn.style.removeProperty("--ry");
                horn.style.removeProperty("--rx");
            });
        }

        sound.addEventListener("click", () => {
            soundOn = !soundOn;
            sound.setAttribute("aria-pressed", String(soundOn));
            sound.textContent = soundOn ? "Sound on" : "Sound off";
        });
    }

    function initCountdown() {
        const parts = { days: $("#btvDays"), hours: $("#btvHours"), mins: $("#btvMins"), secs: $("#btvSecs") };
        if (!parts.days) {
            return;
        }
        const pad = (value) => String(value).padStart(2, "0");
        function tick() {
            const now = new Date();
            const left = Math.max(0, nextShipDate(now) - now);
            parts.days.textContent = pad(Math.floor(left / 86400000));
            parts.hours.textContent = pad(Math.floor(left / 3600000) % 24);
            parts.mins.textContent = pad(Math.floor(left / 60000) % 60);
            parts.secs.textContent = pad(Math.floor(left / 1000) % 60);
        }
        tick();
        window.setInterval(tick, 1000);
    }

    function initBoxSwitch() {
        const list = $("#btvItems");
        const text = $("#btvBuyText");
        const buttons = $$("[data-tier-show]");
        if (!list || !buttons.length) {
            return;
        }
        const lines = {
            basic: "Basic gets you the five items in every box, plus a passport stamp and a maker stories card.",
            premium: "Premium gets you all eight, plus a digital city guide and playlist."
        };
        buttons.forEach((button) => {
            button.addEventListener("click", () => {
                const tier = button.dataset.tierShow;
                buttons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
                list.classList.toggle("is-basic", tier === "basic");
                if (text) {
                    text.textContent = lines[tier];
                }
            });
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        initReveal();
        initBoxSwitch();
        initCountdown();
    });
})();
