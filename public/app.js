(function () {
  function formData(form) {
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = typeof v === "string" ? v.trim() : v; });
    return data;
  }

  function statusEl(form) {
    var el = form.querySelector(".form-status");
    if (!el) {
      el = document.createElement("p");
      el.className = "form-status";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      form.appendChild(el);
    }
    return el;
  }

  function setBusy(form, busy, label) {
    var btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (busy) { btn.dataset.label = btn.textContent; btn.textContent = label || "Sending…"; btn.disabled = true; }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
  }

  function post(url, body) {
    return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, data: j }; }); });
  }

  var THANKS = {
    waitlist: "You're on the list. We'll message you the day Hookline opens, with your free first month.",
    newsletter: "You're in. The Daily Catch lands in your inbox on weekday mornings.",
    booking: "Thank you. Janani will get back to you within two working days.",
    corporate: "Thank you. You'll hear back within two working days with a suggested format and a quote."
  };

  document.querySelectorAll("form[data-lead]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var type = form.getAttribute("data-lead");
      var st = statusEl(form);
      st.textContent = ""; st.className = "form-status";
      var body = formData(form); body.type = type;
      if (form.elements.phone && form.elements.email && !body.phone && !body.email) {
        st.textContent = "Please add your WhatsApp number or email, either one is fine."; st.className = "form-status err"; return;
      }
      setBusy(form, true);
      post("/api/lead", body).then(function (res) {
        setBusy(form, false);
        if (res.ok) {
          st.textContent = THANKS[type] || "Thank you!";
          st.className = "form-status ok";
          form.querySelectorAll("input, textarea").forEach(function (i) { if (i.name !== "website") i.value = ""; });
        } else {
          st.textContent = (res.data && res.data.error) || "Something went wrong. Please try again.";
          st.className = "form-status err";
        }
      }).catch(function () {
        setBusy(form, false);
        st.textContent = "Couldn't connect. Please check your internet and try again.";
        st.className = "form-status err";
      });
    });
  });

  // ---------- free plan generator ----------
  var planForm = document.getElementById("plan-form");
  if (!planForm) return;

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  var PILLAR_BG = ["#FDE3D4", "#FCEFC7", "#D3EAEE", "#DCE4FB", "#E3F5EC"];
  var STAGE_COLOR = { Reach: "#C2410C", Trust: "#8A5A00", Ask: "#1F4148" };

  function render(plan) {
    document.getElementById("plan-badge").textContent = plan.name ? "Made for " + plan.name + " just now" : "Made for you just now";
    var diag = document.getElementById("plan-diagnosis");
    diag.textContent = "";
    (plan.diagnosis || []).forEach(function (d) { diag.appendChild(el("span", null, (d.good ? "✓ " : "✗ ") + d.text)); });
    document.getElementById("plan-before").textContent = plan.headline_before || "[Your current headline]";
    document.getElementById("plan-after").textContent = plan.headline_after;
    var pil = document.getElementById("plan-pillars");
    pil.textContent = "";
    (plan.pillars || []).forEach(function (p, i) {
      var box = el("div", { style: "background: " + PILLAR_BG[i % PILLAR_BG.length] + "; border-radius: 16px; padding: 16px" });
      box.appendChild(el("p", { style: "margin: 0; font-weight: 700" }, p.name));
      box.appendChild(el("p", { style: "margin: 4px 0 0; font-size: 14px; color: #4A423A" }, p.why));
      pil.appendChild(box);
    });
    var hooks = document.getElementById("plan-hooks");
    hooks.textContent = "";
    (plan.hooks || []).forEach(function (h) {
      var row = el("div", { style: "display: flex; flex-wrap: wrap; gap: 12px; background: #FBF6F1; border-radius: 12px; padding: 12px 14px" });
      row.appendChild(el("span", { style: "font-weight: 700; width: 70px" }, h.day));
      row.appendChild(el("span", { style: "width: 60px; font-weight: 700; color: " + (STAGE_COLOR[h.stage] || "#1A1714") }, h.stage));
      row.appendChild(el("span", { style: "flex: 1 1 300px" }, h.hook));
      hooks.appendChild(row);
    });
    var post = document.getElementById("plan-post");
    post.textContent = plan.sample_post;
    var note = post.nextElementSibling;
    if (note && plan.confirm) note.textContent = plan.confirm + " We never invent numbers about your business.";
    document.getElementById("plan-result").scrollIntoView({ behavior: "smooth", block: "start" });
  }


  // ---------- voice input for "what do you want from LinkedIn" ----------
  (function () {
    var btn = document.getElementById("mic-btn");
    var box = document.getElementById("plan-expectations");
    var hint = document.getElementById("mic-hint");
    if (!btn || !box) return;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { btn.style.display = "none"; if (hint) hint.textContent = "Tip: on your phone, tap the keyboard's mic to talk instead of typing."; return; }
    var rec = null, on = false, base = "";
    function stop() { on = false; btn.setAttribute("aria-pressed", "false"); btn.style.background = "#F2733A"; if (hint) hint.textContent = "Tap the mic and talk it out. Tap again to stop."; }
    btn.addEventListener("click", function () {
      if (on && rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = "en-IN"; rec.interimResults = true; rec.continuous = true;
      base = box.value ? box.value.replace(/\s*$/, " ") : "";
      rec.onresult = function (e) {
        var finalText = "", interim = "";
        for (var i = 0; i < e.results.length; i++) { var r = e.results[i]; if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript; }
        box.value = (base + finalText + interim).slice(0, 1500);
      };
      rec.onerror = function (e) { stop(); if (hint) hint.textContent = e.error === "not-allowed" ? "Allow microphone access in your browser to talk, or just type." : "Couldn't hear that. Try again or type it."; };
      rec.onend = stop;
      try { rec.start(); on = true; btn.setAttribute("aria-pressed", "true"); btn.style.background = "#B42318"; if (hint) hint.textContent = "Listening… tap the mic again when you're done."; } catch (err) { stop(); }
    });
  })();
  planForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var mic = document.getElementById("mic-btn");
    if (mic && mic.getAttribute("aria-pressed") === "true") mic.click();
    var st = statusEl(planForm);
    var fd = formData(planForm);
    if (!fd.phone && !fd.email) { st.textContent = "Please add your WhatsApp number or email, either one is fine."; st.className = "form-status err"; return; }
    var steps = ["Reading your LinkedIn profile…", "Reading what you sell…", "Working out what your buyers need to believe…", "Writing your hooks…", "Drafting a sample post…", "Almost there…"];
    var k = 0; st.textContent = "Reeling in your plan. This takes under a minute…";
    var timer = setInterval(function () { if (k < steps.length) st.textContent = steps[k++]; }, 7000);
    st.className = "form-status";
    setBusy(planForm, true, "Building your plan…");
    post("/api/plan", fd).then(function (res) {
      clearInterval(timer);
      setBusy(planForm, false);
      if (res.ok && res.data.plan) {
        render(res.data.plan);
        st.textContent = "Your plan is ready below.";
        st.className = "form-status ok";
      } else {
        st.textContent = (res.data && res.data.error) || "We couldn't build your plan just now. Please try again.";
        st.className = "form-status err";
      }
    }).catch(function () {
      clearInterval(timer);
      setBusy(planForm, false);
      st.textContent = "Couldn't connect. Please check your internet and try again.";
      st.className = "form-status err";
    });
  });
})();
