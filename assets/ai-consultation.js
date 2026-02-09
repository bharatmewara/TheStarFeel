/* AI Consultation modal logic */
(function () {
  var modal = document.getElementById("ai-consultation-modal");
  if (!modal) return;

  var steps = Array.prototype.slice.call(modal.querySelectorAll(".ai-step"));
  var currentStep = 0;
  var nextBtn = modal.querySelector("[data-ai-next]");
  var prevBtn = modal.querySelector("[data-ai-prev]");
  var submitBtn = modal.querySelector("[data-ai-submit]");
  var statusEl = modal.querySelector("[data-ai-status]");
  var resultsEl = modal.querySelector("[data-ai-results]");
  var stepCountEl = modal.querySelector("[data-ai-step-count]");
  var artworkGrid = modal.querySelector("[data-ai-artwork-grid]");
  var guidanceText = modal.querySelector("[data-ai-guidance-text]");
  var wallEl = modal.querySelector("[data-ai-wall]");
  var heightEl = modal.querySelector("[data-ai-height]");
  var lightingEl = modal.querySelector("[data-ai-lighting]");
  var addToCartBtn = modal.querySelector("[data-ai-add-to-cart]");
  var sizeSelect = modal.querySelector("#ai-size");
  var frameSelect = modal.querySelector("#ai-frame");

  var state = {
    answers: {},
    response: null,
    selectedArtwork: null
  };

  function openModal() {
    modal.classList.add("ai-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("ai-consultation-open");
  }

  function closeModal() {
    modal.classList.remove("ai-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ai-consultation-open");
  }

  function updateStep() {
    steps.forEach(function (step, index) {
      if (index === currentStep) {
        step.classList.add("ai-step-active");
      } else {
        step.classList.remove("ai-step-active");
      }
    });

    if (stepCountEl) {
      stepCountEl.textContent = "Step " + (currentStep + 1) + " of " + steps.length;
    }

    prevBtn.disabled = currentStep === 0;
    nextBtn.classList.toggle("ai-hidden", currentStep === steps.length - 1);
    submitBtn.classList.toggle("ai-hidden", currentStep !== steps.length - 1);
  }

  function getAnswer(name) {
    var field = modal.querySelector('input[name="' + name + '"]:checked');
    if (field) return field.value;
    var textField = modal.querySelector('input[name="' + name + '"]');
    if (textField && textField.type === "text") return textField.value.trim();
    return "";
  }

  function validateStep(stepIndex) {
    var step = steps[stepIndex];
    if (!step) return true;
    var required = step.querySelectorAll("input[required]");
    for (var i = 0; i < required.length; i += 1) {
      var input = required[i];
      if (input.type === "radio") {
        var name = input.name;
        if (!step.querySelector('input[name="' + name + '"]:checked')) {
          alert("Please choose an option to continue.");
          return false;
        }
      }
    }
    return true;
  }

  function collectAnswers() {
    state.answers = {
      purpose: getAnswer("q1"),
      audience: getAnswer("q2"),
      spaceType: getAnswer("q3"),
      wallSize: getAnswer("q4"),
      wallDirection: getAnswer("q5"),
      currentFeeling: getAnswer("q6"),
      desiredFeeling: getAnswer("q7"),
      style: getAnswer("q8"),
      colorTone: getAnswer("q9"),
      colorPreference: getAnswer("q10"),
      symbolism: getAnswer("q11")
    };
  }

  function mockResponse() {
    return {
      id: "demo-" + Date.now(),
      guidance: {
        text:
          "This artwork is designed to support your intention with calming balance and contemporary flow. " +
          "The palette and movement encourage a grounded, open feeling while staying refined and minimal.",
        placement: {
          wall: "A central wall in your " + (state.answers.spaceType || "space"),
          height: "Center at eye level (about 57–60 in / 145–152 cm)",
          lighting: "Soft ambient or indirect light for a gentle glow"
        }
      },
      artworks: [
        {
          id: "primary",
          url: createPlaceholder("Warm balance"),
          title: "Primary artwork"
        },
        {
          id: "alt-1",
          url: createPlaceholder("Soft flow"),
          title: "Alternate 1"
        },
        {
          id: "alt-2",
          url: createPlaceholder("Quiet focus"),
          title: "Alternate 2"
        }
      ]
    };
  }

  function createPlaceholder(label) {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop stop-color="#e6dccf" offset="0"/>' +
      '<stop stop-color="#c3d2e3" offset="1"/>' +
      "</linearGradient></defs>" +
      '<rect width="600" height="450" fill="url(#g)"/>' +
      '<circle cx="160" cy="140" r="90" fill="#f7efe4" opacity="0.7"/>' +
      '<path d="M80 320 C200 260, 360 360, 520 300" stroke="#8fa1b3" stroke-width="12" fill="none" opacity="0.7"/>' +
      '<text x="30" y="420" font-size="28" fill="#534c46" font-family="Arial">' +
      label +
      "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function renderResults(response) {
    guidanceText.textContent = response.guidance.text;
    wallEl.textContent = response.guidance.placement.wall;
    heightEl.textContent = response.guidance.placement.height;
    lightingEl.textContent = response.guidance.placement.lighting;

    artworkGrid.innerHTML = "";
    response.artworks.forEach(function (artwork, index) {
      var card = document.createElement("div");
      card.className = "ai-artwork-card" + (index === 0 ? " ai-selected" : "");
      card.setAttribute("data-artwork-id", artwork.id);
      card.setAttribute("data-artwork-url", artwork.url);

      var img = document.createElement("img");
      img.src = artwork.url;
      img.alt = artwork.title || "Artwork option";

      var caption = document.createElement("p");
      caption.textContent = artwork.title || "Artwork option";

      card.appendChild(img);
      card.appendChild(caption);

      card.addEventListener("click", function () {
        var cards = artworkGrid.querySelectorAll(".ai-artwork-card");
        Array.prototype.forEach.call(cards, function (c) {
          c.classList.remove("ai-selected");
        });
        card.classList.add("ai-selected");
        state.selectedArtwork = {
          id: artwork.id,
          url: artwork.url,
          title: artwork.title || ""
        };
      });

      artworkGrid.appendChild(card);
    });

    state.selectedArtwork = {
      id: response.artworks[0].id,
      url: response.artworks[0].url,
      title: response.artworks[0].title || ""
    };
  }

  function getEndpoint() {
    return modal.getAttribute("data-ai-endpoint") || "";
  }

  function sendConsultation() {
    collectAnswers();
    statusEl.classList.remove("ai-hidden");
    resultsEl.classList.add("ai-hidden");

    var endpoint = getEndpoint();
    var payload = {
      answers: state.answers,
      meta: {
        productHandle: modal.getAttribute("data-ai-product-handle") || "",
        source: "theme"
      }
    };

    if (!endpoint) {
      setTimeout(function () {
        state.response = mockResponse();
        statusEl.classList.add("ai-hidden");
        resultsEl.classList.remove("ai-hidden");
        renderResults(state.response);
      }, 800);
      return;
    }

    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then(function (data) {
        state.response = data;
        statusEl.classList.add("ai-hidden");
        resultsEl.classList.remove("ai-hidden");
        renderResults(data);
      })
      .catch(function () {
        state.response = mockResponse();
        statusEl.classList.add("ai-hidden");
        resultsEl.classList.remove("ai-hidden");
        renderResults(state.response);
      });
  }

  function saveCartAttributes() {
    var attributes = {
      "AI Consultation ID": state.response ? state.response.id : "",
      "AI Artwork": state.selectedArtwork ? state.selectedArtwork.title : "",
      "AI Artwork URL": state.selectedArtwork ? state.selectedArtwork.url : "",
      "AI Purpose": state.answers.purpose,
      "AI Space Type": state.answers.spaceType,
      "AI Wall Size": state.answers.wallSize,
      "AI Desired Feeling": state.answers.desiredFeeling
    };

    return fetch("/cart/update.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ attributes: attributes })
    });
  }

  function addToCart() {
    if (!state.response) return;
    var variantId = modal.getAttribute("data-ai-variant-id");
    if (!variantId) {
      window.location.href = "/cart";
      return;
    }

    var properties = {
      "AI Consultation ID": state.response.id,
      "AI Artwork": state.selectedArtwork ? state.selectedArtwork.title : "",
      "AI Artwork URL": state.selectedArtwork ? state.selectedArtwork.url : "",
      "AI Purpose": state.answers.purpose,
      "AI Space Type": state.answers.spaceType,
      "AI Wall Size": state.answers.wallSize,
      "AI Desired Feeling": state.answers.desiredFeeling,
      "Canvas Size": sizeSelect.value,
      "Frame Type": frameSelect.value
    };

    saveCartAttributes()
      .catch(function () {})
      .finally(function () {
        fetch("/cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: parseInt(variantId, 10),
            quantity: 1,
            properties: properties
          })
        })
          .then(function () {
            window.location.href = "/checkout";
          })
          .catch(function () {
            window.location.href = "/cart";
          });
      });
  }

  document.querySelectorAll("[data-ai-consultation-open]").forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      openModal();
    });
  });

  modal.querySelectorAll("[data-ai-consultation-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      closeModal();
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.classList.contains("ai-open")) {
      closeModal();
    }
  });

  nextBtn.addEventListener("click", function () {
    if (!validateStep(currentStep)) return;
    currentStep = Math.min(currentStep + 1, steps.length - 1);
    updateStep();
  });

  prevBtn.addEventListener("click", function () {
    currentStep = Math.max(currentStep - 1, 0);
    updateStep();
  });

  submitBtn.addEventListener("click", function () {
    if (!validateStep(currentStep)) return;
    sendConsultation();
  });

  addToCartBtn.addEventListener("click", function () {
    addToCart();
  });

  updateStep();
})();
